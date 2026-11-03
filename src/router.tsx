import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    // The deck scrolls its own slide track and rewrites the URL hash on every
    // slide change. Each rewrite reloads the router, and restoring scroll then
    // snaps the track back to a stale slide.
    scrollRestoration: ({ location }) => location.pathname !== '/deck',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
