import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { api, internal } from '../../convex/_generated/api.js'
import { checkTeam } from '../../src/apply/schema.ts'
import { cleanIdNumber, emptyMember, validRut, type Member } from '../../src/apply/model.ts'
import { loadDraft, saveDraft, emptyDraft } from '../../src/apply/draft.ts'
import { internalAction } from '../../convex/_generated/server.js'
import { v } from 'convex/values'

const modules = {
  '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
  '../../convex/applications.ts': () => import('../../convex/applications.ts'),
  '../../convex/applicationEdits.ts': () => import('../../convex/applicationEdits.ts'),
  '../../convex/apiData.ts': () => import('../../convex/apiData.ts'),
  '../../convex/admin/stats.ts': () => import('../../convex/admin/stats.ts'),
  '../../convex/admin/messages.ts': () => import('../../convex/admin/messages.ts'),
  // Keep scheduled confirmations inside the fixture; never load the real email transport.
  '../../convex/emails.ts': async () => ({
    sendConfirmation: internalAction({
      args: { memberId: v.id('members'), name: v.string(), email: v.string() },
      returns: v.null(),
      handler: async () => null,
    }),
  }),
}
const answer = 'A detailed answer describing a real project and what I learned from building it.'
const valid: Member = {
  ...emptyMember(),
  name: 'Ana Soto',
  idNumber: '12.345.678-5',
  email: 'ana@example.com',
  github: 'ana-soto',
  gender: 'skip',
  role: 'Engineer',
  deep: answer,
  hardest: answer,
  favorite: answer,
  diet: 'veggie',
  parking: 'no',
}
const errors = (patch: Partial<Member>, team: Member[] = []) =>
  checkTeam([{ ...valid, ...patch }, ...team], 1 + team.length)[0].errors

test('a RUT needs its check digit right, however it is typed', () => {
  for (const rut of ['12345678-5', '11111111-1', '22222222-2']) assert.ok(validRut(rut), rut)
  assert.ok(validRut(`${cleanIdNumber('rut', '10.000.013-k')}`))
  for (const rut of ['12345678-6', '12345678', '1234-5', 'abc']) assert.equal(validRut(rut), false, rut)
  assert.equal(cleanIdNumber('rut', ' 12.345.678-5 '), '12345678-5')
  assert.equal(cleanIdNumber('rut', '123456785'), '12345678-5')
  assert.equal(cleanIdNumber('passport', 'ab 123-4567'), 'AB1234567')
})

test('the form takes real names and valid IDs, and asks about parking', () => {
  assert.deepEqual(errors({}), {})
  assert.deepEqual(errors({ name: 'María José Pérez-Cotapos' }), {})
  assert.deepEqual(errors({ name: "Sinéad O'Connor" }), {})
  for (const name of ['Ana', 'xX_dragon_Xx', 'batman123 rojas', '@ana soto'])
    assert.equal(errors({ name }).name, 'realName', name)
  assert.equal(errors({ name: '' }).name, 'required')
  assert.equal(errors({ idNumber: '' }).idNumber, 'required')
  assert.equal(errors({ idNumber: '12.345.678-6' }).idNumber, 'rut')
  assert.deepEqual(errors({ idType: 'passport', idNumber: 'AB1234567' }), {})
  assert.equal(errors({ idType: 'passport', idNumber: 'a1' }).idNumber, 'passport')
  assert.equal(errors({ parking: '' }).parking, 'required')
})

test('two people on a team cannot share an ID, however it was typed', () => {
  const teammate = { ...valid, name: 'Bruno Díaz', email: 'b@example.com', github: 'bruno', idNumber: '123456785' }
  assert.equal(errors({}, [teammate]).idNumber, 'dupId')
})

test('the saved draft keeps the answers but never the ID', () => {
  const store = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
  })
  const draft = emptyDraft()
  draft.members[0] = { ...valid }
  saveDraft(draft)
  assert.equal([...store.values()].join('').includes('12.345.678'), false)
  assert.equal(loadDraft().members[0].name, 'Ana Soto')
  assert.equal(loadDraft().members[0].idNumber, '')
})

const legacy = {
  name: 'Ana Soto', email: 'ana@example.com', github: 'ana-soto', gender: 'skip' as const, coding: 'yes' as const,
  linkedin: '', site: '', jobs: 'no' as const, role: 'Engineer', deep: answer, hardest: answer, favorite: answer,
  diet: 'veggie' as const, allergies: '',
}
const complete = { ...legacy, idType: 'rut' as const, idNumber: '12345678-5', parking: 'yes' as const }

async function applicantLink(t: ReturnType<typeof convexTest>, memberId: never) {
  const token = randomBytes(32).toString('base64url')
  await t.mutation(internal.applicationEdits.createLink, {
    memberId,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: Date.now() + 60_000,
    createdBy: 'organizer@github',
  })
  return token
}

test('Convex refuses an application without a real name, ID or parking answer', async () => {
  const t = convexTest(schema, modules)
  for (const member of [legacy, { ...complete, idNumber: '12345678-6' }, { ...complete, name: 'Ana' }])
    await assert.rejects(t.mutation(api.applications.submitWithIdentity, { members: [member] }), /Invalid application|idType|idNumber|parking/)
})

test('a valid application is stored cleaned, and the same ID cannot apply twice', async () => {
  const t = convexTest(schema, modules)
  await t.mutation(api.applications.submitWithIdentity, {
    members: [{ ...complete, idNumber: '12.345.678-5', name: '  Ana   Soto ' }],
  })
  await t.run(async (ctx) => {
    const [member] = await ctx.db.query('members').collect()
    assert.equal(member.name, 'Ana Soto')
    assert.equal(member.idType, 'rut')
    assert.equal(member.idNumber, '12345678-5')
    assert.equal(member.parking, 'yes')
  })
  await assert.rejects(
    t.mutation(api.applications.submitWithIdentity, {
      members: [{ ...complete, email: 'other@example.com', github: 'other', idNumber: '123456785' }],
    }),
    /ID already registered/,
  )
})

test('an older application can add its ID from a private link, and the history hides the number', async () => {
  const t = convexTest(schema, modules)
  const { memberId, applicationId, other } = await t.run(async (ctx) => {
    const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 2 })
    return {
      applicationId,
      memberId: await ctx.db.insert('members', { applicationId, ...legacy }),
      other: await ctx.db.insert('members', {
        applicationId, ...legacy, email: 'b@example.com', github: 'b', idType: 'rut', idNumber: '11111111-1', parking: 'no',
      }),
    }
  })
  const token = await applicantLink(t, memberId as never)
  assert.equal((await t.mutation(api.applicationEdits.load, { token }))?.idNumber, undefined)
  await assert.rejects(t.mutation(api.applicationEdits.saveWithIdentity, { token, member: legacy }), /Invalid application|idType|idNumber|parking/)
  await assert.rejects(
    t.mutation(api.applicationEdits.saveWithIdentity, { token, member: { ...complete, idNumber: '11111111-1' } }),
    /ID already registered/,
  )
  await t.mutation(api.applicationEdits.saveWithIdentity, { token, member: complete })
  await t.run(async (ctx) => {
    assert.equal((await ctx.db.get(memberId))?.idNumber, '12345678-5')
    assert.equal((await ctx.db.get(other))?.idNumber, '11111111-1')
    const entries = await ctx.db.query('auditLog').withIndex('by_application', (q) => q.eq('applicationId', applicationId)).collect()
    const history = JSON.stringify(entries)
    assert.equal(history.includes('12345678'), false)
    assert.ok(history.includes('idNumber'))
  })
})

test('the shared-token participants feed never carries the ID', async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 1 })
    await ctx.db.insert('members', { applicationId, ...complete })
  })
  const { page } = await t.query(internal.apiData.participantsPage, {
    paginationOpts: { numItems: 10, cursor: null },
  })
  assert.equal(page.length, 1)
  assert.equal(JSON.stringify(page).includes('12345678'), false)
  assert.equal(page[0].parking, 'yes')
})

test('a group email can target only the people still missing an ID', async () => {
  process.env.ADMIN_API_SECRET = 'right-secret'
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 2 })
    await ctx.db.insert('members', { applicationId, ...legacy })
    await ctx.db.insert('members', { applicationId, ...complete, email: 'b@example.com', github: 'b', name: 'Bruno Díaz' })
  })
  const admin = { secret: 'right-secret', actor: 'organizer@github' }
  const all = await t.query(api.admin.messages.audience, { ...admin, audience: { kind: 'group' } })
  const missing = await t.query(api.admin.messages.audience, { ...admin, audience: { kind: 'group', missingId: true } })
  assert.equal(all.count, 2)
  assert.deepEqual(missing, { count: 1, sample: ['Ana Soto'] })
  const stats = await t.query(api.admin.stats.get, admin)
  assert.equal(stats.missingId, 1)
  assert.deepEqual(stats.parking, [{ key: 'yes', count: 1 }])
})

test('already-open signup tabs retain their old validation and are flagged for ID follow-up', async () => {
  const t = convexTest(schema, modules)
  await t.mutation(api.applications.submit, { members: [{ ...legacy, name: 'Ana' }] })
  const [saved] = await t.run((ctx) => ctx.db.query('members').collect())
  assert.equal(saved.name, 'Ana')
  assert.equal(saved.idNumber, undefined)
  assert.equal(saved.parking, undefined)
  await assert.rejects(t.mutation(api.applications.submit, { members: [{ ...legacy, deep: 'short' }] }), /Invalid application/)
  const previous = process.env.ADMIN_API_SECRET
  process.env.ADMIN_API_SECRET = 'qa-only'
  try {
    const audience = await t.query(api.admin.messages.audience, {
      secret: 'qa-only', actor: 'qa@github', audience: { kind: 'group', missingId: true },
    })
    assert.equal(audience.count, 1)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_SECRET
    else process.env.ADMIN_API_SECRET = previous
  }
})

test('an old correction tab preserves identity collected by a newer tab', async () => {
  const t = convexTest(schema, modules)
  const memberId = await t.run(async (ctx) => {
    const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 1 })
    return ctx.db.insert('members', { applicationId, ...complete })
  })
  const token = await applicantLink(t, memberId as never)
  await t.mutation(api.applicationEdits.save, { token, member: { ...legacy, role: 'Researcher' } })
  const saved = await t.run((ctx) => ctx.db.get(memberId))
  assert.equal(saved?.role, 'Researcher')
  assert.equal(saved?.idNumber, complete.idNumber)
  assert.equal(saved?.idType, complete.idType)
  assert.equal(saved?.parking, complete.parking)
  const history = await t.run((ctx) => ctx.db.query('auditLog').collect())
  assert.deepEqual(history[0].changes, [{ field: 'role', from: 'Engineer', to: 'Researcher' }])
})

test('leading-zero RUT spellings cannot duplicate an ID in a team, signup or correction', async () => {
  const rut = { ...complete, idNumber: '1234567-4' }
  assert.equal(cleanIdNumber('rut', '01.234.567-4'), rut.idNumber)
  const team = checkTeam([rut, { ...rut, email: 'b@example.com', github: 'b', idNumber: '01234567-4' }], 2)
  assert.equal(team[0].errors.idNumber, 'dupId')
  assert.equal(team[1].errors.idNumber, 'dupId')
  for (const existingNumber of ['1234567-4', '01234567-4']) {
    const t = convexTest(schema, modules)
    const memberId = await t.run(async (ctx) => {
      const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 2 })
      await ctx.db.insert('members', { applicationId, ...rut, idNumber: existingNumber })
      return ctx.db.insert('members', { applicationId, ...legacy, email: 'b@example.com', github: 'b' })
    })
    const duplicate = { ...rut, email: 'b@example.com', github: 'b', idNumber: '01234567-4' }
    const token = await applicantLink(t, memberId as never)
    await assert.rejects(t.mutation(api.applicationEdits.saveWithIdentity, { token, member: duplicate }), /ID already registered/)
    await assert.rejects(t.mutation(api.applications.submitWithIdentity, {
      members: [{ ...duplicate, email: 'c@example.com', github: 'c' }],
    }), /ID already registered/)
    assert.equal((await t.run((ctx) => ctx.db.get(memberId)))?.idNumber, undefined)
  }
})

test('unversioned preview callers still work, but supplied identity fields must be complete and valid', async () => {
  const t = convexTest(schema, modules)
  await t.mutation(api.applications.submit, { members: [complete] })
  const [saved] = await t.run((ctx) => ctx.db.query('members').collect())
  assert.equal(saved.idNumber, complete.idNumber)
  const token = await applicantLink(t, saved._id as never)
  await t.mutation(api.applicationEdits.save, { token, member: { ...complete, role: 'Researcher' } })
  assert.equal((await t.run((ctx) => ctx.db.get(saved._id)))?.role, 'Researcher')
  await assert.rejects(t.mutation(api.applications.submit, { members: [{ ...legacy, idNumber: '12345678-5' }] }), /Invalid application/)
  await assert.rejects(t.mutation(api.applicationEdits.save, { token, member: { ...legacy, idNumber: 'bad' } }), /Invalid application/)
})

const teammate = (name: string, idNumber: string) => ({
  ...complete,
  name: `${name} Rojas`,
  email: `${name.toLowerCase()}@example.com`,
  github: name.toLowerCase(),
  idNumber,
})

async function applied(t: ReturnType<typeof convexTest>) {
  await t.mutation(api.applications.submitWithIdentity, { members: [complete] })
  const [owner] = await t.run((ctx) => ctx.db.query('members').collect())
  return { owner, token: await applicantLink(t, owner._id as never) }
}

test('a private link adds a teammate to its own team, who gets the confirmation email', async () => {
  const t = convexTest(schema, modules)
  const { owner, token } = await applied(t)
  assert.deepEqual(await t.mutation(api.applicationEdits.team, { token }), { size: 1, canAdd: true })
  const added = await t.mutation(api.applicationEdits.addTeammate, {
    token,
    member: { ...teammate('Bruno', '1.111.111-4'), email: ' Bruno@Example.com ' },
  })
  assert.deepEqual(added, { size: 2, canAdd: true })
  await t.run(async (ctx) => {
    const members = await ctx.db.query('members').withIndex('by_application', (q) => q.eq('applicationId', owner.applicationId)).collect()
    assert.equal(members.length, 2)
    assert.equal(members[1].email, 'bruno@example.com')
    assert.equal(members[1].idNumber, '1111111-4')
    assert.equal((await ctx.db.get(owner.applicationId))?.size, 2)
    const entries = await ctx.db.query('auditLog').withIndex('by_application', (q) => q.eq('applicationId', owner.applicationId)).collect()
    assert.deepEqual(entries.map(({ actor, action, changes }) => ({ actor, action, changes })), [
      { actor: complete.name, action: 'edit', changes: [{ field: 'teammate', from: '', to: 'Bruno Rojas' }] },
    ])
    assert.equal(JSON.stringify(entries).includes('1111111'), false)
    const scheduled = await ctx.db.system.query('_scheduled_functions').collect()
    assert.deepEqual(
      scheduled.filter(({ args }) => args[0].email === 'bruno@example.com').map(({ args }) => args[0].memberId),
      [members[1]._id],
    )
  })
})

test('a team stops growing at its limit and once it has a decision', async () => {
  const t = convexTest(schema, modules)
  const { owner, token } = await applied(t)
  for (const [name, id] of [['Bruno', '11111111-1'], ['Carla', '22222222-2'], ['Diego', '33333333-3']])
    await t.mutation(api.applicationEdits.addTeammate, { token, member: teammate(name, id) })
  assert.deepEqual(await t.mutation(api.applicationEdits.team, { token }), { size: 4, canAdd: false })
  await assert.rejects(
    t.mutation(api.applicationEdits.addTeammate, { token, member: teammate('Elisa', '44444444-4') }),
    /Team is full/,
  )
  assert.equal((await t.run((ctx) => ctx.db.get(owner.applicationId)))?.size, 4)

  const small = convexTest(schema, modules)
  const { owner: solo, token: link } = await applied(small)
  for (const status of ['accepted', 'waitlisted', 'rejected', 'withdrawn'] as const) {
    await small.run((ctx) => ctx.db.patch(solo.applicationId, { status }))
    assert.deepEqual(await small.mutation(api.applicationEdits.team, { token: link }), { size: 1, canAdd: false })
    await assert.rejects(
      small.mutation(api.applicationEdits.addTeammate, { token: link, member: teammate('Bruno', '11111111-1') }),
      /Team already decided/,
    )
  }
  assert.equal((await small.run((ctx) => ctx.db.query('members').collect())).length, 1)
})

test('a teammate meets the same rules as the form and a dead link adds nobody', async () => {
  const t = convexTest(schema, modules)
  const { owner, token } = await applied(t)
  const bruno = teammate('Bruno', '11111111-1')
  for (const [patch, refused] of [
    [{ email: complete.email }, /Email already registered/],
    [{ github: complete.github }, /GitHub already registered/],
    [{ idNumber: complete.idNumber }, /ID already registered/],
    [{ name: 'Bruno' }, /Invalid application/],
    [{ idNumber: '11111111-2' }, /Invalid application/],
    [{ deep: 'Nada' }, /Invalid application/],
  ] as const) {
    await assert.rejects(t.mutation(api.applicationEdits.addTeammate, { token, member: { ...bruno, ...patch } }), refused)
  }
  assert.equal(await t.mutation(api.applicationEdits.team, { token: 'x'.repeat(43) }), null)
  await assert.rejects(t.mutation(api.applicationEdits.addTeammate, { token: 'x'.repeat(43), member: bruno }), /no longer valid/)
  await t.run(async (ctx) => {
    assert.equal((await ctx.db.query('members').collect()).length, 1)
    assert.equal((await ctx.db.get(owner.applicationId))?.size, 1)
    assert.equal((await ctx.db.query('auditLog').collect()).length, 0)
  })
})
