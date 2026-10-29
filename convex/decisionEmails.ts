import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { decisionValidator } from './schema'

/** What convex/emails.ts needs to send one decision email, read inside a transaction. */
export const load = internalQuery({
  args: { emailId: v.id('decisionEmails') },
  returns: v.union(
    v.null(),
    v.object({
      state: v.union(v.literal('queued'), v.literal('sent'), v.literal('skipped'), v.literal('failed')),
      decision: decisionValidator,
      name: v.string(),
      email: v.string(),
      /** the team's current status, so a decision changed before sending doesn't go out */
      current: v.string(),
    }),
  ),
  handler: async (ctx, { emailId }) => {
    const row = await ctx.db.get(emailId)
    const member = row && (await ctx.db.get(row.memberId))
    const application = row && (await ctx.db.get(row.applicationId))
    if (!row || !member || !application) return null
    return {
      state: row.state,
      decision: row.decision,
      name: member.name,
      email: member.email,
      current: application.status ?? 'pending',
    }
  },
})

export const mark = internalMutation({
  args: {
    emailId: v.id('decisionEmails'),
    state: v.union(v.literal('sent'), v.literal('skipped'), v.literal('failed')),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { emailId, state, error }) => {
    await ctx.db.patch(emailId, { state, ...(error ? { error: error.slice(0, 500) } : {}) })
    return null
  },
})
