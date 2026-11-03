import { v } from 'convex/values'
import { query } from '../_generated/server'
import { statusValidator } from '../schema'
import { adminArgs, requireAdmin } from './auth'
import { statusOf } from './status'

/** more than a hackathon gets; past these the page says its numbers are incomplete */
const APPLICATIONS = 1000
const MEMBERS = 4000

const count = v.array(v.object({ key: v.string(), count: v.number() }))
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' })

function tally(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

/**
 * Who applied, in aggregate: never a row per person, so nothing here identifies anyone. Optionally only
 * the teams at one status, to see what the accepted group looks like.
 */
export const get = query({
  args: { ...adminArgs, status: v.optional(statusValidator) },
  returns: v.object({
    applications: v.number(),
    people: v.number(),
    perDay: v.array(v.object({ day: v.string(), applications: v.number(), people: v.number() })),
    sizes: count,
    gender: count,
    coding: count,
    jobs: count,
    diet: count,
    allergies: v.number(),
    refs: v.array(v.object({ key: v.string(), applications: v.number(), people: v.number() })),
    truncated: v.boolean(),
  }),
  handler: async (ctx, { status, ...args }) => {
    requireAdmin(args)
    const rows = await ctx.db.query('applications').withIndex('by_submittedAt').take(APPLICATIONS + 1)
    const applications = rows.slice(0, APPLICATIONS).filter((application) => !status || statusOf(application) === status)
    const included = new Set(applications.map((application) => application._id))
    const allMembers = await ctx.db.query('members').take(MEMBERS + 1)
    const members = allMembers.slice(0, MEMBERS).filter((member) => included.has(member.applicationId))

    const perDay = new Map<string, { applications: number; people: number }>()
    const refs = new Map<string, { applications: number; people: number }>()
    for (const application of applications) {
      const date = day.format(application.submittedAt)
      const today = perDay.get(date) ?? { applications: 0, people: 0 }
      perDay.set(date, { applications: today.applications + 1, people: today.people + application.size })
      const key = application.ref ?? ''
      const source = refs.get(key) ?? { applications: 0, people: 0 }
      refs.set(key, { applications: source.applications + 1, people: source.people + application.size })
    }
    return {
      applications: applications.length,
      people: applications.reduce((sum, application) => sum + application.size, 0),
      perDay: [...perDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, counts]) => ({ day: date, ...counts })),
      sizes: tally(applications.map((application) => String(application.size))),
      gender: tally(members.map((member) => member.gender)),
      coding: tally(members.map((member) => member.coding)),
      jobs: tally(members.map((member) => member.jobs)),
      diet: tally(members.map((member) => member.diet)),
      allergies: members.filter((member) => member.allergies.trim()).length,
      refs: [...refs].map(([key, counts]) => ({ key, ...counts })).sort((a, b) => b.applications - a.applications),
      truncated: rows.length > APPLICATIONS || allMembers.length > MEMBERS,
    }
  },
})
