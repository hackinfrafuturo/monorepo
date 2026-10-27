/**
 * GitHub usernames, which the game leaderboards are keyed on (one row per person).
 *
 * GitHub's rules: 1–39 letters, digits or single hyphens, not starting or ending with a hyphen. A leading
 * @ is allowed and dropped. Usernames are case-insensitive, so rows are matched on the lowercase form.
 */
const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

/** The username as typed (without the @), or null if it can't be a GitHub username. */
export function githubHandle(raw: string): string | null {
  const name = raw.trim().replace(/^@/, '')
  return HANDLE.test(name) ? name : null
}

/** The key two spellings of the same username share. */
export const handleKey = (name: string) => name.toLowerCase()

/** Who a leaderboard row belongs to: its username, or for rows saved before usernames, its name. */
export const playerKey = (row: { handle?: string; name: string }) => row.handle ?? `name:${row.name.toLowerCase()}`
