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
            'La hackathon más grande de Chile. 24 horas, ~500 personas, infraestructura que un agente pueda usar de verdad. Santiago, 5 y 6 de diciembre de 2026.',
        },
        { title: 'Hack Infra Futuro 2026' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: pageUrl },
        { property: 'og:locale', content: 'es_CL' },
        { property: 'og:locale:alternate', content: 'en_US' },
        {
          property: 'og:title',
          content: 'Hack Infra Futuro 2026 — La hackathon más grande de Chile',
        },
        {
          property: 'og:description',
          content:
            'La hackathon más grande de Chile. 24 horas, ~500 personas, infraestructura que un agente pueda usar de verdad. Santiago, 5 y 6 de diciembre de 2026.',
        },
        {
          property: 'og:image',
          content: 'https://hackinfrafuturo.cl/og.webp',
        },
        {
          property: 'og:image:secure_url',
          content: 'https://hackinfrafuturo.cl/og.webp',
        },
        { property: 'og:image:type', content: 'image/webp' },
        { property: 'og:image:width', content: '2400' },
        { property: 'og:image:height', content: '1260' },
        {
          property: 'og:image:alt',
          content:
            'Hack Infra Futuro 2026. La hackathon más grande de Chile. 5 y 6 de diciembre, Santiago.',
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:image',
          content: 'https://hackinfrafuturo.cl/og.webp',
        },
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
