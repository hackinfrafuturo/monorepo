import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { getSession } from '../server/functions'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { ThemeProvider } from 'next-themes'
import '../styles.css'

export const Route = createRootRoute({
  loader: () => getSession(),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'robots', content: 'noindex, nofollow' },
      { title: 'Intranet' },
    ],
  }),
  component: Root,
  errorComponent: () => (
    <main className="space-y-4 p-8">
      <h1 className="text-2xl font-semibold">No pudimos abrir esta página</h1>
      <p className="text-muted-foreground">
        Verifica tu acceso e intenta de nuevo.
      </p>
      <Button asChild variant="outline">
        <a href="/projects">Volver a proyectos</a>
      </Button>
    </main>
  ),
  notFoundComponent: () => (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Button asChild variant="outline">
        <Link to="/projects">Volver a proyectos</Link>
      </Button>
    </section>
  ),
  shellComponent: ({ children }) => (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          storageKey="intranet-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  ),
})

function Root() {
  const session = Route.useLoaderData()
  return (
    <AppShell session={session}>
      <Outlet />
    </AppShell>
  )
}
