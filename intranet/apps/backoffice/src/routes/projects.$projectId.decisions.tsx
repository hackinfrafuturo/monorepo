import { createFileRoute } from '@tanstack/react-router'
import { STATUSES, type Status } from '@convex/admin/status'
import { getDecisionBoard } from '../server/functions'
import { DecisionsPage } from '../features/decisions/DecisionsPage'

export const Route = createFileRoute('/projects/$projectId/decisions')({
  // which status the board shows; pending unless the URL says otherwise
  validateSearch: (search: Record<string, unknown>): { status?: Status } => {
    const status = STATUSES.find((s) => s === search.status)
    return status && status !== 'pending' ? { status } : {}
  },
  staleTime: 15_000,
  loader: ({ params }) => getDecisionBoard({ data: { projectId: params.projectId } }),
  head: () => ({ meta: [{ title: 'Decisiones · Infra Futuro · Intranet' }] }),
  component: DecisionsRoutePage,
})

function DecisionsRoutePage() {
  const navigate = Route.useNavigate()
  const { status = 'pending' } = Route.useSearch()
  return (
    <DecisionsPage
      result={Route.useLoaderData()}
      status={status}
      onStatus={(next) =>
        navigate({ search: next === 'pending' ? {} : { status: next }, replace: true })
      }
    />
  )
}
