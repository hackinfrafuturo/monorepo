import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { convex } from './breakout-board'

/** The runner leaderboard (convex/runner.ts). Without VITE_CONVEX_URL the game still plays, just without it. */

export type RunnerScore = { _id: string; name: string; score: number }
export type RunnerRunId = Id<'runnerRuns'>

export function startRunnerRun(): Promise<RunnerRunId | null> {
  const c = convex()
  return c ? c.mutation(api.runner.start, {}).catch(() => null) : Promise.resolve(null)
}

/** the score the server accepts for this run */
export async function completeRunnerRun(runId: RunnerRunId, score: number) {
  return convex()!.mutation(api.runner.complete, { runId, score })
}

export async function claimRunnerRun(runId: RunnerRunId, name: string) {
  return convex()!.mutation(api.runner.claim, { runId, name })
}

export async function topRunnerScores(): Promise<RunnerScore[] | null> {
  const c = convex()
  if (!c) return null
  try {
    return await c.query(api.runner.top, {})
  } catch {
    return null
  }
}
