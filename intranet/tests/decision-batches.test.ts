import test from 'node:test'
import assert from 'node:assert/strict'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { api } from '../../convex/_generated/api.js'

test('oversized decisions write nothing, while a full 100-team batch remains atomic', async () => {
  const previous = process.env.ADMIN_API_SECRET
  process.env.ADMIN_API_SECRET = 'qa-only'
  try {
    const t = convexTest(schema, {
      '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
      '../../convex/admin/decisions.ts': () => import('../../convex/admin/decisions.ts'),
    })
    const applicationIds = await t.run(async (ctx) => {
      const ids = []
      for (let i = 0; i < 101; i++) ids.push(await ctx.db.insert('applications', { submittedAt: Date.now(), size: 1 }))
      return ids
    })
    const args = { secret: 'qa-only', actor: 'qa@github', status: 'accepted' as const }
    await assert.rejects(t.mutation(api.admin.decisions.decide, { ...args, applicationIds }), /Choose 1 to 100 teams/)
    assert.equal(await t.run((ctx) => ctx.db.query('auditLog').collect()).then((rows) => rows.length), 0)
    assert.deepEqual(await t.mutation(api.admin.decisions.decide, { ...args, applicationIds: applicationIds.slice(0, 100) }), { changed: 100, emails: 0 })
    const rows = await t.run((ctx) => ctx.db.query('applications').collect())
    assert.equal(rows.filter((row) => row.status === 'accepted').length, 100)
    assert.equal(rows.filter((row) => !row.status).length, 1)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_SECRET
    else process.env.ADMIN_API_SECRET = previous
  }
})
