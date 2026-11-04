import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // pages scroll inside the shell: new pages start at the top, going back returns to where you were
    scrollToTopSelectors: ['[data-slot="content-scroll"]'],
    defaultPreload: false,
    defaultStaleTime: 0,
    defaultPreloadStaleTime: 0,
  })
}
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
