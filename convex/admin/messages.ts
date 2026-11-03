import { ConvexError, v } from 'convex/values'
import { internal } from '../_generated/api'
import { mutation, query, type QueryCtx } from '../_generated/server'
import { audienceValidator, emailStateValidator } from '../schema'
import type { Infer } from 'convex/values'
import { adminArgs, requireAdmin } from './auth'
import { statusOf } from './status'

/** one message's limit, far above the event and within what one transaction can write */
const MAX_RECIPIENTS = 2000

type Audience = Infer<typeof audienceValidator>

/** the people an audience means right now */
async function resolve(ctx: QueryCtx, audience: Audience) {
  if (audience.kind === 'member') {
    const member = await ctx.db.get(audience.memberId)
    return member ? [member] : []
  }
  if (audience.kind === 'team') {
    return ctx.db
      .query('members')
      .withIndex('by_application', (q) => q.eq('applicationId', audience.applicationId))
      .take(4)
  }
  const applications = await ctx.db.query('applications').withIndex('by_submittedAt').take(MAX_RECIPIENTS)
  const matching = applications.filter(
    (application) =>
      (!audience.status || statusOf(application) === audience.status) && (!audience.ref || application.ref === audience.ref),
  )
  const members = await Promise.all(
    matching.map((application) =>
      ctx.db
        .query('members')
        .withIndex('by_application', (q) => q.eq('applicationId', application._id))
        .take(4),
    ),
  )
  return members.flat()
}

/** How many people an audience reaches, for the confirmation step, with a few names to check against. */
export const audience = query({
  args: { ...adminArgs, audience: audienceValidator },
  returns: v.object({ count: v.number(), sample: v.array(v.string()) }),
  handler: async (ctx, { audience, ...args }) => {
    requireAdmin(args)
    const people = await resolve(ctx, audience)
    return { count: people.length, sample: people.slice(0, 5).map((person) => person.name) }
  },
})

/**
 * Sends a custom email to an audience. `expected` is the count the organizer confirmed: if the audience
 * grew or shrank since, nothing is sent, so nobody emails more people than they agreed to.
 */
export const send = mutation({
  args: { ...adminArgs, audience: audienceValidator, subject: v.string(), body: v.string(), expected: v.number() },
  returns: v.object({ recipients: v.number() }),
  handler: async (ctx, { audience, subject, body, expected, ...args }) => {
    const actor = requireAdmin(args)
    const title = subject.trim()
    const text = body.trim()
    if (!title || title.length > 200) throw new ConvexError('The subject needs 1 to 200 characters')
    if (!text || text.length > 5000) throw new ConvexError('The message needs 1 to 5000 characters')
    const people = await resolve(ctx, audience)
    if (!people.length) throw new ConvexError('Nobody matches this audience')
    if (people.length > MAX_RECIPIENTS) throw new ConvexError(`One message reaches at most ${MAX_RECIPIENTS} people`)
    if (people.length !== expected) throw new ConvexError('The audience changed. Check it and confirm again')
    const messageId = await ctx.db.insert('messages', { actor, subject: title, body: text, audience, recipients: people.length })
    for (const person of people) {
      await ctx.db.insert('messageRecipients', {
        messageId,
        applicationId: person.applicationId,
        memberId: person._id,
        state: 'queued',
      })
    }
    await ctx.db.insert('auditLog', {
      actor,
      action: 'message',
      subject: title,
      recipients: people.length,
      ...(audience.kind === 'team' ? { applicationId: audience.applicationId } : {}),
      ...(audience.kind === 'member' ? { applicationId: people[0].applicationId } : {}),
    })
    await ctx.scheduler.runAfter(0, internal.emails.sendMessages, { messageId })
    return { recipients: people.length }
  },
})

/** The latest custom emails, newest first, with how each is getting on. */
export const list = query({
  args: adminArgs,
  returns: v.array(
    v.object({
      _id: v.id('messages'),
      _creationTime: v.number(),
      actor: v.string(),
      subject: v.string(),
      recipients: v.number(),
      states: v.array(v.object({ state: emailStateValidator, count: v.number() })),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(args)
    const messages = await ctx.db.query('messages').order('desc').take(30)
    return Promise.all(
      messages.map(async ({ _id, _creationTime, actor, subject, recipients }) => {
        const rows = await ctx.db.query('messageRecipients').withIndex('by_message', (q) => q.eq('messageId', _id)).take(MAX_RECIPIENTS)
        const states = (['sent', 'queued', 'skipped', 'failed'] as const)
          .map((state) => ({ state, count: rows.filter((row) => row.state === state).length }))
          .filter((row) => row.count > 0)
        return { _id, _creationTime, actor, subject, recipients, states }
      }),
    )
  },
})
