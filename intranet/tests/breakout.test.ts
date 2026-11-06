import test from 'node:test'
import assert from 'node:assert/strict'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { api, internal } from '../../convex/_generated/api.js'
import { formatMs } from '../../src/components/breakout-board.ts'

const modules = {
  '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
  '../../convex/breakout.ts': () => import('../../convex/breakout.ts'),
  '../../convex/github.ts': () => import('../../convex/github.ts'),
}

const board = () => convexTest(schema, modules)
type Board = ReturnType<typeof board>

/** a run that was started `ms` ago */
async function started(ms: number) {
  const t = board()
  const runId = await t.run((ctx) => ctx.db.insert('breakoutRuns', { startedAt: Date.now() - ms }))
  return { t, runId, finish: () => t.mutation(api.breakout.complete, { runId }) }
}

/** saves a finished run of `ms` under `name` */
async function named(t: Board, name: string, ms: number) {
  const runId = await t.run((ctx) => ctx.db.insert('breakoutRuns', { startedAt: 1_000, finishedAt: 1_000 + ms }))
  return t.mutation(api.breakout.claim, { runId, name })
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

test('a run left open for hours still counts', async () => {
  const hours = 5 * 60 * 60_000
  const { finish } = await started(hours)
  assert.ok(await finish() >= hours)
})

test('a win can be named any time after it', async () => {
  const t = board()
  const claimed = await named(t, 'octocat', 9_000)
  assert.equal(claimed.ms, 9_000)
})

test('the board keeps each person once, at their best', async () => {
  const t = board()
  assert.equal((await named(t, 'Octocat', 9_000)).improved, true)
  const slower = await named(t, 'octocat', 12_000)
  assert.deepEqual([slower.improved, slower.best], [false, 9_000])
  assert.equal((await named(t, 'OCTOCAT', 8_000)).improved, true)
  const top = await t.query(api.breakout.top, {})
  assert.deepEqual(top.map((row) => [row.name, row.ms]), [['OCTOCAT', 8_000]])
})

test('a bot with thousands of runs cannot push people off the board', async () => {
  const t = board()
  await named(t, 'human', 9_000)
  for (let ms = 2_001; ms > 0; ms--) await named(t, 'bot', ms)
  const top = await t.query(api.breakout.top, {})
  assert.deepEqual(top.map((row) => row.name), ['bot', 'human'])
  assert.equal((await named(t, 'human', 8_000)).rank, 2)
})

test('fillBests builds the board from older runs, and can run again', async () => {
  const t = board()
  await t.run(async (ctx) => {
    for (let i = 0; i < 500; i++) await ctx.db.insert('breakoutScores', { name: 'Octocat', ms: 5_000 + i, handle: 'octocat' })
    await ctx.db.insert('breakoutScores', { name: 'Old Name', ms: 7_000 })
    await ctx.db.insert('breakoutScores', { name: 'old name', ms: 6_000 })
    await ctx.db.insert('breakoutScores', { name: 'octocat', ms: 4_000, handle: 'octocat' })
  })
  for (let i = 0; i < 2; i++) {
    await t.mutation(internal.breakout.fillBests, {})
    await t.finishAllScheduledFunctions(() => {})
  }
  const top = await t.query(api.breakout.top, {})
  assert.deepEqual(top.map((row) => [row.name, row.ms]), [['octocat', 4_000], ['old name', 6_000]])
})

test('times read to the millisecond', () => {
  assert.equal(formatMs(83_456), '1:23.456')
  assert.equal(formatMs(2_300.9), '0:02.300')
  assert.equal(formatMs(5), '0:00.005')
  assert.equal(formatMs(0), '0:00.000')
})
