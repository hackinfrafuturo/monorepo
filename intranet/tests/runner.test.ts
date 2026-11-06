import test from 'node:test'
import assert from 'node:assert/strict'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { api, internal } from '../../convex/_generated/api.js'

const modules = {
  '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
  '../../convex/runner.ts': () => import('../../convex/runner.ts'),
  '../../convex/github.ts': () => import('../../convex/github.ts'),
}

const board = () => convexTest(schema, modules)
type Board = ReturnType<typeof board>

/** a run that was started `ms` ago */
const started = (t: Board, ms = 0) => t.run((ctx) => ctx.db.insert('runnerRuns', { startedAt: Date.now() - ms }))

/** saves a run of `score` under `name` */
async function named(t: Board, name: string, score: number) {
  const runId = await started(t)
  await t.mutation(api.runner.complete, { runId, score })
  return t.mutation(api.runner.claim, { runId, name })
}

for (const [name, score] of [['more than the game could award', 5_000_000], ['the largest number there is', Number.MAX_VALUE]] as const) {
  test(`no score is too high: ${name} goes on the board as sent`, async () => {
    const t = board()
    const claimed = await named(t, 'octocat', score)
    assert.equal(claimed.score, score)
    assert.equal(claimed.rank, 1)
    const top = await t.query(api.runner.top, {})
    assert.deepEqual(top.map((row) => row.score), [score])
  })
}

test('a run that lasts hours still counts', async () => {
  const t = board()
  const runId = await started(t, 5 * 60 * 60_000)
  assert.equal(await t.mutation(api.runner.complete, { runId, score: 700_000 }), 700_000)
})

test('a run can be named any time after it ends', async () => {
  const t = board()
  const runId = await t.run((ctx) => ctx.db.insert('runnerRuns', { startedAt: 1_000, finishedAt: 2_000, score: 40 }))
  const claimed = await t.mutation(api.runner.claim, { runId, name: 'octocat' })
  assert.equal(claimed.score, 40)
})

for (const score of [Number.POSITIVE_INFINITY, Number.NaN, 0.5]) {
  test(`${score} is not a score`, async () => {
    const t = board()
    const runId = await started(t)
    await assert.rejects(t.mutation(api.runner.complete, { runId, score }), (error: { data?: unknown }) => error.data === 'Invalid run')
  })
}

test('the board keeps each person once, at their best', async () => {
  const t = board()
  assert.equal((await named(t, 'Octocat', 100)).improved, true)
  const lower = await named(t, 'octocat', 50)
  assert.deepEqual([lower.improved, lower.best], [false, 100])
  assert.equal((await named(t, 'octocat', 100)).improved, false)
  assert.equal((await named(t, 'OCTOCAT', 200)).improved, true)
  const top = await t.query(api.runner.top, {})
  assert.deepEqual(top.map((row) => [row.name, row.score]), [['OCTOCAT', 200]])
})

test('a bot with thousands of runs cannot push people off the board', async () => {
  const t = board()
  await named(t, 'human', 100)
  for (let score = 101; score <= 2_101; score++) await named(t, 'bot', score)
  const top = await t.query(api.runner.top, {})
  assert.deepEqual(top.map((row) => row.name), ['bot', 'human'])
  assert.equal((await named(t, 'human', 200)).rank, 2)
})

test('fillBests builds the board from older runs, and can run again', async () => {
  const t = board()
  await t.run(async (ctx) => {
    for (let i = 0; i < 500; i++) await ctx.db.insert('runnerScores', { name: 'Octocat', score: 100 + i, handle: 'octocat' })
    await ctx.db.insert('runnerScores', { name: 'Old Name', score: 700 })
    await ctx.db.insert('runnerScores', { name: 'old name', score: 800 })
    await ctx.db.insert('runnerScores', { name: 'octocat', score: 900, handle: 'octocat' })
  })
  for (let i = 0; i < 2; i++) {
    await t.mutation(internal.runner.fillBests, {})
    await t.finishAllScheduledFunctions(() => {})
  }
  const top = await t.query(api.runner.top, {})
  assert.deepEqual(top.map((row) => [row.name, row.score]), [['octocat', 900], ['old name', 800]])
})
