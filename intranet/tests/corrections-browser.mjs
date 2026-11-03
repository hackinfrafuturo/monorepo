// Build the public site with VITE_CONVEX_URL set before running this suite.
// Every Convex request is intercepted; this never reads or changes hosted applications.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../../', import.meta.url))
const picker = createServer()
await new Promise((resolve) => picker.listen(0, '127.0.0.1', resolve))
const port = picker.address().port
await new Promise((resolve) => picker.close(resolve))
const origin = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: root, env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port) }, stdio: 'pipe',
})
let output = ''
child.stdout.on('data', (chunk) => { output += chunk })
child.stderr.on('data', (chunk) => { output += chunk })
const answer = 'I built a useful project and learned a lot by solving its most difficult technical problems.'
const member = {
  name: 'QA Ana', email: 'qa-ana@example.com', github: 'qa-ana', gender: 'skip', coding: 'yes',
  linkedin: '', site: '', jobs: 'no', role: 'Engineer', deep: answer, hardest: answer, favorite: answer,
  diet: 'veggie', allergies: 'QA allergy',
}
const token = 'QA_ONLY_43_CHARACTER_PRIVATE_TOKEN_1234567890'
let browser
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output)
    try { ready = (await fetch(`${origin}/corregir`)).status === 200 } catch { /* starting */ }
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.ok(ready, output)
  browser = await chromium.launch({ headless: true })
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    const calls = []
    let valid = true
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      // Fragment tokens must never be serialized into public-site URLs.
      if (request.url().startsWith(origin)) assert.equal(request.url().includes(token), false)
    })
    await page.route('https://*.convex.cloud/**', async (route) => {
      const request = route.request()
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
      assert.equal(new URL(request.url()).pathname, '/api/mutation')
      const body = request.postDataJSON()
      body.args = body.args[0]
      calls.push(body)
      assert.equal(body.args.token, token)
      assert.ok(['applicationEdits:load', 'applicationEdits:save'].includes(body.path))
      if (body.path === 'applicationEdits:save') assert.equal(body.args.member.role, 'Researcher')
      await route.fulfill({
        json: { status: 'success', value: body.path === 'applicationEdits:load' ? (valid ? member : null) : { changed: 1 } },
        headers: { 'access-control-allow-origin': '*' },
      })
    })
    await page.goto(`${origin}/corregir#${token}`)
    await page.locator('#m0-name').waitFor()
    assert.equal(await page.locator('#m0-email').inputValue(), member.email)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.locator('#m0-role').fill('Researcher')
    await page.getByRole('button', { name: /Guardar cambios|Save changes/ }).click()
    await page.getByRole('heading', { name: /Listo, gracias|Done, thank you/ }).waitFor()
    assert.equal(calls.filter((call) => call.path === 'applicationEdits:save').length, 1)
    valid = false
    await page.reload()
    await page.getByRole('heading', { name: /Este enlace ya no sirve|This link no longer works/ }).waitFor()
    assert.equal(await page.locator('#m0-email').count(), 0)
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('Correction browser checks passed: own form, mutation load/save, token isolation, invalid link, desktop/mobile, no page errors. Synthetic backend; no hosted data changed.')
} finally {
  await browser?.close()
  if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit') }
}
