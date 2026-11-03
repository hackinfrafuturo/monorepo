import { createFileRoute } from '@tanstack/react-router'
import { STATUSES, type Status } from '@convex/admin/status'
import { getInsights } from '../server/functions'
import { InsightsPage } from '../features/insights/InsightsPage'

export const Route = createFileRoute('/projects/$projectId/insights')({
  validateSearch: (search: Record<string, unknown>): { status?: Status } => {
    const status = STATUSES.find((s) => s === search.status)
    return status ? { status } : {}
  },
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ params, deps }) =>
    getInsights({ data: { projectId: params.projectId, status: deps.status } }),
  head: () => ({ meta: [{ title: 'Estadísticas · Infra Futuro · Intranet' }] }),
  component: InsightsRoutePage,
})

function InsightsRoutePage() {
  const navigate = Route.useNavigate()
  return (
    <InsightsPage
      result={Route.useLoaderData()}
      status={Route.useSearch().status}
      onStatus={(status) => navigate({ search: status ? { status } : {}, replace: true })}
    />
  )
}
