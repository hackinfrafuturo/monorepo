import { createFileRoute } from '@tanstack/react-router'
import { getProjectStats } from '../server/functions'
import { StatsPage } from '../features/stats/StatsPage'

export const Route = createFileRoute('/projects/$projectId/stats')({
  loader: ({ params }) =>
    getProjectStats({ data: { projectId: params.projectId } }),
  head: () => ({
    meta: [{ title: 'Inscripciones · Infra Futuro · Intranet' }],
  }),
  component: StatsRoutePage,
})

function StatsRoutePage() {
  return <StatsPage result={Route.useLoaderData()} />
}
