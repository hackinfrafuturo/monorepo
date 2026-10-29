import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { AccessError } from './access'
import { requestAccess } from './request-access'
import { loadInfraFuturoStats } from '@intranet/integrations/infra-futuro'
import { api } from '@convex/_generated/api'
import { adminConvex } from './convex'

export const getSession = createServerFn({ method: 'GET' }).handler(() =>
  requestAccess(getRequest(), process.env, import.meta.env.DEV),
)

export const getProjectStats = createServerFn({ method: 'GET' })
  .validator((input: { projectId: string }) => {
    if (!input || typeof input.projectId !== 'string')
      throw new Error('Project is required.')
    return { projectId: input.projectId }
  })
  .handler(async ({ data }) => {
    // Recheck for each request, including direct calls and client-side navigation.
    await requestAccess(
      getRequest(),
      process.env,
      import.meta.env.DEV,
      data.projectId,
    )
    // A newly registered project must never fall through to another project's backend.
    if (data.projectId !== 'infra-futuro')
      throw new AccessError(404, 'Stats are not available for this project.')
    const baseUrl = process.env.INFRA_FUTURO_API_URL
    const token = process.env.INFRA_FUTURO_API_TOKEN
    if (!baseUrl || !token)
      return { status: 'unconfigured' as const, stats: null }
    try {
      return {
        status: 'ready' as const,
        stats: await loadInfraFuturoStats({ baseUrl, token }),
      }
    } catch {
      // Do not serialize upstream payloads, headers, or configuration to the browser.
      return { status: 'unavailable' as const, stats: null }
    }
  })

export const getProjectOverview = createServerFn({ method: 'GET' })
  .validator((input: { projectId: string }) => {
    if (!input || typeof input.projectId !== 'string')
      throw new Error('Project is required.')
    return { projectId: input.projectId }
  })
  .handler(async ({ data }) => {
    const { login } = await requestAccess(
      getRequest(),
      process.env,
      import.meta.env.DEV,
      data.projectId,
    )
    if (data.projectId !== 'infra-futuro')
      throw new AccessError(404, 'Overview is not available for this project.')
    const convex = adminConvex(process.env)
    if (!convex) return { status: 'unconfigured' as const, data: null }
    try {
      const [overview, activity] = await Promise.all([
        convex.query(api.admin.overview.get, login, {}),
        convex.query(api.admin.activity.recent, login, { limit: 10 }),
      ])
      return {
        status: 'ready' as const,
        data: { overview, activity, checkedAt: new Date().toISOString() },
      }
    } catch (error) {
      // Logged here for whoever runs the server; nothing upstream reaches the browser.
      console.error('Overview failed:', error)
      return { status: 'unavailable' as const, data: null }
    }
  })
