import { z } from 'zod'
import {
  DIETS,
  FIELD_ORDER,
  GENDERS,
  MIN_ANSWER,
  TEAM_SIZES,
  YES_NO,
  cleanGithub,
  cleanLinkedin,
  cleanSite,
  type Diet,
  type ErrorKey,
  type FieldKey,
  type Gender,
  type Member,
  type MemberErrors,
  type TeamSize,
  type YesNo,
} from './model'

// Messages on these schemas are error keys (`required`, `email`, …). The page translates them.

const GITHUB = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
const LINKEDIN = /^[\p{L}\p{N}%_.-]{3,100}$/u
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ERROR_KEYS = [
  'required',
  'tooShort',
  'email',
  'github',
  'linkedin',
  'site',
  'dupEmail',
  'dupGithub',
] as const satisfies readonly ErrorKey[]

/** `abort` keeps a single message: an empty answer is "required", not also "invalid". */
function requiredText() {
  return z.string().trim().min(1, { error: 'required', abort: true })
}

/** A written answer: long enough to say something, not just a word. */
function answerText() {
  return requiredText().min(MIN_ANSWER, { error: 'tooShort' })
}

function oneOf<const T extends readonly string[]>(values: T) {
  return z.string().refine((value): value is T[number] => values.some((option) => option === value), {
    error: 'required',
  })
}

function validSite(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

function githubSchema(others: readonly string[], required: boolean) {
  const taken = others.map(cleanGithub).filter(Boolean).map((value) => value.toLowerCase())
  const unique = (value: string, ctx: z.RefinementCtx) => {
    if (value && taken.includes(value.toLowerCase())) {
      ctx.addIssue({ code: 'custom', message: 'dupGithub' })
    }
  }
  const cleaned = z.string().overwrite(cleanGithub)
  if (!required) {
    return cleaned
      .refine((value) => value === '' || GITHUB.test(value), { error: 'github', abort: true })
      .superRefine(unique)
  }
  return cleaned
    .min(1, { error: 'required', abort: true })
    .regex(GITHUB, { error: 'github', abort: true })
    .superRefine(unique)
}

function emailSchema(others: readonly string[]) {
  const taken = others.map((value) => value.trim().toLowerCase()).filter(Boolean)
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: 'required', abort: true })
    .regex(EMAIL, { error: 'email', abort: true })
    .superRefine((value, ctx) => {
      if (taken.includes(value)) ctx.addIssue({ code: 'custom', message: 'dupEmail' })
    })
}

function linkedinSchema(required: boolean) {
  const cleaned = z.string().overwrite(cleanLinkedin)
  if (!required) {
    return cleaned.refine((value) => value === '' || LINKEDIN.test(value), { error: 'linkedin' })
  }
  return cleaned
    .min(1, { error: 'required', abort: true })
    .regex(LINKEDIN, { error: 'linkedin', abort: true })
}

const siteSchema = z
  .string()
  .overwrite(cleanSite)
  .refine((value) => value === '' || validSite(value), { error: 'site' })

const [one, two, three, four] = TEAM_SIZES

/** Accepts the empty choice (`null`) so the field can hold it, then rejects it. */
export const teamSizeSchema = z
  .union([z.literal(one), z.literal(two), z.literal(three), z.literal(four), z.null()])
  .refine((value): value is TeamSize => value != null, { error: 'required' })

const memberCleanSchema = z.object({
  name: z.string().trim(),
  gender: z.string().trim(),
  github: z.string().overwrite(cleanGithub),
  email: z.string().trim().toLowerCase(),
  coding: z.string().trim(),
  linkedin: z.string().overwrite(cleanLinkedin),
  site: z.string().overwrite(cleanSite),
  jobs: z.string().trim(),
  role: z.string().trim(),
  deep: z.string().trim(),
  hardest: z.string().trim(),
  favorite: z.string().trim(),
  diet: z.string().trim(),
  allergies: z.string().trim(),
})

function known<T extends string>(value: string, options: readonly T[]): T | '' {
  return options.find((option) => option === value) ?? ''
}

function cleanMember(member: Member): Member {
  const cleaned = memberCleanSchema.parse(member)
  return {
    name: cleaned.name,
    gender: known<Gender>(cleaned.gender, GENDERS),
    github: cleaned.github,
    email: cleaned.email,
    coding: known<YesNo>(cleaned.coding, YES_NO),
    linkedin: cleaned.linkedin,
    site: cleaned.site,
    jobs: known<YesNo>(cleaned.jobs, YES_NO),
    role: cleaned.role,
    deep: cleaned.deep,
    hardest: cleaned.hardest,
    favorite: cleaned.favorite,
    diet: known<Diet>(cleaned.diet, DIETS),
    allergies: cleaned.allergies,
  }
}

function memberSchema(others: readonly Member[], coding: YesNo | '') {
  // Unanswered still asks for GitHub. LinkedIn becomes required only when they don't code.
  const githubRequired = coding !== 'no'
  return z.object({
    name: requiredText(),
    gender: oneOf(GENDERS),
    github: githubSchema(others.map((member) => member.github), githubRequired),
    email: emailSchema(others.map((member) => member.email)),
    coding: oneOf(YES_NO),
    linkedin: linkedinSchema(coding === 'no'),
    site: siteSchema,
    jobs: oneOf(YES_NO),
    role: requiredText(),
    deep: answerText(),
    hardest: answerText(),
    favorite: answerText(),
    diet: oneOf(DIETS),
    allergies: z.string().trim(),
  })
}

function errorKey(message: string | undefined): ErrorKey | undefined {
  return ERROR_KEYS.find((key) => key === message)
}

function errorsFor(member: Member, others: readonly Member[]): MemberErrors {
  const parsed = memberSchema(others, member.coding).safeParse(member)
  if (parsed.success) return {}
  const errors: MemberErrors = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !FIELD_ORDER.includes(key as FieldKey)) continue
    const field = key as FieldKey
    if (errors[field]) continue
    const code = errorKey(issue.message)
    if (code) errors[field] = code
  }
  return errors
}

/** Clean every person, then check them against each other. */
export function checkTeam(members: readonly Member[], size: number) {
  const normalized = members.slice(0, size).map(cleanMember)
  return normalized.map((member, index) => ({
    member,
    errors: errorsFor(
      member,
      normalized.filter((_, other) => other !== index),
    ),
  }))
}

export function schemaIssue(schema: z.ZodType, value: unknown): ErrorKey | undefined {
  const parsed = schema.safeParse(value)
  if (parsed.success) return undefined
  return errorKey(parsed.error.issues[0]?.message)
}

/** The message for one answer. Other people's handles and emails are cleaned first. */
export function fieldIssue(
  key: FieldKey,
  value: string,
  others: readonly Member[],
  coding: YesNo | '',
): ErrorKey | undefined {
  const parsed = memberSchema(others, coding).shape[key].safeParse(value)
  if (parsed.success) return undefined
  return errorKey(parsed.error.issues[0]?.message)
}
