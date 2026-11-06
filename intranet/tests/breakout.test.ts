import test from 'node:test'
import assert from 'node:assert/strict'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { api } from '../../convex/_generated/api.js'
import { formatMs } from '../../src/components/breakout-board.ts'

const modules = {
  '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
  '../../convex/breakout.ts': () => import('../../convex/breakout.ts'),
  '../../convex/github.ts': () => import('../../convex/github.ts'),
}

/** a run that was started `ms` ago */
async function started(ms: number) {
  const t = convexTest(schema, modules)
  const runId = await t.run((ctx) => ctx.db.insert('breakoutRuns', { startedAt: Date.now() - ms }))
  return { t, runId, finish: () => t.mutation(api.breakout.complete, { runId }) }
}

for (const [name, elapsed] of [['a 2.3s win', 2_300], ['a bot that finishes at once', 0]] as const) {
  test(`no time is too fast: ${name} is accepted and goes on the board`, async () => {
    const { t, runId, finish } = await started(elapsed)
    const ms = await finish()
    assert.ok(ms >= elapsed && ms < elapsed + 1_000)
    const claimed = await t.mutation(api.breakout.claim, { runId, name: 'octocat' })
    assert.equal(claimed.ms, ms)
    assert.equal(claimed.rank, 1)
    const top = await t.query(api.breakout.top, {})
    assert.deepEqual(top.map((row) => row.ms), [ms])
  })
}

test('a run left open too long is still refused', async () => {
  const { finish } = await started(61 * 60_000)
  await assert.rejects(finish, (error: { data?: unknown }) => error.data === 'Invalid run')
})

test('times read to the millisecond', () => {
  assert.equal(formatMs(83_456), '1:23.456')
  assert.equal(formatMs(2_300.9), '0:02.300')
  assert.equal(formatMs(5), '0:00.005')
  assert.equal(formatMs(0), '0:00.000')
})
