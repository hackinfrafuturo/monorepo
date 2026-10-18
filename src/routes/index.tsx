import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { AgentationDev } from '../components/AgentationDev'
import Home from '../Home'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

function HomeRoute() {
  return (
    <ClientOnly>
      <Home />
      <AgentationDev />
    </ClientOnly>
  )
}
