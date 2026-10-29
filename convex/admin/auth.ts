import { ConvexError, v } from 'convex/values'

/**
 * The backoffice (intranet/) calls the functions in convex/admin as the organizer it verified through
 * Tailscale. Every one of them takes the backoffice server's secret, which never reaches a browser, and
 * that organizer's login, which goes into the audit log. Anyone on the tailnet is an admin, so there are
 * no roles here: the secret only keeps everyone else out of these public functions.
 */
export const adminArgs = { secret: v.string(), actor: v.string() }

/** the acting organizer's login, once the secret checks out */
export function requireAdmin({ secret, actor }: { secret: string; actor: string }) {
  const expected = process.env.ADMIN_API_SECRET
  if (!expected) throw new ConvexError('Admin API is not configured')
  if (!sameSecret(secret, expected)) throw new ConvexError('Unauthorized')
  const login = actor.trim().toLowerCase()
  if (!login || /\s|,/.test(login)) throw new ConvexError('Unauthorized')
  return login
}

/** compares in constant time, so a wrong guess doesn't tell how much of it was right */
function sameSecret(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}
