import { STATUSES, type Status } from '@convex/admin/status'

/** the list's filters, kept in the URL so a filtered view can be shared or linked to */
export type Filters = { q?: string; status?: Status; size?: number; ref?: string }

export function parseFilters(search: Record<string, unknown>): Filters {
  const size = Number(search.size)
  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    status: STATUSES.find((status) => status === search.status),
    size: Number.isInteger(size) && size >= 1 && size <= 4 ? size : undefined,
    ref: typeof search.ref === 'string' && search.ref ? search.ref : undefined,
  }
}
