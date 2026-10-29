import type { Status } from '@convex/admin/status'

/** How the backoffice names things, in one place so every page says the same. */
export const STATUS_LABELS: Record<Status, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  waitlisted: 'En lista de espera',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
}

export const GENDER_LABELS = {
  woman: 'Mujer',
  man: 'Hombre',
  nonbinary: 'No binario',
  other: 'Otro',
  skip: 'Prefiere no decir',
} as const

export const DIET_LABELS = {
  vegan: 'Vegana',
  veggie: 'Vegetariana',
  omnivore: 'Come de todo',
} as const

export const people = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`
export const teams = (n: number) => `${n} ${n === 1 ? 'inscripción' : 'inscripciones'}`
export const teamSize = (size: number) => (size === 1 ? 'Individual' : `Equipo de ${size}`)

/** a date (and optionally the time) in Santiago */
export const santiago = (when: string | number, withTime = true) =>
  new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(new Date(when))

/** the review scale (convex/admin/review.ts) */
export const SCORES = [1, 2, 3, 4] as const
export const SCORE_LABELS: Record<number, string> = {
  1: 'No',
  2: 'Dudoso',
  3: 'Sí',
  4: 'Sí, sin duda',
}

/** an average score, the way people say it here: 3,5 */
export const score = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)

export const reviewsLabel = (count: number) =>
  `${count} ${count === 1 ? 'revisión' : 'revisiones'}`

type Entry = {
  action: 'status' | 'review' | 'capacity'
  from?: Status
  to?: Status
  score?: number
  capacity?: number
}

/** what an organizer did, said after their login: "movió de Pendiente a Aceptada" */
export function describeEntry(entry: Entry) {
  if (entry.action === 'status' && entry.from && entry.to)
    return `movió de ${STATUS_LABELS[entry.from]} a ${STATUS_LABELS[entry.to]}`
  if (entry.action === 'review' && entry.score)
    return `puntuó ${entry.score} · ${SCORE_LABELS[entry.score] ?? ''}`
  if (entry.action === 'capacity' && entry.capacity)
    return `fijó los cupos en ${people(entry.capacity)}`
  return 'hizo un cambio'
}
