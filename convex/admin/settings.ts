import { ConvexError, v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { adminArgs, requireAdmin } from './auth'

/** The event's settings, and whether this deployment really sends decision emails. */
export const get = query({
  args: adminArgs,
  returns: v.object({
    capacity: v.union(v.number(), v.null()),
    /** 'send' only where DECISION_EMAILS=send; anywhere else decision emails are recorded, not sent */
    decisionEmails: v.union(v.literal('send'), v.literal('off')),
    /** the same for custom emails, MESSAGE_EMAILS=send */
    messageEmails: v.union(v.literal('send'), v.literal('off')),
    /** where applicants' replies go */
    replyTo: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args)
    const settings = await ctx.db.query('settings').first()
    return {
      capacity: settings?.capacity ?? null,
      decisionEmails: process.env.DECISION_EMAILS === 'send' ? ('send' as const) : ('off' as const),
      messageEmails: process.env.MESSAGE_EMAILS === 'send' ? ('send' as const) : ('off' as const),
      replyTo: process.env.EMAIL_REPLY_TO ?? null,
    }
  },
})

/** How many people (not teams) the event has room for. */
export const setCapacity = mutation({
  args: { ...adminArgs, capacity: v.number() },
  returns: v.null(),
  handler: async (ctx, { capacity, ...args }) => {
    const actor = requireAdmin(args)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000)
      throw new ConvexError('Capacity must be a whole number from 1 to 10000')
    const settings = await ctx.db.query('settings').first()
    if (settings) await ctx.db.patch(settings._id, { capacity })
    else await ctx.db.insert('settings', { capacity })
    await ctx.db.insert('auditLog', { actor, action: 'capacity', capacity })
    return null
  },
})
