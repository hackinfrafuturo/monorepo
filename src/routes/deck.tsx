import { lazy, Suspense } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'

const DeckPage = lazy(() => import('../deck/load-deck'))

export const Route = createFileRoute('/deck')({
  component: DeckRoute,
})

function DeckRoute() {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <DeckPage />
      </Suspense>
    </ClientOnly>
  )
}
