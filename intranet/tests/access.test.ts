import test from 'node:test'
import assert from 'node:assert/strict'
import { AccessError, requireAccess } from '../apps/backoffice/src/server/access.ts'
import { projects } from '../apps/backoffice/src/projects.ts'

const request = (login?: string) =>
  new Request('https://intranet.example.ts.net/projects/infra-futuro/stats', {
    headers: login ? { 'Tailscale-User-Login': login } : {},
  })
const denied = (status: number) => (error: unknown) =>
  error instanceof AccessError && error.status === status

test('anonymous and malformed identities are denied', () => {
  for (const login of [undefined, 'member@github,another@github', 'bad login'])
    assert.throws(() => requireAccess(request(login), {}), denied(401))
})

test('different verified tailnet members get all apps without project configuration', () => {
  for (const login of ['FIRST@github', 'new-member@github']) {
    const session = requireAccess(request(login), {}, false, 'infra-futuro')
    assert.equal(session.login, login.toLowerCase())
    assert.deepEqual(session.projects.map(({ id }) => id), projects.map(({ id }) => id))
  }
  assert.throws(() => requireAccess(request('new-member@github'), {}, false, 'unknown'), denied(404))
})

test('development override is explicit and remains disabled in production', () => {
  const dev = { INTRANET_DEV_USER: 'local@github' }
  assert.equal(requireAccess(request(), dev, true).login, 'local@github')
  assert.throws(() => requireAccess(request(), {}, true), denied(401))
  assert.throws(() => requireAccess(request('member@github'), dev, false), denied(503))
})
