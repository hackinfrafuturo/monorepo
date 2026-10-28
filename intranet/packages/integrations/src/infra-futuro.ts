import { z } from 'zod'

// Project-owned HTTP contract. Strip all other fields before data reaches the UI.
const participantPage = z.object({
  page: z.array(
    z.object({
      _id: z.string(),
      _creationTime: z.number(),
      applicationId: z.string(),
      name: z.string(),
    }),
  ),
  isDone: z.boolean(),
  continueCursor: z.string(),
})

export type RegistrationStats = {
  applicants: number
  submissions: number
  groups: Array<{ id: string; submission: number; members: string[] }>
  checkedAt: string
}

export async function loadInfraFuturoStats(
  config: { baseUrl: string; token: string },
  fetcher: typeof fetch = fetch,
): Promise<RegistrationStats> {
  const base = new URL(config.baseUrl)
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/'
  ) {
    throw new Error('Backend URL must be an origin.')
  }
  if (
    base.protocol !== 'https:' &&
    !(
      base.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
    )
  ) {
    throw new Error('Backend URL must use HTTPS.')
  }
  if (!config.token.trim())
    throw new Error('Backend credentials are not configured.')

  const people = new Map<
    string,
    z.infer<typeof participantPage>['page'][number]
  >()
  const cursors = new Set<string>()
  let cursor: string | null = null
  // Guard against a broken upstream pagination loop; never display truncated totals as complete.
  for (let pageNumber = 0; pageNumber < 1000; pageNumber++) {
    const url = new URL('/api/participants', base)
    url.searchParams.set('numItems', '100')
    if (cursor !== null) url.searchParams.set('cursor', cursor)
    const response = await fetcher(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
      redirect: 'error',
    })
    if (!response.ok) throw new Error('Registration service is unavailable.')
    const result = participantPage.parse(await response.json())
    for (const person of result.page) people.set(person._id, person)
    if (result.isDone) {
      const groups = new Map<
        string,
        { id: string; createdAt: number; members: string[] }
      >()
      for (const person of [...people.values()].sort(
        (a, b) =>
          a._creationTime - b._creationTime || a._id.localeCompare(b._id),
      )) {
        const group = groups.get(person.applicationId) ?? {
          id: person.applicationId,
          createdAt: person._creationTime,
          members: [],
        }
        group.members.push(person.name)
        groups.set(group.id, group)
      }
      return {
        applicants: people.size,
        submissions: groups.size,
        groups: [...groups.values()]
          .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
          .map((group, index) => ({
            id: group.id,
            submission: index + 1,
            members: group.members,
          })),
        checkedAt: new Date().toISOString(),
      }
    }
    if (!result.continueCursor || cursors.has(result.continueCursor))
      throw new Error('Invalid registration pagination.')
    cursors.add(result.continueCursor)
    cursor = result.continueCursor
  }
  throw new Error('Registration pagination limit reached.')
}
