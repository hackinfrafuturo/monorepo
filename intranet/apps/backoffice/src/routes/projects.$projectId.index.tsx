import { createFileRoute } from '@tanstack/react-router'
import { getProjectOverview } from '../server/functions'
import { OverviewPage } from '../features/overview/OverviewPage'

export const Route = createFileRoute('/projects/$projectId/')({
  loader: ({ params }) =>
    getProjectOverview({ data: { projectId: params.projectId } }),
  head: () => ({
    meta: [{ title: 'Resumen · Infra Futuro · Intranet' }],
  }),
  component: OverviewRoutePage,
})

function OverviewRoutePage() {
  return <OverviewPage result={Route.useLoaderData()} />
}
