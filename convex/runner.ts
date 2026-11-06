import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { githubHandle, handleKey, playerKey } from './github'

/**
 * The leaderboard for the runner easter egg on the landing (src/components/HifRunner.tsx).
 *
 * The browser reports the score and the server takes it as sent: `start` opens a run when play begins,
 * `complete` records the score at the crash, and `claim` puts a GitHub username on it. There are no limits
 * on purpose: bots and scripts are welcome, and the board is a race to the highest number. Only values that
 * aren't a score at all are refused.
 *
 * Everyone can play as often as they like: every named run is kept in `runnerScores`, and the board reads
 * `runnerBests`, which has one row per person, so nobody's runs can push anyone else off it.
 */

const TOP = 10
/** how many people a rank counts at most, so that a claim can't run into Convex's read limit */
const SCAN = 2000

const row = v.object({ _id: v.id('runnerBests'), name: v.string(), score: v.number() })

export const start = mutation({
  args: { runnerHookAccessed: v.optional(v.boolean()) },
  returns: v.id('runnerRuns'),
  handler: async (ctx, { runnerHookAccessed }) => ctx.db.insert('runnerRuns', {
    startedAt: Date.now(),
    runnerHookAccessed: runnerHookAccessed ?? false,
  }),
})

/** One-way, idempotent telemetry. Late reports after a claim/cleanup are harmless. */
export const markHookAccessed = mutation({
  args: { runId: v.id('runnerRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId)
    if (run && !run.runnerHookAccessed) await ctx.db.patch(runId, { runnerHookAccessed: true })
    return null
  },
})

export const complete = mutation({
  args: { runId: v.id('runnerRuns'), score: v.number(), runnerHookAccessed: v.optional(v.boolean()) },
  returns: v.number(),
  handler: async (ctx, { runId, score, runnerHookAccessed }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt !== undefined || !Number.isFinite(score) || score < 1) throw new ConvexError('Invalid run')
    const accepted = Math.floor(score)
    await ctx.db.patch(runId, {
      finishedAt: Date.now(),
      score: accepted,
      runnerHookAccessed: run.runnerHookAccessed === true || runnerHookAccessed === true,
    })
    return accepted
  },
})

export const claim = mutation({
  args: { runId: v.id('runnerRuns'), name: v.string() },
  returns: v.object({ id: v.id('runnerBests'), score: v.number(), best: v.number(), rank: v.number(), improved: v.boolean() }),
  handler: async (ctx, { runId, name }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt === undefined || run.score === undefined) throw new ConvexError('Invalid run')
    const handle = githubHandle(name)
    if (!handle) throw new ConvexError('Invalid GitHub username')
    const score = run.score
    await ctx.db.delete(runId)
    // every run is kept; the board shows each person's best (GitHub usernames ignore case)
    const key = handleKey(handle)
    await ctx.db.insert('runnerScores', {
      name: handle,
      score,
      handle: key,
      ...(run.runnerHookAccessed !== undefined ? { runnerHookAccessed: run.runnerHookAccessed } : {}),
    })
    const { id, best, improved } = await keepBest(ctx, key, handle, score)
    return { id, score, best, rank: await rankOf(ctx, best), improved }
  },
})

/** Makes `score` this person's best if it beats the one on file. */
async function keepBest(ctx: MutationCtx, player: string, name: string, score: number) {
  const current = await ctx.db
    .query('runnerBests')
    .withIndex('by_player', (q) => q.eq('player', player))
    .unique()
  if (!current) return { id: await ctx.db.insert('runnerBests', { player, name, score }), best: score, improved: true }
  if (score <= current.score) return { id: current._id, best: current.score, improved: false }
  await ctx.db.patch(current._id, { name, score })
  return { id: current._id, best: score, improved: true }
}

/** Where a best of `best` places among people: one more than the number of people with a better best. */
async function rankOf(ctx: QueryCtx, best: number) {
  const ahead = await ctx.db
    .query('runnerBests')
    .withIndex('by_score', (q) => q.gt('score', best))
    .take(SCAN)
  return ahead.length + 1
}

/** The board: the top ten people, each once, with their best. */
export const top = query({
  args: {},
  returns: v.array(row),
  handler: async (ctx) => {
    const rows = await ctx.db.query('runnerBests').withIndex('by_score').order('desc').take(TOP)
    return rows.map(({ _id, name, score }) => ({ _id, name, score }))
  },
})

/**
 * One-off: rows saved before the board used GitHub usernames get a handle when their name is a valid
 * username, so they count as the same person as that user's later runs. Nothing is deleted; names that
 * can't be usernames are left as they are. Run with `pnpm exec convex run runner:keyOldScores` (add
 * --prod for production).
 */
export const keyOldScores = internalMutation({
  args: {},
  returns: v.object({ keyed: v.number() }),
  handler: async (ctx) => {
    let keyed = 0
    for (const row of await ctx.db.query('runnerScores').take(2000)) {
      if (row.handle) continue
      const handle = githubHandle(row.name)
      if (!handle) continue
      await ctx.db.patch(row._id, { handle: handleKey(handle) })
      keyed++
    }
    return { keyed }
  },
})

/**
 * One-off: fills `runnerBests` from the runs saved before it existed. The board reads that table, so run
 * this right after the deploy that adds it, with `pnpm exec convex run runner:fillBests` (add --prod for
 * production). Nothing is deleted, and it's safe to run again.
 */
export const fillBests = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { cursor }): Promise<null> => {
    const { page, isDone, continueCursor } = await ctx.db
      .query('runnerScores')
      .paginate({ cursor: cursor ?? null, numItems: 500 })
    for (const row of page) await keepBest(ctx, playerKey(row), row.name, row.score)
    if (!isDone) await ctx.scheduler.runAfter(0, internal.runner.fillBests, { cursor: continueCursor })
    return null
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
