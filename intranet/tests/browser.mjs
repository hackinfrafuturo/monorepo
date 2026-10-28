import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const app = fileURLToPath(new URL('../apps/backoffice/', import.meta.url))
const token = 'QA_ONLY_NEVER_A_REAL_BACKEND_TOKEN'
const longName = `QA-${'LongName'.repeat(14)}`
let mode = 'ready'
let backendRequests = 0
const fixture = createServer((request, response) => {
  backendRequests++
  assert.equal(request.headers.authorization, `Bearer ${token}`)
  response.setHeader('Content-Type', 'application/json')
  if (mode === 'error') {
    response.writeHead(503)
    response.end('private upstream failure')
    return
  }
  const url = new URL(request.url, 'http://localhost')
  assert.equal(url.pathname, '/api/participants')
  const person = (id, applicationId, name, time) => ({
    _id: id,
    applicationId,
    name,
    _creationTime: time,
    email: 'PRIVATE_QA_EMAIL@example.com',
    allergies: 'PRIVATE_QA_ALLERGY',
  })
  const page =
    mode === 'empty'
      ? []
      : url.searchParams.has('cursor')
        ? [person('c', 'team-2', 'QA Camila', 30)]
        : [
            person('a', 'team-1', 'QA Ana', 10),
            person('b', 'team-1', 'QA Bruno', 20),
          ]
  if (mode === 'layout' && !url.searchParams.has('cursor')) {
    page[1].name = longName
    page.push(
      ...Array.from({ length: 20 }, (_, index) =>
        person(
          `extra-${index}`,
          `team-extra-${index}`,
          `QA Persona ${index + 1}`,
          100 + index,
        ),
      ),
    )
  }
  const done = mode === 'empty' || url.searchParams.has('cursor')
  response.end(
    JSON.stringify({ page, isDone: done, continueCursor: done ? '' : 'next' }),
  )
})
await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve))
const portPicker = createServer()
await new Promise((resolve) => portPicker.listen(0, '127.0.0.1', resolve))
const port = portPicker.address().port
await new Promise((resolve) => portPicker.close(resolve))
const origin = `http://127.0.0.1:${port}`
const env = {
  ...process.env,
  NODE_ENV: 'production',
  INTRANET_AUTH_MODE: 'tailscale',
  PORT: String(port),
  INFRA_FUTURO_API_URL: `http://127.0.0.1:${fixture.address().port}`,
  INFRA_FUTURO_API_TOKEN: token,
}
delete env.INTRANET_DEV_USER
const child = spawn(process.execPath, ['scripts/start.mjs'], {
  cwd: app,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
child.stdout.on('data', (chunk) => {
  output += chunk
})
child.stderr.on('data', (chunk) => {
  output += chunk
})
let browser
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error(`Production server exited: ${output}`)
    try {
      ready =
        (await fetch(`${origin}/stats`, { redirect: 'manual' })).status === 401
    } catch {
      /* starting */
    }
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.ok(ready, `Production server did not become ready: ${output}`)
  assert.equal(backendRequests, 0)
  const health = await fetch(`${origin}/healthz`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok' })
  const anotherMember = await fetch(`${origin}/projects/infra-futuro/stats`, {
    headers: { 'Tailscale-User-Login': 'another-member@github' },
  })
  assert.equal(anotherMember.status, 200)
  assert.ok(backendRequests > 0)

  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    extraHTTPHeaders: { 'Tailscale-User-Login': 'qa-organizer@example.com' },
  })
  const page = await context.newPage()
  const errors = []
  const urls = []
  const rpcCalls = []
  const bodies = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydration|hydrating|Invalid hook call/i.test(message.text())
    )
      errors.push(message.text())
  })
  page.on('request', (request) => {
    urls.push(request.url())
    if (request.url().includes('/_serverFn/'))
      rpcCalls.push({ url: request.url(), headers: request.headers() })
  })
  page.on('response', async (response) => {
    try {
      bodies.push(await response.text())
    } catch {
      /* redirect */
    }
  })
  const response = await page.goto(`${origin}/stats`)
  assert.ok(page.url().endsWith('/projects/infra-futuro/stats'))
  assert.equal(response.status(), 200)
  assert.match(response.headers()['cache-control'], /no-store/)
  await page
    .getByRole('heading', { name: 'Inscripciones', exact: true })
    .waitFor()
  try {
    await page
      .getByText('QA Camila', { exact: true })
      .waitFor({ timeout: 5000 })
  } catch (error) {
    console.error({
      backendRequests,
      page: await page.locator('body').innerText(),
      server: output,
    })
    throw error
  }
  assert.equal(
    await page
      .getByRole('region', { name: 'Totales de inscripción' })
      .locator('strong')
      .allTextContents()
      .then((values) => values.join(',')),
    '3,2',
  )
  assert.equal(
    await page
      .getByRole('list', { name: 'Inscripciones', exact: true })
      .locator(':scope > li')
      .count(),
    2,
  )
  assert.ok(backendRequests >= 2)
  await page.screenshot({
    path: '/tmp/intranet-stats-desktop.png',
    fullPage: true,
  })

  const search = page.getByRole('searchbox', { name: 'Buscar por nombre' })
  await search.fill('Camila')
  assert.equal(
    await page
      .getByRole('list', { name: 'Inscripciones', exact: true })
      .locator(':scope > li')
      .count(),
    1,
  )
  assert.equal(await page.getByText('QA Ana', { exact: true }).count(), 0)
  await search.fill('No matching person')
  await page.getByText('No encontramos postulantes con ese nombre.').waitFor()
  await search.fill('')

  mode = 'empty'
  await page.getByRole('button', { name: /Actualizar/ }).click()
  await page.getByText('Todavía no hay inscripciones.').waitFor()
  assert.equal(
    await page
      .getByRole('region', { name: 'Totales de inscripción' })
      .locator('strong')
      .allTextContents()
      .then((values) => values.join(',')),
    '0,0',
  )
  mode = 'error'
  await page.getByRole('button', { name: /Actualizar/ }).click()
  await page
    .getByRole('heading', { name: 'No pudimos cargar las inscripciones' })
    .waitFor()
  assert.equal(
    await page
      .getByRole('region', { name: 'Totales de inscripción' })
      .locator('strong')
      .count(),
    0,
  )
  mode = 'ready'
  await page.getByRole('button', { name: /Actualizar/ }).click()
  await page.getByText('QA Camila', { exact: true }).waitFor()
  const rpcCall = rpcCalls.at(-1)
  assert.ok(rpcCall, 'Refresh must exercise the real server function HTTP path')
  const anonymousHeaders = { ...rpcCall.headers }
  delete anonymousHeaders['tailscale-user-login']
  const before = backendRequests
  assert.equal((await fetch(rpcCall.url, { headers: anonymousHeaders })).status, 401)
  assert.equal(backendRequests, before)
  assert.equal(
    (
      await fetch(rpcCall.url, {
        headers: { ...anonymousHeaders, 'Tailscale-User-Login': 'another-member@github' },
      })
    ).status,
    200,
  )
  assert.ok(backendRequests > before)

  async function chooseTheme(label, expected) {
    await page.getByRole('button', { name: 'Cambiar tema' }).click()
    await page.getByRole('menuitemradio', { name: label, exact: true }).click()
    await page.waitForFunction(
      (theme) => document.documentElement.classList.contains(theme),
      expected,
    )
  }
  await chooseTheme('Oscuro', 'dark')
  await page.reload()
  await page.getByText('QA Camila', { exact: true }).waitFor()
  assert.equal(
    await page.locator('html').getAttribute('class'),
    'dark',
    'Saved theme must survive reload',
  )
  await chooseTheme('Sistema', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('dark'),
  )
  await chooseTheme('Claro', 'light')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
  assert.equal(
    await page.locator('html').getAttribute('class'),
    'light',
    'Explicit light preference overrides system changes',
  )

  mode = 'layout'
  await page.getByRole('button', { name: /Actualizar/ }).click()
  await page.getByText(longName, { exact: true }).waitFor()
  for (const [label, theme] of [
    ['Claro', 'light'],
    ['Oscuro', 'dark'],
  ]) {
    await chooseTheme(label, theme)
    for (const width of [320, 390, 640, 768, 800, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      )
      const layout = await page.evaluate(() => {
        const scroller = document.querySelector('[data-slot="content-scroll"]')
        scroller.scrollTop = 0
        const cards = [
          ...document.querySelectorAll(
            'section[aria-label="Totales de inscripción"] [data-slot="card"]',
          ),
        ]
        const bounds = cards.map((card) => ({
          y: card.getBoundingClientRect().top,
          numberY: card.querySelector('strong').getBoundingClientRect().top,
        }))
        const heading = document.querySelector('h1').getBoundingClientRect()
        const header = document
          .querySelector('[data-slot="app-header"]')
          .getBoundingClientRect()
        return {
          overflow:
            document.documentElement.scrollWidth > innerWidth ||
            scroller.scrollWidth > scroller.clientWidth,
          bounds,
          headingBelowBar: heading.top >= header.bottom,
          scrolls: scroller.scrollHeight > scroller.clientHeight,
        }
      })
      assert.equal(
        layout.overflow,
        false,
        `${theme} ${width}px must not scroll horizontally`,
      )
      assert.equal(
        layout.headingBelowBar,
        true,
        'Page title cannot be clipped by the top bar',
      )
      assert.equal(
        layout.scrolls,
        true,
        'Long lists scroll inside the content area',
      )
      if (layout.bounds[0].y === layout.bounds[1].y)
        assert.ok(
          Math.abs(layout.bounds[0].numberY - layout.bounds[1].numberY) < 1,
          `${width}px totals must align`,
        )
      assert.equal(
        await page
          .getByText(longName, { exact: true })
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
        true,
        'Long names wrap inside their cards',
      )
      await page
        .getByRole('region', { name: 'Contenido del proyecto' })
        .evaluate((element) => {
          element.scrollTop = element.scrollHeight
        })
      const headerVisible = await page
        .getByRole('button', { name: 'Cambiar tema' })
        .evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return (
            rect.top >= 0 &&
            rect.bottom <= innerHeight &&
            element.contains(
              document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              ),
            )
          )
        })
      assert.equal(
        headerVisible,
        true,
        'Theme controls must stay visible and clickable after scrolling',
      )
      await page
        .getByRole('region', { name: 'Contenido del proyecto' })
        .evaluate((element) => {
          element.scrollTop = 0
        })
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `/tmp/intranet-${theme}-${width === 1440 ? 'desktop' : 'mobile'}.png`,
        })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: '/tmp/intranet-stats-mobile.png',
    fullPage: true,
  })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.getByRole('button', { name: 'Abrir o cerrar navegación' }).click()
  const mobileNavigation = page.getByRole('dialog', { name: 'Navegación' })
  await mobileNavigation.waitFor()
  await page.keyboard.press('Escape')
  await mobileNavigation.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Abrir o cerrar navegación' }).click()
  await mobileNavigation
    .getByRole('link', { name: 'Todos los proyectos' })
    .click()
  await mobileNavigation.waitFor({ state: 'hidden' })
  await page.getByRole('heading', { name: 'Proyectos', exact: true }).waitFor()
  await page.getByRole('link', { name: /Ver inscripciones/ }).click()
  await page.getByText('QA Ana', { exact: true }).waitFor()
  assert.deepEqual(errors, [])
  assert.ok(
    urls.every((url) => url.startsWith(origin)),
    'Browser must not talk to the backend directly',
  )
  for (const secret of [
    token,
    'PRIVATE_QA_EMAIL',
    'PRIVATE_QA_ALLERGY',
    'private upstream failure',
  ]) {
    assert.equal(
      bodies.some((body) => body.includes(secret)),
      false,
      `${secret} must not reach a browser response`,
    )
  }
  for (const file of await readdir(`${app}/.output/public/assets`)) {
    if (!file.endsWith('.js')) continue
    const source = await readFile(
      `${app}/.output/public/assets/${file}`,
      'utf8',
    )
    assert.equal(source.includes('INFRA_FUTURO_API_TOKEN'), false)
    assert.equal(source.includes('loadInfraFuturoStats'), false)
  }
  // Exercise the compiled AWS listener mode too; header forgery must not reach the backend.
  const awsPortPicker = createServer()
  await new Promise((resolve) => awsPortPicker.listen(0, '127.0.0.1', resolve))
  const awsPort = awsPortPicker.address().port
  await new Promise((resolve) => awsPortPicker.close(resolve))
  const awsOrigin = `http://127.0.0.1:${awsPort}`
  const awsChild = spawn(process.execPath, ['scripts/start.mjs'], {
    cwd: app,
    env: {
      ...env,
      PORT: String(awsPort),
      INTRANET_AUTH_MODE: 'tailscale-alb',
      INTRANET_IDENTITY_URL: 'http://10.203.0.10:3101/identity',
    },
    stdio: 'ignore',
  })
  try {
    let awsReady = false
    for (let i = 0; i < 100; i++) {
      if (awsChild.exitCode !== null) break
      try {
        awsReady = (await fetch(`${awsOrigin}/healthz`)).status === 200
      } catch {
        /* starting */
      }
      if (awsReady) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.ok(awsReady, 'Compiled ALB mode must start and pass liveness checks')
    const beforeAws = backendRequests
    for (const headers of [
      {},
      {
        'Tailscale-User-Login': 'qa-organizer@example.com',
        'x-amzn-oidc-identity': 'forged',
      },
      { 'x-forwarded-for': '100.99.99.99, 203.0.113.1' },
    ]) {
      assert.equal((await fetch(`${awsOrigin}/stats`, { headers })).status, 401)
    }
    assert.equal(
      backendRequests,
      beforeAws,
      'AWS header forgery cannot read registrations',
    )
  } finally {
    if (awsChild.exitCode === null) {
      awsChild.kill('SIGTERM')
      await once(awsChild, 'exit')
    }
  }
  console.log(
    'Production browser checks passed: access, pagination, search, refresh, empty/error states, mobile, persisted/system themes, scrolling header, responsive layouts, and secret isolation.',
  )
  console.log(
    'Synthetic QA screenshots: /tmp/intranet-stats-desktop.png and /tmp/intranet-stats-mobile.png',
  )
} finally {
  await browser?.close()
  if (child.exitCode === null) {
    child.kill('SIGTERM')
    await once(child, 'exit')
  }
  await new Promise((resolve) => fixture.close(resolve))
}
