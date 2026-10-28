import { projects } from '../projects.ts'

type Environment = Record<string, string | undefined>
export class AccessError extends Error {
  status: 401 | 404 | 503
  constructor(status: 401 | 404 | 503, message: string) {
    super(message)
    this.status = status
  }
}

export function readIdentity(
  request: Request,
  env: Environment,
  development = false,
) {
  if (!development && env.INTRANET_DEV_USER)
    throw new AccessError(
      503,
      'Development identity is disabled in production.',
    )
  const login = (
    development && env.INTRANET_DEV_USER
      ? env.INTRANET_DEV_USER
      : request.headers.get('Tailscale-User-Login')
  )
    ?.trim()
    .toLowerCase()
  if (!login || login.includes(',') || /\s/.test(login))
    throw new AccessError(
      401,
      'Connect through Tailscale Serve to open the intranet.',
    )
  return login
}

export function requireAccess(
  request: Request,
  env: Environment,
  development = false,
  projectId?: string,
) {
  const login = readIdentity(request, env, development)
  return authorizeIdentity(login, projectId)
}

export function authorizeIdentity(login: string, projectId?: string) {
  if (!login || login.includes(',') || /\s/.test(login))
    throw new AccessError(401, 'A verified Tailscale identity is required.')
  if (projectId && !projects.some((project) => project.id === projectId))
    throw new AccessError(404, 'Project not found.')
  return {
    login,
    // Tailnet membership grants every registered app, including future apps.
    projects: projects.map(({ id, name, description, statsPath }) => ({
      id, name, description, statsPath,
    })),
  }
}
