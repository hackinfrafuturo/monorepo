import test from 'node:test'
import assert from 'node:assert/strict'
import { loadInfraFuturoStats } from '../packages/integrations/src/infra-futuro.ts'

const config = { baseUrl: 'https://backend.example', token: 'test-only-token' }
const person = (
  id: string,
  applicationId: string,
  name: string,
  time: number,
) => ({
  _id: id,
  applicationId,
  name,
  _creationTime: time,
  email: 'private@example.com',
  allergies: 'private medical answer',
})

test('follows pagination, deduplicates people, groups teams, and strips private answers', async () => {
  const seen: URL[] = []
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    seen.push(url)
    assert.equal(
      new Headers(init?.headers).get('Authorization'),
      'Bearer test-only-token',
    )
    assert.equal(init?.redirect, 'error')
    assert.equal(init?.cache, 'no-store')
    return Response.json(
      seen.length === 1
        ? {
            page: [
              person('c', 'team-2', 'Camila', 30),
              person('a', 'team-1', 'Ana', 10),
            ],
            isDone: false,
            continueCursor: 'page-2',
          }
        : {
            page: [
              person('a', 'team-1', 'Ana', 10),
              person('b', 'team-1', 'Bruno', 20),
            ],
            isDone: true,
            continueCursor: '',
          },
    )
  }
  const stats = await loadInfraFuturoStats(config, fakeFetch)
  assert.equal(stats.applicants, 3)
  assert.equal(stats.submissions, 2)
  assert.deepEqual(stats.groups, [
    { id: 'team-1', submission: 1, members: ['Ana', 'Bruno'] },
    { id: 'team-2', submission: 2, members: ['Camila'] },
  ])
  assert.equal(seen[0].searchParams.get('numItems'), '100')
  assert.equal(seen[1].searchParams.get('cursor'), 'page-2')
  assert.equal(JSON.stringify(stats).includes('private'), false)
  assert.equal(JSON.stringify(stats).includes(config.token), false)
})

test('empty registrations are valid zero totals', async () => {
  const stats = await loadInfraFuturoStats(config, async () =>
    Response.json({ page: [], isDone: true, continueCursor: '' }),
  )
  assert.equal(stats.applicants, 0)
  assert.equal(stats.submissions, 0)
  assert.deepEqual(stats.groups, [])
})

test('upstream failures and malformed or looping pagination cannot become partial totals', async () => {
  await assert.rejects(
    loadInfraFuturoStats(
      config,
      async () => new Response('secret backend message', { status: 401 }),
    ),
    /Registration service is unavailable/,
  )
  await assert.rejects(
    loadInfraFuturoStats(config, async () =>
      Response.json({
        page: [{ name: 'invalid' }],
        isDone: true,
        continueCursor: '',
      }),
    ),
  )
  let requests = 0
  await assert.rejects(
    loadInfraFuturoStats(config, async () => {
      requests++
      return Response.json({
        page: [],
        isDone: false,
        continueCursor: 'repeated',
      })
    }),
    /Invalid registration pagination/,
  )
  assert.equal(requests, 2)
})

test('credentials cannot be forwarded over insecure URLs or embedded URL credentials', async () => {
  const neverFetch: typeof fetch = async () => {
    throw new Error('Unexpected network access')
  }
  for (const baseUrl of [
    'http://backend.example',
    'https://user:password@backend.example',
    'https://backend.example/path',
  ]) {
    await assert.rejects(
      loadInfraFuturoStats({ ...config, baseUrl }, neverFetch),
      /Backend URL/,
    )
  }
  await assert.rejects(
    loadInfraFuturoStats({ ...config, token: '' }, neverFetch),
    /credentials/,
  )
})
