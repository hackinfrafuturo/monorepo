import { createFileRoute } from '@tanstack/react-router'
import { getApplications } from '../server/functions'
import { ParticipantsPage } from '../features/participants/ParticipantsPage'
import { parseFilters } from '../features/participants/filters'

export const Route = createFileRoute('/projects/$projectId/participants/')({
  validateSearch: parseFilters,
  // filters live in the URL; changing them shouldn't refetch every team on each keystroke
  staleTime: 15_000,
  loader: ({ params }) =>
    getApplications({ data: { projectId: params.projectId } }),
  head: () => ({
    meta: [{ title: 'Participantes · Infra Futuro · Intranet' }],
  }),
  component: ParticipantsRoutePage,
})

function ParticipantsRoutePage() {
  const navigate = Route.useNavigate()
  return (
    <ParticipantsPage
      result={Route.useLoaderData()}
      filters={Route.useSearch()}
      // filtering never reloads the list, and typing doesn't fill the back button
      onFilters={(search) => navigate({ search, replace: true })}
    />
  )
}
