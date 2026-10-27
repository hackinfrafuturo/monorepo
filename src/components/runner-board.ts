import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { convex } from './breakout-board'

/** The runner leaderboard (convex/runner.ts). Without VITE_CONVEX_URL the game still plays, just without it. */

export type RunnerScore = { _id: string; name: string; score: number }
export type RunnerRunId = Id<'runnerRuns'>

export function startRunnerRun(runnerHookAccessed = false): Promise<RunnerRunId | null> {
  const c = convex()
  return c ? c.mutation(api.runner.start, { runnerHookAccessed }).catch(() => null) : Promise.resolve(null)
}

export async function markRunnerHookAccessed(runId: RunnerRunId) {
  return convex()?.mutation(api.runner.markHookAccessed, { runId })
}

/** the score the server accepts for this run */
export async function completeRunnerRun(runId: RunnerRunId, score: number, runnerHookAccessed = false) {
  return convex()!.mutation(api.runner.complete, { runId, score, runnerHookAccessed })
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
