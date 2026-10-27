import type { ReactNode } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import '../index.css'

export const Route = createRootRoute({
  head: ({ matches }) => {
    const pageUrl = `https://hackinfrafuturo.cl${matches.at(-1)?.pathname ?? '/'}`
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#181818' },
        { name: 'color-scheme', content: 'dark' },
        {
          name: 'description',
          content:
            '24 hours, about 500 people, infrastructure agents can actually use. Santiago, 5-6 Dec 2026.',
        },
        { title: 'Infrastructure Hackathon' },
      ],
      links: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'canonical', href: pageUrl },
        { rel: 'alternate', hrefLang: 'en', href: pageUrl },
        { rel: 'alternate', hrefLang: 'es', href: pageUrl },
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: pageUrl,
        },
      ],
    }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
