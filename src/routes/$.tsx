import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { HOME, legacyPath, persistLocale } from '../i18n/locale'

export const Route = createFileRoute('/$')({
  component: FallbackRoute,
})

function FallbackRoute() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/'
    const tail = `${window.location.search}${window.location.hash}`
    const legacy = legacyPath(path)

    if (legacy) {
      persistLocale(legacy.locale)
      window.location.replace(`${legacy.dest}${tail}`)
      return
    }

    window.location.replace(`${HOME}${tail}`)
  }, [])

  return (
    <main className="min-h-svh bg-[#181818] p-6 font-mono text-base text-[#d6d4d0]">
      Redirecting…
    </main>
  )
}
