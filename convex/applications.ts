import { ConvexError, v, type Infer } from 'convex/values'
import {
  DIETS,
  GENDERS,
  ID_TYPES,
  TEAM_MAX,
  TEAM_MIN,
  YES_NO,
  firstErrorKey,
  type Member,
} from '../src/apply/model'
import { checkTeam } from '../src/apply/schema'
import { identityMemberValidator, memberValidator } from './schema'
import { normalizeRef } from '../src/apply/ref'
import { mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { internal } from './_generated/api'

function oneOf<T extends string>(options: readonly T[], value: string): value is T {
  return options.some((option) => option === value)
}

/** `checkTeam` keeps empty choices in the type. Refuse those before insert. */
export function stored(member: Member, requireIdentity = true): Infer<typeof memberValidator> {
  if (
    !oneOf(GENDERS, member.gender) ||
    !oneOf(YES_NO, member.coding) ||
    !oneOf(YES_NO, member.jobs) ||
    !oneOf(DIETS, member.diet)
  ) {
    throw new ConvexError('Invalid application')
  }
  const person = {
    name: member.name,
    gender: member.gender,
    github: member.github.toLowerCase(),
    email: member.email,
    coding: member.coding,
    linkedin: member.linkedin,
    site: member.site,
    jobs: member.jobs,
    role: member.role,
    deep: member.deep,
    hardest: member.hardest,
    favorite: member.favorite,
    diet: member.diet,
    allergies: member.allergies,
  }
  // Legacy writes omit these keys entirely, so an old correction tab cannot erase a collected ID.
  if (!requireIdentity) return person
  if (!oneOf(ID_TYPES, member.idType) || !oneOf(YES_NO, member.parking))
    throw new ConvexError('Invalid application')
  return { ...person, idType: member.idType, idNumber: member.idNumber, parking: member.parking }
}

/** The validator allows the identity fields to be missing, for older rows; the form's rules don't. */
export function withIdentity<T extends Omit<Member, 'idType' | 'idNumber' | 'parking'>>(
  member: T & Partial<Pick<Member, 'idType' | 'idNumber' | 'parking'>>,
): Member {
  return { ...member, idType: member.idType ?? '', idNumber: member.idNumber ?? '', parking: member.parking ?? '' }
}

/** Older preview builds already sent these fields to the original endpoint. Validate them fully. */
export function hasIdentity(member: Infer<typeof memberValidator>) {
  return member.idType !== undefined || member.idNumber !== undefined || member.parking !== undefined
}

/** Check the canonical RUT and the padded spelling an earlier development build could store. */
export async function requireUniqueId(
  ctx: QueryCtx,
  member: Pick<Infer<typeof memberValidator>, 'idType' | 'idNumber'>,
  ownId?: Id<'members'>,
) {
  if (!member.idNumber) return
  const numbers = member.idType === 'rut' && /^\d{7}-[\dK]$/.test(member.idNumber)
    ? [member.idNumber, `0${member.idNumber}`]
    : [member.idNumber]
  for (const number of numbers) {
    const existing = await ctx.db.query('members').withIndex('by_idNumber', (q) => q.eq('idNumber', number)).first()
    if (existing && existing._id !== ownId) throw new ConvexError('ID already registered')
  }
}

async function submitApplication(
  ctx: MutationCtx,
  { members, ref }: { members: Infer<typeof memberValidator>[]; ref?: string },
  requireIdentity: boolean,
) {
  if (members.length < TEAM_MIN || members.length > TEAM_MAX) {
    throw new ConvexError('Team must be 1 to 4 people')
  }

  const checked = checkTeam(members.map(withIdentity), members.length, { requireIdentity })
  if (checked.some((item) => firstErrorKey(item.errors) != null)) {
    throw new ConvexError('Invalid application')
  }

  const ready = checked.map((item) => stored(item.member, requireIdentity))

  for (const person of ready) {
    const sameEmail = await ctx.db
      .query('members')
      .withIndex('by_email', (q) => q.eq('email', person.email))
      .unique()
    if (sameEmail) throw new ConvexError('Email already registered')

    if (person.github) {
      const sameGithub = await ctx.db
        .query('members')
        .withIndex('by_github', (q) => q.eq('github', person.github))
        .unique()
      if (sameGithub) throw new ConvexError('GitHub already registered')
    }

    await requireUniqueId(ctx, person)
  }

  const sourceRef = normalizeRef(ref)
  const applicationId = await ctx.db.insert('applications', {
    submittedAt: Date.now(),
    size: ready.length,
    ...(sourceRef ? { ref: sourceRef } : {}),
  })

  for (const person of ready) {
    const memberId = await ctx.db.insert('members', { ...person, applicationId })
    await ctx.scheduler.runAfter(0, internal.emails.sendConfirmation, {
      memberId,
      name: person.name,
      email: person.email,
    })
  }

  return null
}

/** Keep already-open forms working; these applicants remain flagged for identity follow-up. */
export const submit = mutation({
  args: { members: v.array(memberValidator), ref: v.optional(v.string()) },
  returns: v.null(),
  handler: (ctx, args) => submitApplication(ctx, args, args.members.some(hasIdentity)),
})

/** New forms explicitly opt into the contract that requires names, identity and parking. */
export const submitWithIdentity = mutation({
  args: { members: v.array(identityMemberValidator), ref: v.optional(v.string()) },
  returns: v.null(),
  handler: (ctx, args) => submitApplication(ctx, args, true),
})
