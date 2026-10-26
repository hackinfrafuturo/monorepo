import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

/**
 * The leaderboard for the runner easter egg on the landing (src/components/HifRunner.tsx).
 *
 * The score is a function of how long the star survives (it counts up faster as the game speeds up), so
 * the server times the run itself: `start` stamps it when play begins, `complete` stamps the crash and
 * accepts the browser's score only up to what that time allows, and `claim` puts a name on it. Like the
 * Breakout board it isn't tamper-proof (a script can still play a real run), which is fine here.
 */

/** keep in step with the game: speed grows ACCEL of the start speed per second, up to MAX_SPEED times, and the score counts 10 a second at the start speed */
const RATE = 10
const ACCEL = 0.028
const MAX_SPEED = 2.5
/** network time between the browser's start and crash and ours */
const SLACK_MS = 2_000
/** a run left open longer than this doesn't count */
const MAX_MS = 60 * 60_000
/** how long a player has to type a name */
const CLAIM_MS = 15 * 60_000
const NAME_MAX = 24
const TOP = 10

/** the highest score a run of `ms` can reach */
export function maxScore(ms: number) {
  const t = ms / 1000
  const cap = (MAX_SPEED - 1) / ACCEL
  const ramp = Math.min(t, cap)
  return RATE * (ramp + (ACCEL / 2) * ramp * ramp + MAX_SPEED * Math.max(0, t - cap))
}

const row = v.object({ _id: v.id('runnerScores'), name: v.string(), score: v.number() })

export const start = mutation({
  args: {},
  returns: v.id('runnerRuns'),
  handler: async (ctx) => ctx.db.insert('runnerRuns', { startedAt: Date.now() }),
})

export const complete = mutation({
  args: { runId: v.id('runnerRuns'), score: v.number() },
  returns: v.number(),
  handler: async (ctx, { runId, score }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt !== undefined || !Number.isFinite(score) || score < 1) throw new ConvexError('Invalid run')
    const now = Date.now()
    const ms = now - run.startedAt
    if (ms > MAX_MS) throw new ConvexError('Invalid run')
    const accepted = Math.floor(Math.min(score, maxScore(ms + SLACK_MS)))
    await ctx.db.patch(runId, { finishedAt: now, score: accepted })
    return accepted
  },
})

/** Trim, drop control characters, collapse spaces, cap the length. */
function cleanName(raw: string) {
  return raw
    .replace(/\p{C}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
}

export const claim = mutation({
  args: { runId: v.id('runnerRuns'), name: v.string() },
  returns: v.object({ id: v.id('runnerScores'), score: v.number(), rank: v.number() }),
  handler: async (ctx, { runId, name }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt === undefined || run.score === undefined || Date.now() - run.finishedAt > CLAIM_MS) {
      throw new ConvexError('Invalid run')
    }
    const clean = cleanName(name)
    if (clean.length === 0) throw new ConvexError('Name required')
    const score = run.score
    const id = await ctx.db.insert('runnerScores', { name: clean, score })
    await ctx.db.delete(runId)
    const better = await ctx.db
      .query('runnerScores')
      .withIndex('by_score', (q) => q.gt('score', score))
      .take(1000)
    return { id, score, rank: better.length + 1 }
  },
})

export const top = query({
  args: {},
  returns: v.array(row),
  handler: async (ctx) => {
    const rows = await ctx.db.query('runnerScores').withIndex('by_score').order('desc').take(TOP)
    return rows.map(({ _id, name, score }) => ({ _id, name, score }))
  },
})

/** Runs that were started and never named pile up (most games end without one); clear them out daily. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const old = await ctx.db
      .query('runnerRuns')
      .withIndex('by_startedAt', (q) => q.lt('startedAt', Date.now() - 24 * 60 * 60_000))
      .take(500)
    for (const run of old) await ctx.db.delete(run._id)
    return null
  },
})
