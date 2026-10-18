import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import Flag from '../Flag'

export const Route = createFileRoute('/flag')({
  component: FlagRoute,
})

function FlagRoute() {
  return (
    <ClientOnly>
      <Flag />
    </ClientOnly>
  )
}
