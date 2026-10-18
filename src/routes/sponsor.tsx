import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { AgentationDev } from '../components/AgentationDev'
import App from '../App'

export const Route = createFileRoute('/sponsor')({
  component: SponsorRoute,
})

function SponsorRoute() {
  return (
    <ClientOnly>
      <App />
      <AgentationDev />
    </ClientOnly>
  )
}
