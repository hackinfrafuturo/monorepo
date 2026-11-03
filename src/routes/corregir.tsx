import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import Correct from '../Correct'

export const Route = createFileRoute('/corregir')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] }),
  component: CorrectRoute,
})

function CorrectRoute() {
  return (
    <ClientOnly>
      <Correct />
    </ClientOnly>
  )
}
