import { v } from 'convex/values'
import { query } from '../_generated/server'
import { memberValidator, statusValidator } from '../schema'
import { adminArgs, requireAdmin } from './auth'
import { statusOf } from './status'

/** more teams than a hackathon gets; past it the list says it's incomplete */
const LIMIT = 1500
/** the application form takes teams of 1 to 4 */
const TEAM_MAX = 4

/**
 * Every team, newest first, with just enough of each member to find them: the backoffice filters and
 * searches this list in the browser, which at a hackathon's size is instant and needs no search index.
 */
export const list = query({
  args: adminArgs,
  returns: v.object({
    applications: v.array(
      v.object({
        _id: v.id('applications'),
        submittedAt: v.number(),
        size: v.number(),
        ref: v.optional(v.string()),
        status: statusValidator,
        members: v.array(
          v.object({
            name: v.string(),
            email: v.string(),
            github: v.string(),
            coding: v.union(v.literal('yes'), v.literal('no')),
          }),
        ),
      }),
    ),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args)
    const rows = await ctx.db.query('applications').withIndex('by_submittedAt').order('desc').take(LIMIT + 1)
    const applications = await Promise.all(
      rows.slice(0, LIMIT).map(async (application) => {
        const members = await ctx.db
          .query('members')
          .withIndex('by_application', (q) => q.eq('applicationId', application._id))
          .take(TEAM_MAX)
        return {
          _id: application._id,
          submittedAt: application.submittedAt,
          size: application.size,
          ref: application.ref,
          status: statusOf(application),
          members: members.map(({ name, email, github, coding }) => ({ name, email, github, coding })),
        }
      }),
    )
    return { applications, truncated: rows.length > LIMIT }
  },
})

/** One team in full: every member's answers and contact details, and every change made to it. */
export const get = query({
  args: { ...adminArgs, applicationId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('applications'),
      submittedAt: v.number(),
      size: v.number(),
      ref: v.optional(v.string()),
      status: statusValidator,
      decidedAt: v.optional(v.number()),
      decidedBy: v.optional(v.string()),
      members: v.array(v.object({ _id: v.id('members'), ...memberValidator.fields })),
      history: v.array(
        v.object({
          _id: v.id('auditLog'),
          _creationTime: v.number(),
          actor: v.string(),
          action: v.literal('status'),
          from: v.optional(statusValidator),
          to: v.optional(statusValidator),
        }),
      ),
    }),
  ),
  handler: async (ctx, { applicationId, ...args }) => {
    requireAdmin(args)
    // a mistyped or stale link is "not found", not an error
    const id = ctx.db.normalizeId('applications', applicationId)
    const application = id && (await ctx.db.get(id))
    if (!application) return null
    const members = await ctx.db
      .query('members')
      .withIndex('by_application', (q) => q.eq('applicationId', application._id))
      .take(TEAM_MAX)
    const history = await ctx.db
      .query('auditLog')
      .withIndex('by_application', (q) => q.eq('applicationId', application._id))
      .order('desc')
      .take(100)
    return {
      _id: application._id,
      submittedAt: application.submittedAt,
      size: application.size,
      ref: application.ref,
      status: statusOf(application),
      decidedAt: application.decidedAt,
      decidedBy: application.decidedBy,
      members: members.map(({ _creationTime, applicationId: _, ...member }) => member),
      history: history.map(({ applicationId: _, ...entry }) => entry),
    }
  },
})
