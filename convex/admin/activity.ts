import { v } from 'convex/values'
import { query } from '../_generated/server'
import { auditFields } from '../schema'
import { adminArgs, requireAdmin } from './auth'

/** The latest things organizers did, newest first, with the names of the team each one was about. */
export const recent = query({
  args: { ...adminArgs, limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('auditLog'),
      _creationTime: v.number(),
      ...auditFields,
      applicationId: v.optional(v.id('applications')),
      team: v.array(v.string()),
    }),
  ),
  handler: async (ctx, { limit, ...args }) => {
    requireAdmin(args)
    const entries = await ctx.db
      .query('auditLog')
      .order('desc')
      .take(Math.min(Math.max(1, Math.floor(limit ?? 20)), 50))
    return Promise.all(
      entries.map(async (entry) => {
        const members = entry.applicationId
          ? await ctx.db
              .query('members')
              .withIndex('by_application', (q) => q.eq('applicationId', entry.applicationId!))
              .take(8)
          : []
        return { ...entry, team: members.map((member) => member.name) }
      }),
    )
  },
})
