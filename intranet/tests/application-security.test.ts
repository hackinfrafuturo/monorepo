import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { api, internal } from '../../convex/_generated/api.js'
import type { Id } from '../../convex/_generated/dataModel.js'

const modules = {
  '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
  '../../convex/applicationEdits.ts': () => import('../../convex/applicationEdits.ts'),
  '../../convex/admin/applications.ts': () => import('../../convex/admin/applications.ts'),
  '../../convex/admin/review.ts': () => import('../../convex/admin/review.ts'),
  '../../convex/admin/messages.ts': () => import('../../convex/admin/messages.ts'),
  '../../convex/admin/decisions.ts': () => import('../../convex/admin/decisions.ts'),
}
const answer = 'A detailed answer describing a real project and what I learned from building it.'
const member = (name: string) => ({
  name: `${name} Prueba`, email: `${name.toLowerCase()}@example.com`, github: name.toLowerCase(),
  idType: 'rut' as const, idNumber: name === 'Ana' ? '11111111-1' : '22222222-2', parking: 'no' as const,
  gender: 'skip' as const, coding: 'yes' as const, linkedin: '', site: '', jobs: 'no' as const,
  role: 'Engineer', deep: answer, hardest: answer, favorite: answer, diet: 'veggie' as const, allergies: '',
})
async function fixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 2 })
    const ana = await ctx.db.insert('members', { applicationId, ...member('Ana') })
    const bruno = await ctx.db.insert('members', { applicationId, ...member('Bruno') })
    return { applicationId, ana, bruno }
  })
  return { t, ...ids }
}
async function link(t: ReturnType<typeof convexTest<typeof schema>>, memberId: Id<'members'>, expiresAt = Date.now() + 60_000) {
  const token = randomBytes(32).toString('base64url')
  await t.mutation(internal.applicationEdits.createLink, {
    memberId, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt, createdBy: 'qa@github',
  })
  return token
}

test('a private link reads and changes only its member, preserving the teammate and team decision', async () => {
  const { t, ana, bruno, applicationId } = await fixture()
  const token = await link(t, ana)
  assert.deepEqual(await t.mutation(api.applicationEdits.load, { token }), member('Ana'))
  assert.deepEqual(await t.mutation(api.applicationEdits.save, { token, member: { ...member('Ana'), role: 'Researcher' } }), { changed: 1 })
  await t.run(async (ctx) => {
    assert.equal((await ctx.db.get(ana))!.role, 'Researcher')
    assert.deepEqual(await ctx.db.get(bruno).then((m) => m!.email), member('Bruno').email)
    assert.equal((await ctx.db.get(applicationId))!.status, undefined)
    const entries = await ctx.db.query('auditLog').collect()
    assert.equal(entries.length, 1)
    assert.equal(entries[0].applicationId, applicationId)
    assert.deepEqual(entries[0].changes, [{ field: 'role', from: 'Engineer', to: 'Researcher' }])
    assert.equal((await ctx.db.query('editLinks').first())!.tokenHash.includes(token), false)
  })
})

test('malformed, unknown, replaced and expired tokens cannot read or save', async (context) => {
  let now = Date.now()
  context.mock.method(Date, 'now', () => now)
  const { t, ana } = await fixture()
  const replaced = await link(t, ana)
  const valid = await link(t, ana)
  assert.ok(await t.mutation(api.applicationEdits.load, { token: valid }))
  for (const token of ['', 'bad', randomBytes(32).toString('base64url'), replaced]) {
    assert.equal(await t.mutation(api.applicationEdits.load, { token }), null)
    await assert.rejects(t.mutation(api.applicationEdits.save, { token, member: member('Ana') }), /no longer valid/)
  }
  // Only time passes: no database write exists to invalidate a cached query.
  now += 60_000
  assert.equal(await t.mutation(api.applicationEdits.load, { token: valid }), null)
  await assert.rejects(t.mutation(api.applicationEdits.save, { token: valid, member: member('Ana') }), /no longer valid/)
})

test('corrections enforce form validation and unique email/GitHub without partial writes', async () => {
  const { t, ana } = await fixture()
  const token = await link(t, ana)
  for (const [patch, error] of [
    [{ deep: 'short' }, /Invalid application/],
    [{ email: member('Bruno').email }, /Email already registered/],
    [{ github: member('Bruno').github }, /GitHub already registered/],
  ] as const) {
    await assert.rejects(t.mutation(api.applicationEdits.save, { token, member: { ...member('Ana'), ...patch } }), error)
  }
  assert.deepEqual(await t.mutation(api.applicationEdits.load, { token }), member('Ana'))
  assert.deepEqual(await t.run((ctx) => ctx.db.query('auditLog').collect()), [])
})

test('team, review, decision and message endpoints reject a wrong secret before reading or writing', async () => {
  const { t, applicationId } = await fixture()
  const previous = process.env.ADMIN_API_SECRET
  process.env.ADMIN_API_SECRET = 'qa-admin-secret'
  try {
    const auth = { secret: 'wrong', actor: 'forged@github' }
    await assert.rejects(t.query(api.admin.applications.list, auth), /Unauthorized/)
    await assert.rejects(t.query(api.admin.applications.get, { ...auth, applicationId }), /Unauthorized/)
    await assert.rejects(t.query(api.admin.review.next, auth), /Unauthorized/)
    await assert.rejects(t.mutation(api.admin.review.save, { ...auth, applicationId, score: 4 }), /Unauthorized/)
    await assert.rejects(t.mutation(api.admin.decisions.decide, { ...auth, applicationIds: [applicationId], status: 'accepted' }), /Unauthorized/)
    await assert.rejects(t.mutation(api.admin.messages.send, { ...auth, audience: { kind: 'team', applicationId }, subject: 'Hi', body: 'Hello', expected: 2 }), /Unauthorized/)
    assert.deepEqual(await t.run((ctx) => ctx.db.query('auditLog').collect()), [])
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_SECRET
    else process.env.ADMIN_API_SECRET = previous
  }
})

test('review omits private fields and custom mail rejects a stale recipient count atomically', async () => {
  const { t, applicationId } = await fixture()
  const previous = process.env.ADMIN_API_SECRET
  process.env.ADMIN_API_SECRET = 'qa-admin-secret'
  try {
    const auth = { secret: 'qa-admin-secret', actor: 'qa@github' }
    const review = await t.query(api.admin.review.next, auth)
    assert.ok(review.application)
    for (const person of review.application.members) {
      for (const field of ['email', 'gender', 'diet', 'allergies']) assert.equal(field in person, false)
    }
    await t.mutation(api.admin.review.save, { ...auth, applicationId, score: 3 })
    assert.equal((await t.query(api.admin.review.next, auth)).application, null)
    await assert.rejects(t.mutation(api.admin.messages.send, { ...auth, audience: { kind: 'team', applicationId }, subject: 'Hi', body: 'Hello', expected: 1 }), /audience changed/)
    assert.deepEqual(await t.run((ctx) => ctx.db.query('messages').collect()), [])
    assert.deepEqual(await t.run((ctx) => ctx.db.query('messageRecipients').collect()), [])
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_SECRET
    else process.env.ADMIN_API_SECRET = previous
  }
})
