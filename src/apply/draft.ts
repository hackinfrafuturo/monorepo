import {
  DIETS,
  GENDERS,
  TEAM_MAX,
  TEAM_SIZES,
  YES_NO,
  emptyMember,
  type Member,
  type TeamSize,
} from './model'
import { normalizeRef } from './ref'

/** `'consent'`, `'size'`, a member index, or `'review'`. The done screen is never saved. */
export type Step = 'consent' | 'size' | 'review' | number

export type Draft = {
  size: TeamSize | null
  members: Member[]
  step: Step
  ref: string
  consentAccepted: boolean
}

const KEY = 'infra-hack:apply:v1'

export function emptyDraft(): Draft {
  return {
    size: null,
    members: Array.from({ length: TEAM_MAX }, emptyMember),
    step: 'consent',
    ref: '',
    consentAccepted: false,
  }
}

function readMember(value: unknown): Member {
  const member = emptyMember()
  if (!value || typeof value !== 'object') return member
  const saved = value as Record<string, unknown>
  const text = (key: keyof Member): string =>
    typeof saved[key] === 'string' ? (saved[key] as string) : ''
  return {
    name: text('name'),
    gender: GENDERS.find((g) => g === saved.gender) ?? '',
    github: text('github'),
    email: text('email'),
    coding: YES_NO.find((v) => v === saved.coding) ?? 'yes',
    linkedin: text('linkedin'),
    site: text('site'),
    jobs: YES_NO.find((v) => v === saved.jobs) ?? 'yes',
    role: text('role'),
    deep: text('deep'),
    hardest: text('hardest'),
    favorite: text('favorite'),
    diet: DIETS.find((d) => d === saved.diet) ?? '',
    allergies: text('allergies'),
  }
}

function readStep(value: unknown, size: TeamSize | null): Step {
  if (value === 'consent') return 'consent'
  if (size === null) return 'size'
  if (value === 'size' || value === 'review') return value
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size)
    return value
  return 'size'
}

/** A refresh in the middle of four people's answers should not cost them. */
export function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDraft()
    const saved = JSON.parse(raw) as Record<string, unknown>
    const size = TEAM_SIZES.find((n) => n === saved.size) ?? null
    const list = Array.isArray(saved.members) ? saved.members : []
    const consentAccepted = saved.consentAccepted === true
    return {
      size,
      members: Array.from({ length: TEAM_MAX }, (_, i) => readMember(list[i])),
      step: consentAccepted ? readStep(saved.step, size) : 'consent',
      ref: normalizeRef(typeof saved.ref === 'string' ? saved.ref : undefined) ?? '',
      consentAccepted,
    }
  } catch {
    return emptyDraft()
  }
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // Private mode or full storage. The form still works, it just won't survive a refresh.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
