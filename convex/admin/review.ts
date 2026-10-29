import { ConvexError, v } from 'convex/values'
import { mutation, query, type QueryCtx } from '../_generated/server'
import { adminArgs, requireAdmin } from './auth'

/** more pending teams than a hackathon gets */
const LIMIT = 1000
export const MIN_SCORE = 1
export const MAX_SCORE = 4

/** pending teams, oldest first; rows from before `status` existed have none and are pending too */
export async function pendingApplications(ctx: QueryCtx) {
  const [unset, pending] = await Promise.all([
    ctx.db.query('applications').withIndex('by_status', (q) => q.eq('status', undefined)).take(LIMIT),
    ctx.db.query('applications').withIndex('by_status', (q) => q.eq('status', 'pending')).take(LIMIT),
  ])
  return [...unset, ...pending].sort((a, b) => a.submittedAt - b.submittedAt).slice(0, LIMIT)
}

/**
 * The next pending team this organizer hasn't scored, oldest first, with only what judging needs: no
 * email, gender, diet or allergies, and no one else's scores, so nobody is anchored by them.
 */
export const next = query({
  args: { ...adminArgs, skip: v.optional(v.array(v.id('applications'))) },
  returns: v.object({
    pending: v.number(),
    reviewedByMe: v.number(),
    application: v.union(
      v.null(),
      v.object({
        _id: v.id('applications'),
        submittedAt: v.number(),
        size: v.number(),
        members: v.array(
          v.object({
            _id: v.id('members'),
            name: v.string(),
            role: v.string(),
            github: v.string(),
            linkedin: v.string(),
            site: v.string(),
            coding: v.union(v.literal('yes'), v.literal('no')),
            deep: v.string(),
            hardest: v.string(),
            favorite: v.string(),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, { skip = [], ...args }) => {
    const reviewer = requireAdmin(args)
    const skipped = new Set(skip.slice(0, 200))
    const pending = await pendingApplications(ctx)
    let reviewedByMe = 0
    let pick: (typeof pending)[number] | null = null
    for (const application of pending) {
      const mine = await ctx.db
        .query('reviews')
        .withIndex('by_reviewer', (q) => q.eq('reviewer', reviewer).eq('applicationId', application._id))
        .first()
      if (mine) reviewedByMe++
      else if (!pick && !skipped.has(application._id)) pick = application
    }
    if (!pick) return { pending: pending.length, reviewedByMe, application: null }
    const members = await ctx.db
      .query('members')
      .withIndex('by_application', (q) => q.eq('applicationId', pick._id))
      .take(4)
    return {
      pending: pending.length,
      reviewedByMe,
      application: {
        _id: pick._id,
        submittedAt: pick.submittedAt,
        size: pick.size,
        members: members.map(({ _id, name, role, github, linkedin, site, coding, deep, hardest, favorite }) => ({
          _id, name, role, github, linkedin, site, coding, deep, hardest, favorite,
        })),
      },
    }
  },
})

/** This organizer's score for a team, from 1 (no) to 4 (yes, clearly); scoring again replaces it. */
export const save = mutation({
  args: { ...adminArgs, applicationId: v.id('applications'), score: v.number(), note: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { applicationId, score, note, ...args }) => {
    const reviewer = requireAdmin(args)
    if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE)
      throw new ConvexError(`Score must be a whole number from ${MIN_SCORE} to ${MAX_SCORE}`)
    if (!(await ctx.db.get(applicationId))) throw new ConvexError('Application not found')
    const text = note?.trim().slice(0, 2000) || undefined
    const existing = await ctx.db
      .query('reviews')
      .withIndex('by_reviewer', (q) => q.eq('reviewer', reviewer).eq('applicationId', applicationId))
      .first()
    if (existing) await ctx.db.replace(existing._id, { applicationId, reviewer, score, ...(text ? { note: text } : {}) })
    else await ctx.db.insert('reviews', { applicationId, reviewer, score, ...(text ? { note: text } : {}) })
    await ctx.db.insert('auditLog', { actor: reviewer, action: 'review', applicationId, score })
    return null
  },
})
