import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const app = fileURLToPath(new URL('../apps/backoffice/', import.meta.url))
const team = (i) => ({
  _id: String(i).padStart(32, 'a'), submittedAt: 1700000000000 + i, size: 1, status: 'pending',
  reviews: { count: 1, average: 4 },
  members: [{ name: `QA Team ${i}`, email: `qa-${i}@example.com`, github: `qa-${i}`, coding: 'yes', hasId: true }],
})
let applications = [team(0), team(1), team(2)]
const decisions = []
const fixture = createServer(async (request, response) => {
  let body = ''
  for await (const chunk of request) body += chunk
  const { path, args } = JSON.parse(body)
  let value
  if (path === 'admin/applications:list') value = { applications, truncated: false }
  else if (path === 'admin/settings:get') value = { capacity: 500, decisionEmails: 'off', messageEmails: 'off', replyTo: null }
  else if (path === 'admin/decisions:decide') {
    decisions.push(args[0])
    value = { changed: args[0].applicationIds.length, emails: 0 }
  } else throw new Error(`Unexpected fixture call: ${path}`)
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify({ status: 'success', value }))
})
await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve))
const picker = createServer()
await new Promise((resolve) => picker.listen(0, '127.0.0.1', resolve))
const port = picker.address().port
await new Promise((resolve) => picker.close(resolve))
const origin = `http://127.0.0.1:${port}`
const env = {
  ...process.env, NODE_ENV: 'production', PORT: String(port), INTRANET_AUTH_MODE: 'tailscale',
  INFRA_FUTURO_CONVEX_URL: `http://127.0.0.1:${fixture.address().port}`, INFRA_FUTURO_ADMIN_SECRET: 'QA_ONLY',
}
delete env.INTRANET_DEV_USER
const child = spawn(process.execPath, ['scripts/start.mjs'], { cwd: app, env, stdio: 'pipe' })
let output = ''
child.stdout.on('data', (chunk) => { output += chunk })
child.stderr.on('data', (chunk) => { output += chunk })
let browser
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output)
    try { ready = (await fetch(`${origin}/healthz`)).ok } catch { /* starting */ }
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.ok(ready, output)
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ extraHTTPHeaders: { 'Tailscale-User-Login': 'qa@github' } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${origin}/projects/infra-futuro/decisions`)
  const rows = page.locator('tbody input[type=checkbox]')
  const all = page.locator('input[type=checkbox]').first()
  const selected = () => page.locator('tbody input[type=checkbox]:checked').count()
  await rows.nth(2).waitFor()
  await rows.nth(2).click()
  await rows.nth(0).click({ modifiers: ['Shift'] })
  assert.equal(await selected(), 3, 'Shift-select must include the middle team')
  await all.click()
  await rows.nth(2).click()
  applications = [team(1), team(2)]
  await page.getByRole('button', { name: 'Actualizar decisiones' }).click()
  await page.waitForFunction(() => document.querySelectorAll('tbody input[type=checkbox]').length === 2)
  await rows.nth(0).click({ modifiers: ['Shift'] })
  assert.equal(await selected(), 2, 'A refreshed list must find the range anchor by team ID')
  applications = Array.from({ length: 101 }, (_, i) => team(i))
  await page.getByRole('button', { name: 'Actualizar decisiones' }).click()
  await rows.nth(100).waitFor()
  await page.getByRole('button', { name: 'Elegir las mejores que caben' }).click()
  assert.equal(await selected(), 100, 'Automatic selection must fit a single atomic decision')
  await rows.nth(100).click()
  assert.equal(await selected(), 100, 'Manual selection cannot add a 101st team')
  await page.getByText('Puedes elegir hasta 100 equipos por decisión.', { exact: true }).waitFor()
  await all.click()
  await rows.nth(100).click()
  await rows.nth(0).click({ modifiers: ['Shift'] })
  assert.equal(await selected(), 1, 'An oversized range must be refused without a partial selection')
  await all.click()
  assert.equal(await selected(), 100, 'Select-all must also respect the decision limit')
  await page.getByRole('button', { name: 'Aceptar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.getByText(/Listo: 100 inscripciones/).waitFor()
  assert.equal(decisions.length, 1)
  assert.equal(decisions[0].applicationIds.length, 100)
  assert.deepEqual(errors, [])
  console.log('Decision browser checks passed: range selection, refreshed anchor, automatic/manual/select-all limits, and one confirmed 100-team batch. Synthetic backend; no hosted writes or emails.')
} finally {
  await browser?.close()
  if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit') }
  fixture.closeAllConnections()
  await new Promise((resolve) => fixture.close(resolve))
}
