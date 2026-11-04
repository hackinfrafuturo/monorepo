import { ConvexError, v, type Infer } from 'convex/values'
import { internalMutation, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { checkTeam } from '../src/apply/schema'
import { firstErrorKey } from '../src/apply/model'
import { hasIdentity, requireUniqueId, stored, withIdentity } from './applications'
import { identityMemberValidator, memberValidator } from './schema'

/**
 * Applicants correcting their own answers from a private link an organizer emailed them. These are the
 * only public functions that read an application: the token stands in for a login, opens one person's
 * answers and nobody else's on their team, and expires. A token can't be guessed (256 random bits), and
 * only its hash is stored, so reading the database doesn't give anyone a working link.
 */

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** the member a live token belongs to, or null for a wrong, replaced or expired one */
async function memberFor(ctx: QueryCtx, token: string): Promise<Doc<'members'> | null> {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null
  const tokenHash = await hashToken(token)
  const link = await ctx.db.query('editLinks').withIndex('by_hash', (q) => q.eq('tokenHash', tokenHash)).first()
  if (!link || link.expiresAt <= Date.now()) return null
  return ctx.db.get(link.memberId)
}

/** A new link for a member replaces any they had, so only the latest email's link works. */
export const createLink = internalMutation({
  args: { memberId: v.id('members'), tokenHash: v.string(), expiresAt: v.number(), createdBy: v.string() },
  returns: v.null(),
  handler: async (ctx, { memberId, tokenHash, expiresAt, createdBy }) => {
    const old = await ctx.db.query('editLinks').withIndex('by_member', (q) => q.eq('memberId', memberId)).take(10)
    for (const link of old) await ctx.db.delete(link._id)
    await ctx.db.insert('editLinks', { memberId, tokenHash, expiresAt, createdBy })
    return null
  },
})

// A query can cache a successful read past expiresAt without any database change.
// A read-only mutation checks the clock on every request, including repeated opens.
export const load = mutation({
  args: { token: v.string() },
  returns: v.union(v.null(), memberValidator),
  handler: async (ctx, { token }) => {
    const m = await memberFor(ctx, token)
    if (!m) return null
    return {
      name: m.name,
      gender: m.gender,
      github: m.github,
      email: m.email,
      coding: m.coding,
      linkedin: m.linkedin,
      site: m.site,
      jobs: m.jobs,
      role: m.role,
      deep: m.deep,
      hardest: m.hardest,
      favorite: m.favorite,
      diet: m.diet,
      allergies: m.allergies,
      idType: m.idType,
      idNumber: m.idNumber,
      parking: m.parking,
    }
  },
})

/** Saves the corrected answers under the same rules as the form, and logs what changed. */
async function saveMember(
  ctx: MutationCtx,
  { token, member }: { token: string; member: Infer<typeof memberValidator> },
  requireIdentity: boolean,
) {
  const current = await memberFor(ctx, token)
  if (!current) throw new ConvexError('This link is no longer valid')
  const [checked] = checkTeam([withIdentity(member)], 1, { requireIdentity })
  if (firstErrorKey(checked.errors) != null) throw new ConvexError('Invalid application')
  const next = stored(checked.member, requireIdentity)

  const sameEmail = await ctx.db.query('members').withIndex('by_email', (q) => q.eq('email', next.email)).first()
  if (sameEmail && sameEmail._id !== current._id) throw new ConvexError('Email already registered')
  if (next.github) {
    const sameGithub = await ctx.db.query('members').withIndex('by_github', (q) => q.eq('github', next.github)).first()
    if (sameGithub && sameGithub._id !== current._id) throw new ConvexError('GitHub already registered')
  }
  await requireUniqueId(ctx, next, current._id)

  const changes = (Object.keys(next) as (keyof typeof next)[])
    .filter((field) => next[field] !== current[field])
    .map((field) =>
      // the history records that the ID changed, never the ID itself
      field === 'idNumber'
        ? { field, from: current.idNumber ? '•••' : '', to: '•••' }
        : { field, from: (current[field] ?? '').slice(0, 300), to: (next[field] ?? '').slice(0, 300) },
    )
  if (!changes.length) return { changed: 0 }
  await ctx.db.patch(current._id, next)
  await ctx.db.insert('auditLog', {
    actor: next.name,
    action: 'edit',
    applicationId: current.applicationId,
    changes,
  })
  return { changed: changes.length }
}

/** Older correction forms keep their contract and never overwrite identity fields. */
export const save = mutation({
  args: { token: v.string(), member: memberValidator },
  returns: v.object({ changed: v.number() }),
  handler: (ctx, args) => saveMember(ctx, args, hasIdentity(args.member)),
})

export const saveWithIdentity = mutation({
  args: { token: v.string(), member: identityMemberValidator },
  returns: v.object({ changed: v.number() }),
  handler: (ctx, args) => saveMember(ctx, args, true),
})
