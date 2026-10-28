import test from 'node:test'
import assert from 'node:assert/strict'
import { requestAccess } from '../apps/backoffice/src/server/request-access.ts'
import { AccessError } from '../apps/backoffice/src/server/access.ts'

const env = { INTRANET_AUTH_MODE: 'tailscale-alb', INTRANET_IDENTITY_URL: 'http://10.203.0.10:3101/identity' }
const denied = (status: number) => (error: unknown) => error instanceof AccessError && error.status === status
function request(ip?: string) {
  return new Request('https://backoffice.hackinfrafuturo.cl/stats', { headers: {
    'Tailscale-User-Login': 'organizer@github', 'x-amzn-oidc-data': 'forged',
    ...(ip ? { 'x-forwarded-for': ip } : {}),
  } })
}
const identity = (login = 'organizer@github', ip = '100.100.1.2'): typeof fetch => async () => Response.json({ login, ip })

test('AWS mode uses the final ALB client IP and router identity, ignoring forged headers', async () => {
  const observed: string[] = []
  const fetcher: typeof fetch = async (url, options) => {
    observed.push(String(url)); assert.equal(options?.redirect, 'error')
    return Response.json({ login: 'ORGANIZER@github', ip: '100.100.1.2' })
  }
  const session = await requestAccess(request('100.99.99.99, 100.100.1.2'), env, false, 'infra-futuro', fetcher)
  assert.equal(session.login, 'organizer@github')
  assert.deepEqual(observed, ['http://10.203.0.10:3101/identity?ip=100.100.1.2'])
  const another = await requestAccess(request('100.100.1.2'), env, false, 'infra-futuro', identity('new-member@github'))
  assert.equal(another.login, 'new-member@github')
  assert.deepEqual(another.projects, session.projects)
})

test('missing, non-tailnet, malformed, and forged-prefix addresses cannot read identities', async () => {
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; throw new Error('must not call') }
  for (const value of [undefined, '10.203.0.10', '100.100.1.2, 203.0.113.1', '100.63.1.2', '100.128.1.2', '100.100.1.2:1234', '::1', '100.100.01.2'])
    await assert.rejects(requestAccess(request(value), env, false, undefined, fetcher), denied(401))
  assert.equal(calls, 0)
})

test('unknown/tagged nodes, identity mismatches, outages, and bad config fail closed', async () => {
  for (const status of [401, 403, 404])
    await assert.rejects(requestAccess(request('100.100.1.2'), env, false, undefined, async () => new Response('', {status})), denied(401))
  await assert.rejects(requestAccess(request('100.100.1.2'), env, false, undefined, identity('organizer@github', '100.100.1.3')), denied(401))
  for (const fetcher of [async () => { throw new Error('offline') }, async () => new Response('private failure', {status:500}), async () => new Response('invalid json')])
    await assert.rejects(requestAccess(request('100.100.1.2'), env, false, undefined, fetcher), denied(503))
  for (const override of [{INTRANET_DEV_USER:'organizer@github'}, {INTRANET_AUTH_MODE:'typo'}, {INTRANET_IDENTITY_URL:''}, {INTRANET_IDENTITY_URL:'https://external.example/identity'}])
    await assert.rejects(requestAccess(request('100.100.1.2'), {...env,...override}, false), denied(503))
})
