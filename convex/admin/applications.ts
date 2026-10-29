import { v } from 'convex/values'
import { query } from '../_generated/server'
import { auditFields, decisionValidator, memberValidator, statusValidator } from '../schema'
import { adminArgs, requireAdmin } from './auth'
import { statusOf } from './status'

/** more teams than a hackathon gets; past it the list says it's incomplete (each team costs two index reads) */
const LIMIT = 1000
/** reviews read per team; far more organizers than will ever score one team */
const REVIEWS = 50
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
        /** the organizers' scores (1 to 4) */
        reviews: v.object({ count: v.number(), average: v.union(v.number(), v.null()) }),
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
        const reviews = await ctx.db
          .query('reviews')
          .withIndex('by_application', (q) => q.eq('applicationId', application._id))
          .take(REVIEWS)
        return {
          _id: application._id,
          submittedAt: application.submittedAt,
          size: application.size,
          ref: application.ref,
          status: statusOf(application),
          reviews: {
            count: reviews.length,
            average: reviews.length ? reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length : null,
          },
          members: members.map(({ name, email, github, coding }) => ({ name, email, github, coding })),
        }
      }),
    )
    return { applications, truncated: rows.length > LIMIT }
  },
})

/** One team in full: every member's answers and contact details, the organizers' reviews, every
 * decision email, and every change made to it. */
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
      reviews: v.array(
        v.object({ _id: v.id('reviews'), _creationTime: v.number(), reviewer: v.string(), score: v.number(), note: v.optional(v.string()) }),
      ),
      emails: v.array(
        v.object({
          _id: v.id('decisionEmails'),
          _creationTime: v.number(),
          memberId: v.id('members'),
          decision: decisionValidator,
          state: v.union(v.literal('queued'), v.literal('sent'), v.literal('skipped'), v.literal('failed')),
          error: v.optional(v.string()),
        }),
      ),
      history: v.array(v.object({ _id: v.id('auditLog'), _creationTime: v.number(), ...auditFields })),
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
    const reviews = await ctx.db
      .query('reviews')
      .withIndex('by_application', (q) => q.eq('applicationId', application._id))
      .take(REVIEWS)
    const emails = await ctx.db
      .query('decisionEmails')
      .withIndex('by_application', (q) => q.eq('applicationId', application._id))
      .order('desc')
      .take(50)
    return {
      _id: application._id,
      submittedAt: application.submittedAt,
      size: application.size,
      ref: application.ref,
      status: statusOf(application),
      decidedAt: application.decidedAt,
      decidedBy: application.decidedBy,
      members: members.map((m) => ({
        _id: m._id,
        name: m.name,
        gender: m.gender,
        github: m.github,
        email: m.email,
        coding: m.coding,
        linkedin: m.linkedin,
        site: m.site,
        jobs: m.jobs,
        role: m.role,
        deep: m.deep,
        hardest: m.hardest,
        favorite: m.favorite,
        diet: m.diet,
        allergies: m.allergies,
      })),
      reviews: reviews.map(({ _id, _creationTime, reviewer, score, note }) => ({ _id, _creationTime, reviewer, score, note })),
      emails: emails.map(({ _id, _creationTime, memberId, decision, state, error }) => ({
        _id,
        _creationTime,
        memberId,
        decision,
        state,
        error,
      })),
      history: history.map(({ _id, _creationTime, actor, action, from, to, score, capacity }) => ({
        _id,
        _creationTime,
        actor,
        action,
        from,
        to,
        score,
        capacity,
      })),
    }
  },
})
