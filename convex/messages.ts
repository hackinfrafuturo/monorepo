import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'

/** The next person a message still has to reach, for convex/emails.ts. */
export const nextRecipient = internalQuery({
  args: { messageId: v.id('messages') },
  returns: v.union(
    v.null(),
    v.object({
      recipientId: v.id('messageRecipients'),
      memberId: v.id('members'),
      subject: v.string(),
      body: v.string(),
      name: v.string(),
      email: v.string(),
      actor: v.string(),
    }),
  ),
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId)
    const row = await ctx.db
      .query('messageRecipients')
      .withIndex('by_message', (q) => q.eq('messageId', messageId).eq('state', 'queued'))
      .first()
    const member = row && (await ctx.db.get(row.memberId))
    if (!message || !row || !member) return null
    return {
      recipientId: row._id,
      memberId: row.memberId,
      subject: message.subject,
      body: message.body,
      name: member.name,
      email: member.email,
      actor: message.actor,
    }
  },
})

export const mark = internalMutation({
  args: {
    recipientId: v.id('messageRecipients'),
    state: v.union(v.literal('sent'), v.literal('skipped'), v.literal('failed')),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { recipientId, state, error }) => {
    await ctx.db.patch(recipientId, { state, ...(error ? { error: error.slice(0, 500) } : {}) })
    return null
  },
})
