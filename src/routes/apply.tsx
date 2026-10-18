import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { AgentationDev } from '../components/AgentationDev'
import Apply from '../Apply'

export const Route = createFileRoute('/apply')({
  component: ApplyRoute,
})

function ApplyRoute() {
  return (
    <ClientOnly>
      <Apply />
      <AgentationDev />
    </ClientOnly>
  )
}
