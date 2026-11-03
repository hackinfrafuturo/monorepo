import { v } from 'convex/values'
import { query } from '../_generated/server'
import { adminArgs, requireAdmin } from './auth'
import { STATUSES, statusOf, type Status } from './status'

/** more applications than a hackathon gets; past it the counts say they're incomplete instead of being wrong */
const LIMIT = 5000

const tally = v.object({ applications: v.number(), people: v.number() })

/** The pipeline at a glance: how many teams and people are at each status, and how big the teams are. */
export const get = query({
  args: adminArgs,
  returns: v.object({
    applications: v.number(),
    people: v.number(),
    byStatus: v.object({
      pending: tally,
      accepted: tally,
      waitlisted: tally,
      rejected: tally,
      withdrawn: tally,
    }),
    sizes: v.array(v.object({ size: v.number(), applications: v.number() })),
    lastSubmittedAt: v.union(v.number(), v.null()),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args)
    const rows = await ctx.db.query('applications').withIndex('by_submittedAt').order('desc').take(LIMIT + 1)
    const applications = rows.slice(0, LIMIT)
    const byStatus = Object.fromEntries(STATUSES.map((status) => [status, { applications: 0, people: 0 }])) as Record<
      Status,
      { applications: number; people: number }
    >
    const sizes = new Map<number, number>()
    let people = 0
    for (const application of applications) {
      const counts = byStatus[statusOf(application)]
      counts.applications++
      counts.people += application.size
      people += application.size
      sizes.set(application.size, (sizes.get(application.size) ?? 0) + 1)
    }
    return {
      applications: applications.length,
      people,
      byStatus,
      sizes: [...sizes].sort(([a], [b]) => a - b).map(([size, count]) => ({ size, applications: count })),
      lastSubmittedAt: applications[0]?.submittedAt ?? null,
      truncated: rows.length > LIMIT,
    }
  },
})
