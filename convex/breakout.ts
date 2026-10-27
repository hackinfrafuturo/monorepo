import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, query, type QueryCtx } from './_generated/server'
import { githubHandle, handleKey, playerKey } from './github'

/**
 * The leaderboard for the Breakout easter egg on the landing (src/components/HifBreakout.tsx).
 *
 * Times are measured here, not sent by the browser: `start` stamps a run when the star is first
 * launched, `complete` stamps the win and returns the time, and `claim` puts a GitHub username on it. That stops
 * anyone from just posting "1 second". It isn't tamper-proof (a script can still wait out a real run),
 * which is fine for a game on a landing page; delete bad rows from the dashboard's Data page.
 *
 * Everyone can play as often as they like: every named run is kept, and the board shows the ten fastest
 * people, each once, with their best time.
 */

/** faster than this isn't a real game: 15 letters, two hits each */
const MIN_MS = 10_000
/** a run left open longer than this doesn't count */
const MAX_MS = 60 * 60_000
/** how long a winner has to type a name */
const CLAIM_MS = 15 * 60_000
const TOP = 10
/** how many rows a board read looks through at most, while skipping people's other runs */
const SCAN = 2000

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

export const claim = mutation({
  args: { runId: v.id('breakoutRuns'), name: v.string() },
  returns: v.object({ id: v.id('breakoutScores'), ms: v.number(), best: v.number(), rank: v.number(), improved: v.boolean() }),
  handler: async (ctx, { runId, name }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt === undefined || Date.now() - run.finishedAt > CLAIM_MS) {
      throw new ConvexError('Invalid run')
    }
    const handle = githubHandle(name)
    if (!handle) throw new ConvexError('Invalid GitHub username')
    const ms = run.finishedAt - run.startedAt
    await ctx.db.delete(runId)
    // every run is kept; the board shows each person's best (GitHub usernames ignore case)
    const key = handleKey(handle)
    const previous = await ctx.db
      .query('breakoutScores')
      .withIndex('by_handle', (q) => q.eq('handle', key))
      .first()
    const id = await ctx.db.insert('breakoutScores', { name: handle, ms, handle: key })
    const improved = !previous || ms < previous.ms
    const best = improved ? ms : previous!.ms
    return { id, ms, best, rank: await rankOf(ctx, key, best), improved }
  },
})

/** Where a best of `best` places among people: one more than the number of others with a better best. */
async function rankOf(ctx: QueryCtx, key: string, best: number) {
  const ahead = new Set<string>()
  let scanned = 0
  for await (const row of ctx.db.query('breakoutScores').withIndex('by_ms', (q) => q.lt('ms', best))) {
    const who = playerKey(row)
    if (who !== key) ahead.add(who)
    if (++scanned >= SCAN) break
  }
  return ahead.size + 1
}

/** The board: the top ten people, each once, with their best. */
export const top = query({
  args: {},
  returns: v.array(score),
  handler: async (ctx) => {
    const out: { _id: Id<'breakoutScores'>; name: string; ms: number }[] = []
    const seen = new Set<string>()
    let scanned = 0
    for await (const row of ctx.db.query('breakoutScores').withIndex('by_ms')) {
      const who = playerKey(row)
      if (!seen.has(who)) {
        seen.add(who)
        out.push({ _id: row._id, name: row.name, ms: row.ms })
        if (out.length === TOP) break
      }
      if (++scanned >= SCAN) break
    }
    return out
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
