import test from 'node:test'
import assert from 'node:assert/strict'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema.ts'
import { internal } from '../../convex/_generated/api.js'

const modules = {
  '../../convex/_generated/server.ts': () => import('../../convex/_generated/server.js'),
  '../../convex/emails.ts': () => import('../../convex/emails.ts'),
}

/** runs a confirmation email and returns what would have gone to Resend; nothing leaves this process */
async function confirmation(env: Record<string, string | undefined>) {
  const previous = { ...process.env }
  const realFetch = globalThis.fetch
  const sent: Array<Record<string, unknown>> = []
  Object.assign(process.env, { RESEND_API_KEY: 're_test' })
  delete process.env.EMAIL_FROM
  delete process.env.EMAIL_REPLY_TO
  for (const [key, value] of Object.entries(env)) if (value) process.env[key] = value
  globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)))
    return new Response(JSON.stringify({ id: 'test' }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const t = convexTest(schema, modules)
    const memberId = await t.run(async (ctx) => {
      const applicationId = await ctx.db.insert('applications', { submittedAt: Date.now(), size: 1 })
      return ctx.db.insert('members', {
        applicationId, name: 'Ana Soto', email: 'ana@example.com', github: 'ana', gender: 'skip', coding: 'yes',
        linkedin: '', site: '', jobs: 'no', role: 'Engineer', deep: 'x', hardest: 'x', favorite: 'x', diet: 'veggie', allergies: '',
      })
    })
    await t.action(internal.emails.sendConfirmation, { memberId, name: 'Ana Soto', email: 'ana@example.com' })
    return sent[0]
  } finally {
    globalThis.fetch = realFetch
    process.env = previous
  }
}

test('without settings, confirmations keep coming from the verified address', async () => {
  const email = await confirmation({})
  assert.equal(email.from, 'Infra Futuro <hola@indies.la>')
  assert.equal(email.reply_to, undefined)
})

test('EMAIL_FROM and EMAIL_REPLY_TO change the sender and where replies go, with no release', async () => {
  const email = await confirmation({
    EMAIL_FROM: 'Infra Futuro <organizer@example.org>',
    EMAIL_REPLY_TO: 'organizer@example.org',
  })
  assert.equal(email.from, 'Infra Futuro <organizer@example.org>')
  assert.equal(email.reply_to, 'organizer@example.org')
})
