import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import type { Member } from './model'

export type Team = { members: Member[]; ref?: string }

/** Save the team in Convex, or keep the form on its retry step. */
export async function submitTeam(team: Team): Promise<void> {
  const url = import.meta.env.VITE_CONVEX_URL
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('VITE_CONVEX_URL is required to save submissions')
  }
  const convex = new ConvexHttpClient(url)
  await convex.mutation(anyApi.applications.submitWithIdentity, {
    members: team.members,
    ...(team.ref ? { ref: team.ref } : {}),
  })
}
