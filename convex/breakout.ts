import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { githubHandle, handleKey, playerKey } from './github'

/**
 * The leaderboard for the Breakout easter egg on the landing (src/components/HifBreakout.tsx).
 *
 * Times are measured here, not sent by the browser: `start` stamps a run when the star is first
 * launched, `complete` stamps the win and returns the time, and `claim` puts a GitHub username on it.
 * There are no limits on purpose: bots and scripts are welcome, and the board is a race to the lowest
 * time, to the millisecond.
 *
 * Everyone can play as often as they like: every named run is kept in `breakoutScores`, and the board
 * reads `breakoutBests`, which has one row per person, so nobody's runs can push anyone else off it.
 */

const TOP = 10
/** how many people a rank counts at most, so that a claim can't run into Convex's read limit */
const SCAN = 2000

const score = v.object({ _id: v.id('breakoutBests'), name: v.string(), ms: v.number() })

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
    await ctx.db.patch(runId, { finishedAt: now })
    return now - run.startedAt
  },
})

export const claim = mutation({
  args: { runId: v.id('breakoutRuns'), name: v.string() },
  returns: v.object({ id: v.id('breakoutBests'), ms: v.number(), best: v.number(), rank: v.number(), improved: v.boolean() }),
  handler: async (ctx, { runId, name }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt === undefined) throw new ConvexError('Invalid run')
    const handle = githubHandle(name)
    if (!handle) throw new ConvexError('Invalid GitHub username')
    const ms = run.finishedAt - run.startedAt
    await ctx.db.delete(runId)
    // every run is kept; the board shows each person's best (GitHub usernames ignore case)
    const key = handleKey(handle)
    await ctx.db.insert('breakoutScores', { name: handle, ms, handle: key })
    const { id, best, improved } = await keepBest(ctx, key, handle, ms)
    return { id, ms, best, rank: await rankOf(ctx, best), improved }
  },
})

/** Makes `ms` this person's best if it beats the one on file. */
async function keepBest(ctx: MutationCtx, player: string, name: string, ms: number) {
  const current = await ctx.db
    .query('breakoutBests')
    .withIndex('by_player', (q) => q.eq('player', player))
    .unique()
  if (!current) return { id: await ctx.db.insert('breakoutBests', { player, name, ms }), best: ms, improved: true }
  if (ms >= current.ms) return { id: current._id, best: current.ms, improved: false }
  await ctx.db.patch(current._id, { name, ms })
  return { id: current._id, best: ms, improved: true }
}

/** Where a best of `best` places among people: one more than the number of people with a better best. */
async function rankOf(ctx: QueryCtx, best: number) {
  const ahead = await ctx.db
    .query('breakoutBests')
    .withIndex('by_ms', (q) => q.lt('ms', best))
    .take(SCAN)
  return ahead.length + 1
}

/** The board: the top ten people, each once, with their best. */
export const top = query({
  args: {},
  returns: v.array(score),
  handler: async (ctx) => {
    const rows = await ctx.db.query('breakoutBests').withIndex('by_ms').take(TOP)
    return rows.map(({ _id, name, ms }) => ({ _id, name, ms }))
  },
})

/**
 * One-off: fills `breakoutBests` from the runs saved before it existed. The board reads that table, so run
 * this right after the deploy that adds it, with `pnpm exec convex run breakout:fillBests` (add --prod for
 * production). Nothing is deleted, and it's safe to run again.
 */
export const fillBests = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { cursor }): Promise<null> => {
    const { page, isDone, continueCursor } = await ctx.db
      .query('breakoutScores')
      .paginate({ cursor: cursor ?? null, numItems: 500 })
    for (const row of page) await keepBest(ctx, playerKey(row), row.name, row.ms)
    if (!isDone) await ctx.scheduler.runAfter(0, internal.breakout.fillBests, { cursor: continueCursor })
    return null
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
