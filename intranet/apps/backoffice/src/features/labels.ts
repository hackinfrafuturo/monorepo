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
