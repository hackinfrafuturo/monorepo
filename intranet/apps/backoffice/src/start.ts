import { createMiddleware, createStart } from '@tanstack/react-start'

const access = createMiddleware().server(async ({ request, next }) => {
  const { AccessError } = await import('./server/access')
  const { requestAccess } = await import('./server/request-access')
  if (
    new URL(request.url).pathname === '/healthz' &&
    ['GET', 'HEAD'].includes(request.method)
  ) {
    return new Response(request.method === 'HEAD' ? null : '{"status":"ok"}', {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }
  let response: Response
  try {
    await requestAccess(request, process.env, import.meta.env.DEV)
    const result = await next()
    response = result.response
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.append('Vary', 'Tailscale-User-Login, X-Forwarded-For')
    return result
  } catch (error) {
    if (!(error instanceof AccessError)) throw error
    return new Response(error.message, {
      status: error.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [access],
}))
