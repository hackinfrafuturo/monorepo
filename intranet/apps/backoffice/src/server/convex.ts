import { ConvexHttpClient } from 'convex/browser'
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from 'convex/server'

type Environment = Record<string, string | undefined>
type AdminFunction<T extends 'query' | 'mutation'> = FunctionReference<T>
/** what a caller passes: everything but the secret and the actor, which this adds */
type Args<F extends AdminFunction<'query' | 'mutation'>> = Omit<
  FunctionArgs<F>,
  'secret' | 'actor'
>

/**
 * The hackathon's typed admin API (convex/admin), server-side only. Each call carries the backoffice's
 * secret and the login of the organizer making the request, verified through Tailscale before this runs.
 * Null when the deployment isn't configured, so pages can say so instead of failing.
 */
export function adminConvex(env: Environment) {
  const url = env.INFRA_FUTURO_CONVEX_URL
  const secret = env.INFRA_FUTURO_ADMIN_SECRET?.trim()
  if (!url || !secret) return null
  const base = new URL(url)
  const local =
    base.protocol === 'http:' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
  if (base.protocol !== 'https:' && !local)
    throw new Error('Convex URL must use HTTPS.')
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/')
    throw new Error('Convex URL must be an origin.')
  const client = new ConvexHttpClient(base.origin)
  return {
    query: <F extends AdminFunction<'query'>>(
      fn: F,
      actor: string,
      args: Args<F>,
    ): Promise<FunctionReturnType<F>> =>
      client.query(fn, { ...args, secret, actor } as FunctionArgs<F>),
    mutation: <F extends AdminFunction<'mutation'>>(
      fn: F,
      actor: string,
      args: Args<F>,
    ): Promise<FunctionReturnType<F>> =>
      client.mutation(fn, { ...args, secret, actor } as FunctionArgs<F>),
  }
}
