import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import type { Member } from './model'

function client() {
  const url = import.meta.env.VITE_CONVEX_URL
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('VITE_CONVEX_URL is required to correct an application')
  }
  return new ConvexHttpClient(url)
}

/** The answers a private link opens, or null when the link is wrong, replaced or expired. */
export function loadCorrection(token: string): Promise<Member | null> {
  return client().query(anyApi.applicationEdits.load, { token })
}

export function saveCorrection(token: string, member: Member): Promise<{ changed: number }> {
  return client().mutation(anyApi.applicationEdits.save, { token, member })
}
