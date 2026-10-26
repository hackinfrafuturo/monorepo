import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

/** The Breakout leaderboard (convex/breakout.ts). Without VITE_CONVEX_URL the game still plays, just without it. */

export type Score = { _id: string; name: string; ms: number }
export type RunId = Id<'breakoutRuns'>

let client: ConvexHttpClient | null | undefined
function convex() {
  if (client === undefined) {
    const url = import.meta.env.VITE_CONVEX_URL
    client = typeof url === 'string' && url.length > 0 ? new ConvexHttpClient(url) : null
  }
  return client
}

export const boardEnabled = () => convex() !== null

export function startRun(): Promise<RunId | null> {
  const c = convex()
  return c ? c.mutation(api.breakout.start, {}).catch(() => null) : Promise.resolve(null)
}

export async function completeRun(runId: RunId) {
  return convex()!.mutation(api.breakout.complete, { runId })
}

export async function claimRun(runId: RunId, name: string) {
  return convex()!.mutation(api.breakout.claim, { runId, name })
}

export async function topScores(): Promise<Score[] | null> {
  const c = convex()
  if (!c) return null
  try {
    return await c.query(api.breakout.top, {})
  } catch {
    return null
  }
}

/** 83456 → "1:23.4" */
export function formatMs(ms: number) {
  const tenths = Math.floor(ms / 100)
  const m = Math.floor(tenths / 600)
  const s = Math.floor((tenths % 600) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`
}
