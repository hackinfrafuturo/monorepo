import test from 'node:test'
import assert from 'node:assert/strict'
import { STATUSES, canMove, statusOf } from '../../convex/admin/status.ts'
import { requireAdmin } from '../../convex/admin/auth.ts'
import { adminConvex } from '../apps/backoffice/src/server/convex.ts'

test('applications without a status are pending, and no status moves to itself', () => {
  assert.equal(statusOf({}), 'pending')
  assert.equal(statusOf({ status: 'accepted' }), 'accepted')
  for (const status of STATUSES) assert.equal(canMove(status, status), false)
})

test('decisions can be made and corrected, a withdrawal only reopens', () => {
  assert.ok(canMove('pending', 'accepted'))
  assert.ok(canMove('waitlisted', 'accepted'))
  assert.ok(canMove('accepted', 'waitlisted'))
  assert.ok(canMove('rejected', 'pending'))
  assert.equal(canMove('withdrawn', 'accepted'), false)
  assert.ok(canMove('withdrawn', 'pending'))
})

test('the admin gate needs the deployment secret and a single login', () => {
  const previous = process.env.ADMIN_API_SECRET
  try {
    delete process.env.ADMIN_API_SECRET
    assert.throws(() => requireAdmin({ secret: 'x', actor: 'a@github' }), /not configured/)
    process.env.ADMIN_API_SECRET = 'right-secret'
    assert.equal(requireAdmin({ secret: 'right-secret', actor: ' Organizer@GitHub ' }), 'organizer@github')
    for (const secret of ['wrong-secret', 'right-secre', 'right-secrett', ''])
      assert.throws(() => requireAdmin({ secret, actor: 'a@github' }), /Unauthorized/)
    for (const actor of ['', '  ', 'a@github,b@github', 'two words'])
      assert.throws(() => requireAdmin({ secret: 'right-secret', actor }), /Unauthorized/)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_API_SECRET
    else process.env.ADMIN_API_SECRET = previous
  }
})

test('the backoffice only talks to a configured HTTPS Convex origin', () => {
  assert.equal(adminConvex({}), null)
  assert.equal(adminConvex({ INFRA_FUTURO_CONVEX_URL: 'https://x.convex.cloud' }), null)
  const secret = { INFRA_FUTURO_ADMIN_SECRET: 's' }
  assert.ok(adminConvex({ ...secret, INFRA_FUTURO_CONVEX_URL: 'https://x.convex.cloud' }))
  assert.ok(adminConvex({ ...secret, INFRA_FUTURO_CONVEX_URL: 'http://127.0.0.1:3210' }))
  for (const url of ['http://x.convex.cloud', 'https://x.convex.cloud/path', 'https://u:p@x.convex.cloud'])
    assert.throws(() => adminConvex({ ...secret, INFRA_FUTURO_CONVEX_URL: url }))
})

test('decision emails greet each member, escape their name, and never go to test addresses', async () => {
  const { decisionEmail, isTestAddress } = await import('../../convex/admin/emailTemplates.ts')
  for (const decision of ['accepted', 'waitlisted', 'rejected'] as const) {
    const email = decisionEmail(decision, 'Ana <b>')
    assert.match(email.subject, /Infra Futuro 2026/)
    assert.match(email.text, /^hi Ana <b>,/)
    assert.ok(email.html.includes('hi Ana &lt;b&gt;,'))
    assert.ok(!email.html.includes('<b>'))
  }
  assert.notEqual(decisionEmail('accepted', 'A').subject, decisionEmail('rejected', 'A').subject)
  assert.ok(isTestAddress('seed+1@example.com'))
  assert.ok(isTestAddress(' X@Example.ORG '))
  assert.equal(isTestAddress('ana@gmail.com'), false)
  assert.equal(isTestAddress('ana@example.com.evil.cl'), false)
})

test('custom emails fill in the name and link, escape the text, and make links clickable', async () => {
  const { messageEmail } = await import('../../convex/admin/emailTemplates.ts')
  const link = 'https://hackinfrafuturo.cl/corregir#abc'
  const email = messageEmail('Hola {nombre}', 'hola {nombre},\n\nrevisa <esto>:\n\n{enlace}', 'Ana María Soto', link)
  assert.equal(email.subject, 'Hola Ana')
  assert.equal(email.text, `hola Ana,\n\nrevisa <esto>:\n\n${link}`)
  assert.ok(email.html.includes('revisa &lt;esto&gt;:'))
  assert.ok(email.html.includes(`<a href="${link}"`))
})
