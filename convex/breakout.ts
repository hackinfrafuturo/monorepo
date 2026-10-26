import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

/**
 * The leaderboard for the Breakout easter egg on the landing (src/components/HifBreakout.tsx).
 *
 * Times are measured here, not sent by the browser: `start` stamps a run when the star is first
 * launched, `complete` stamps the win and returns the time, and `claim` puts a name on it. That stops
 * anyone from just posting "1 second". It isn't tamper-proof (a script can still wait out a real run),
 * which is fine for a game on a landing page; delete bad rows from the dashboard's Data page.
 */

/** faster than this isn't a real game: 15 letters, two hits each */
const MIN_MS = 15_000
/** a run left open longer than this doesn't count */
const MAX_MS = 60 * 60_000
/** how long a winner has to type a name */
const CLAIM_MS = 15 * 60_000
const NAME_MAX = 24
const TOP = 10

const score = v.object({ _id: v.id('breakoutScores'), name: v.string(), ms: v.number() })

export const start = mutation({
  args: {},
  returns: v.id('breakoutRuns'),
  handler: async (ctx) => ctx.db.insert('breakoutRuns', { startedAt: Date.now() }),
})

export const complete = mutation({
  args: { runId: v.id('breakoutRuns') },
  returns: v.number(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt !== undefined) throw new ConvexError('Invalid run')
    const now = Date.now()
    const ms = now - run.startedAt
    if (ms < MIN_MS || ms > MAX_MS) throw new ConvexError('Invalid run')
    await ctx.db.patch(runId, { finishedAt: now })
    return ms
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
  args: { runId: v.id('breakoutRuns'), name: v.string() },
  returns: v.object({ id: v.id('breakoutScores'), ms: v.number(), rank: v.number() }),
  handler: async (ctx, { runId, name }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt === undefined || Date.now() - run.finishedAt > CLAIM_MS) {
      throw new ConvexError('Invalid run')
    }
    const clean = cleanName(name)
    if (clean.length === 0) throw new ConvexError('Name required')
    const ms = run.finishedAt - run.startedAt
    const id = await ctx.db.insert('breakoutScores', { name: clean, ms })
    await ctx.db.delete(runId)
    const faster = await ctx.db
      .query('breakoutScores')
      .withIndex('by_ms', (q) => q.lt('ms', ms))
      .take(1000)
    return { id, ms, rank: faster.length + 1 }
  },
})

export const top = query({
  args: {},
  returns: v.array(score),
  handler: async (ctx) => {
    const rows = await ctx.db.query('breakoutScores').withIndex('by_ms').take(TOP)
    return rows.map(({ _id, name, ms }) => ({ _id, name, ms }))
  },
})

/** Runs that were started and never won (or never named) pile up; clear them out daily. */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const old = await ctx.db
      .query('breakoutRuns')
      .withIndex('by_startedAt', (q) => q.lt('startedAt', Date.now() - 24 * 60 * 60_000))
      .take(500)
    for (const run of old) await ctx.db.delete(run._id)
    return null
  },
})
