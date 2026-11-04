import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { emptyMember, type Member } from './model'

function client() {
  const url = import.meta.env.VITE_CONVEX_URL
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('VITE_CONVEX_URL is required to correct an application')
  }
  return new ConvexHttpClient(url)
}

/** The answers a private link opens, or null when the link is wrong, replaced or expired. */
export async function loadCorrection(token: string): Promise<Member | null> {
  const member = await client().mutation(anyApi.applicationEdits.load, { token })
  // Applications from before an ID was required don't have one: the form asks for it.
  return member && { ...emptyMember(), ...member }
}

export function saveCorrection(token: string, member: Member): Promise<{ changed: number }> {
  return client().mutation(anyApi.applicationEdits.save, { token, member })
}
