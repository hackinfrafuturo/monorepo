import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, query, type QueryCtx } from './_generated/server'
import { githubHandle, handleKey, playerKey } from './github'

/**
 * The leaderboard for the runner easter egg on the landing (src/components/HifRunner.tsx).
 *
 * The score is a function of how long the star survives (it counts up faster as the game speeds up), so
 * the server times the run itself: `start` stamps it when play begins, `complete` stamps the crash and
 * accepts the browser's score only up to what that time allows, and `claim` puts a GitHub username on it.
 * Like the Breakout board it isn't tamper-proof (a script can still play a real run), which is fine here.
 *
 * Everyone can play as often as they like: every named run is kept, and the board shows the ten highest
 * scoring people, each once, with their best.
 */

/** keep in step with the game: speed grows ACCEL of the start speed per second, up to MAX_SPEED times, and the score counts 10 a second at the start speed */
const RATE = 10
const ACCEL = 0.045
const MAX_SPEED = 3.2
/** network time between the browser's start and crash and ours */
const SLACK_MS = 2_000
/** a run left open longer than this doesn't count */
const MAX_MS = 60 * 60_000
/** how long a player has to type a name */
const CLAIM_MS = 15 * 60_000
const TOP = 10
/** how many rows a board read looks through at most, while skipping people's other runs */
const SCAN = 2000

/** the highest score a run of `ms` can reach */
export function maxScore(ms: number) {
  const t = ms / 1000
  const cap = (MAX_SPEED - 1) / ACCEL
  const ramp = Math.min(t, cap)
  return RATE * (ramp + (ACCEL / 2) * ramp * ramp + MAX_SPEED * Math.max(0, t - cap))
}

const row = v.object({ _id: v.id('runnerScores'), name: v.string(), score: v.number() })

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
    const now = Date.now()
    const ms = now - run.startedAt
    if (ms > MAX_MS) throw new ConvexError('Invalid run')
    const accepted = Math.floor(Math.min(score, maxScore(ms + SLACK_MS)))
    await ctx.db.patch(runId, {
      finishedAt: now,
      score: accepted,
      runnerHookAccessed: run.runnerHookAccessed === true || runnerHookAccessed === true,
    })
    return accepted
  },
})

export const claim = mutation({
  args: { runId: v.id('runnerRuns'), name: v.string() },
  returns: v.object({ id: v.id('runnerScores'), score: v.number(), best: v.number(), rank: v.number(), improved: v.boolean() }),
  handler: async (ctx, { runId, name }) => {
    const run = await ctx.db.get(runId)
    if (!run || run.finishedAt === undefined || run.score === undefined || Date.now() - run.finishedAt > CLAIM_MS) {
      throw new ConvexError('Invalid run')
    }
    const handle = githubHandle(name)
    if (!handle) throw new ConvexError('Invalid GitHub username')
    const score = run.score
    await ctx.db.delete(runId)
    // every run is kept; the board shows each person's best (GitHub usernames ignore case)
    const key = handleKey(handle)
    const previous = await ctx.db
      .query('runnerScores')
      .withIndex('by_handle', (q) => q.eq('handle', key))
      .order('desc')
      .first()
    const id = await ctx.db.insert('runnerScores', {
      name: handle,
      score,
      handle: key,
      ...(run.runnerHookAccessed !== undefined ? { runnerHookAccessed: run.runnerHookAccessed } : {}),
    })
    const improved = !previous || score > previous.score
    const best = improved ? score : previous!.score
    return { id, score, best, rank: await rankOf(ctx, key, best), improved }
  },
})

/** Where a best of `best` places among people: one more than the number of others with a better best. */
async function rankOf(ctx: QueryCtx, key: string, best: number) {
  const ahead = new Set<string>()
  let scanned = 0
  for await (const row of ctx.db.query('runnerScores').withIndex('by_score', (q) => q.gt('score', best))) {
    const who = playerKey(row)
    if (who !== key) ahead.add(who)
    if (++scanned >= SCAN) break
  }
  return ahead.size + 1
}

/** The board: the top ten people, each once, with their best. */
export const top = query({
  args: {},
  returns: v.array(row),
  handler: async (ctx) => {
    const out: { _id: Id<'runnerScores'>; name: string; score: number }[] = []
    const seen = new Set<string>()
    let scanned = 0
    for await (const row of ctx.db.query('runnerScores').withIndex('by_score').order('desc')) {
      const who = playerKey(row)
      if (!seen.has(who)) {
        seen.add(who)
        out.push({ _id: row._id, name: row.name, score: row.score })
        if (out.length === TOP) break
      }
      if (++scanned >= SCAN) break
    }
    return out
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
