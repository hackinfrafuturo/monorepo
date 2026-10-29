/**
 * Where an application stands. Decisions are per application, so a team is accepted, waitlisted or
 * rejected as one; a solo applicant is a team of one. Rows from before this field have no status and
 * count as pending.
 *
 * Kept free of imports so the backoffice and its tests can use it too.
 */
export const STATUSES = ['pending', 'accepted', 'waitlisted', 'rejected', 'withdrawn'] as const
export type Status = (typeof STATUSES)[number]
/** the statuses that are decisions, emailed to the team */
export const STATUS_DECISIONS = ['accepted', 'waitlisted', 'rejected'] as const

/** the moves allowed from each status; correcting a decision is a move like any other, and is logged */
const NEXT: Record<Status, readonly Status[]> = {
  pending: ['accepted', 'waitlisted', 'rejected', 'withdrawn'],
  waitlisted: ['accepted', 'rejected', 'withdrawn', 'pending'],
  accepted: ['waitlisted', 'rejected', 'withdrawn'],
  rejected: ['accepted', 'waitlisted', 'pending'],
  withdrawn: ['pending'],
}

export function canMove(from: Status, to: Status) {
  return NEXT[from].includes(to)
}

export function statusOf(application: { status?: Status }): Status {
  return application.status ?? 'pending'
}
