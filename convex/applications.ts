import { ConvexError, v } from 'convex/values'
import {
  DIETS,
  GENDERS,
  TEAM_MAX,
  TEAM_MIN,
  YES_NO,
  firstErrorKey,
  type Member,
} from '../src/apply/model'
import { checkTeam } from '../src/apply/schema'
import { memberValidator } from './schema'
import { normalizeRef } from '../src/apply/ref'
import { mutation } from './_generated/server'
import { internal } from './_generated/api'

function oneOf<T extends string>(options: readonly T[], value: string): value is T {
  return options.some((option) => option === value)
}

/** `checkTeam` keeps empty choices in the type. Refuse those before insert. */
function stored(member: Member) {
  if (
    !oneOf(GENDERS, member.gender) ||
    !oneOf(YES_NO, member.coding) ||
    !oneOf(YES_NO, member.jobs) ||
    !oneOf(DIETS, member.diet)
  ) {
    throw new ConvexError('Invalid application')
  }
  return {
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
}

export const submit = mutation({
  args: { members: v.array(memberValidator), ref: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { members, ref }) => {
    if (members.length < TEAM_MIN || members.length > TEAM_MAX) {
      throw new ConvexError('Team must be 1 to 4 people')
    }

    const checked = checkTeam(members, members.length)
    if (checked.some((item) => firstErrorKey(item.errors) != null)) {
      throw new ConvexError('Invalid application')
    }

    const ready = checked.map((item) => stored(item.member))

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
  },
})
