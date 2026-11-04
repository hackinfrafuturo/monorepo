export const TEAM_MIN = 1
export const TEAM_MAX = 4
export const TEAM_SIZES = [1, 2, 3, 4] as const
export type TeamSize = (typeof TEAM_SIZES)[number]

export const GENDERS = ['woman', 'man', 'nonbinary', 'other', 'skip'] as const
export type Gender = (typeof GENDERS)[number]

export const YES_NO = ['yes', 'no'] as const
export type YesNo = (typeof YES_NO)[number]

export const DIETS = ['vegan', 'veggie', 'omnivore'] as const
export type Diet = (typeof DIETS)[number]

/** The venue's security needs an ID for everyone. A passport covers people without a RUT. */
export const ID_TYPES = ['rut', 'passport'] as const
export type IdType = (typeof ID_TYPES)[number]

/** Shortest accepted answer for the written questions. Stops "Nada", "Ninguna" and similar. */
export const MIN_ANSWER = 40

export type Member = {
  name: string
  idType: IdType | ''
  idNumber: string
  gender: Gender | ''
  github: string
  email: string
  /** Whether they write code as part of their day-to-day. */
  coding: YesNo | ''
  linkedin: string
  site: string
  jobs: YesNo | ''
  role: string
  deep: string
  hardest: string
  favorite: string
  diet: Diet | ''
  allergies: string
  parking: YesNo | ''
}

export type FieldKey = keyof Member

export type ErrorKey =
  | 'required'
  | 'tooShort'
  | 'email'
  | 'github'
  | 'linkedin'
  | 'site'
  | 'dupEmail'
  | 'dupGithub'
  | 'realName'
  | 'rut'
  | 'passport'
  | 'dupId'

export type MemberErrors = Partial<Record<FieldKey, ErrorKey>>

/** Order the fields appear on screen. Also the order errors get focus. */
export const FIELD_ORDER = [
  'name',
  'idType',
  'idNumber',
  'email',
  'coding',
  'gender',
  'github',
  'jobs',
  'role',
  'deep',
  'hardest',
  'favorite',
  'linkedin',
  'site',
  'diet',
  'allergies',
  'parking',
] as const satisfies readonly FieldKey[]

export function emptyMember(): Member {
  return {
    name: '',
    idType: 'rut',
    idNumber: '',
    gender: '',
    github: '',
    email: '',
    coding: 'yes',
    linkedin: '',
    site: '',
    jobs: 'yes',
    role: '',
    deep: '',
    hardest: '',
    favorite: '',
    diet: '',
    allergies: '',
    parking: '',
  }
}

/** A RUT's check digit: modulo 11 over the number, right to left, with weights 2 to 7. */
export function rutCheckDigit(body: string): string {
  let sum = 0
  let weight = 2
  for (const digit of [...body].reverse()) {
    sum += Number(digit) * weight
    weight = weight === 7 ? 2 : weight + 1
  }
  const rest = 11 - (sum % 11)
  return rest === 11 ? '0' : rest === 10 ? 'K' : String(rest)
}

/** `12.345.678-5`, `12345678-5` and `123456785` all become `12345678-5`; passports lose spaces and dashes. */
export function cleanIdNumber(idType: IdType | '', value: string): string {
  if (idType === 'passport') return value.replace(/[\s-]/g, '').toUpperCase()
  const raw = value.replace(/[.\s-]/g, '').toUpperCase()
  return raw.length < 2 ? raw : `${raw.slice(0, -1)}-${raw.slice(-1)}`
}

export function validRut(value: string): boolean {
  const match = /^(\d{7,8})-([\dK])$/.exec(value)
  return !!match && rutCheckDigit(match[1]) === match[2]
}

/** `https://github.com/octocat/`, `@octocat` and `octocat` all become `octocat`. */
export function cleanGithub(value: string): string {
  return value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
}

/** A pasted profile URL or a bare handle becomes the handle. */
export function cleanLinkedin(value: string): string {
  return value
    .trim()
    .replace(/^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/in\//i, '')
    .replace(/[/?#].*$/, '')
}

/** Adds `https://` when the person typed a bare domain. */
export function cleanSite(value: string): string {
  const v = value.trim()
  if (!v) return ''
  return /^[a-z][a-z\d+.-]*:\/\//i.test(v) ? v : `https://${v}`
}

export const NORMALIZE: Partial<Record<FieldKey, (value: string) => string>> = {
  github: cleanGithub,
  linkedin: cleanLinkedin,
  site: cleanSite,
  email: (value) => value.trim().toLowerCase(),
  idNumber: (value) => value.trim().toUpperCase(),
}

/** DOM id of a member's field. The page uses it to focus the first error. */
export function fieldId(index: number, key: FieldKey): string {
  return `m${index}-${key}`
}

export function firstErrorKey(errors: MemberErrors): FieldKey | null {
  return FIELD_ORDER.find((key) => errors[key]) ?? null
}
