import { isIP } from 'node:net'
import { AccessError, authorizeIdentity, requireAccess } from './access.ts'

type Environment = Record<string, string | undefined>

export function tailscaleClientIp(request: Request) {
  // The app security group accepts only our ALB. Trust only its final appended
  // address, never a client-supplied identity or earlier forwarded address.
  const ip = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  if (!ip || isIP(ip) !== 4) throw new AccessError(401, 'Connect through Tailscale.')
  const [first, second] = ip.split('.').map(Number)
  if (first !== 100 || second < 64 || second > 127)
    throw new AccessError(401, 'Connect through Tailscale.')
  return ip
}

export async function requestAccess(
  request: Request,
  env: Environment,
  development = false,
  projectId?: string,
  fetcher: typeof fetch = fetch,
) {
  if (!development && env.INTRANET_DEV_USER)
    throw new AccessError(503, 'Development identity is disabled in production.')
  const mode = env.INTRANET_AUTH_MODE ?? 'tailscale'
  if (mode === 'tailscale') return requireAccess(request, env, development, projectId)
  if (mode !== 'tailscale-alb') throw new AccessError(503, 'Unknown authentication mode.')
  const ip = tailscaleClientIp(request)
  let endpoint: URL
  try {
    endpoint = new URL(env.INTRANET_IDENTITY_URL ?? '')
    // Server-only configuration points to the private router. No client-selected
    // endpoint, credentials, or redirects may participate in the identity check.
    if (endpoint.protocol !== 'http:' || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash || endpoint.pathname !== '/identity' ||
        isIP(endpoint.hostname) !== 4 || !endpoint.hostname.startsWith('10.') ||
        endpoint.port !== '3101') throw new Error('Invalid identity endpoint')
  } catch {
    throw new AccessError(503, 'Tailscale identity is not configured.')
  }
  endpoint.searchParams.set('ip', ip)
  let response: Response
  try {
    response = await fetcher(endpoint, { signal: AbortSignal.timeout(3000), redirect: 'error', cache: 'no-store' })
  } catch {
    throw new AccessError(503, 'Tailscale identity is unavailable.')
  }
  if ([401, 403, 404].includes(response.status))
    throw new AccessError(401, 'A personal Tailscale identity is required.')
  if (!response.ok) throw new AccessError(503, 'Tailscale identity is unavailable.')
  let identity: { login?: unknown; ip?: unknown }
  try { identity = await response.json() } catch {
    throw new AccessError(503, 'Tailscale identity is unavailable.')
  }
  if (identity?.ip !== ip || typeof identity.login !== 'string' ||
      !identity.login.trim() || /\s|,/.test(identity.login))
    throw new AccessError(401, 'A personal Tailscale identity is required.')
  return authorizeIdentity(identity.login.trim().toLowerCase(), projectId)
}
