import { createFileRoute } from '@tanstack/react-router'
import { STATUSES, type Status } from '@convex/admin/status'
import { getMessages } from '../server/functions'
import { MessagesPage } from '../features/messages/MessagesPage'

type Search = { team?: string; member?: string; status?: Status; ref?: string }

export const Route = createFileRoute('/projects/$projectId/messages')({
  // a team's page opens this addressed to that team or member, a filtered list to that group
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.team === 'string' ? { team: search.team } : {}),
    ...(typeof search.member === 'string' ? { member: search.member } : {}),
    ...(STATUSES.includes(search.status as Status) ? { status: search.status as Status } : {}),
    ...(typeof search.ref === 'string' && search.ref ? { ref: search.ref } : {}),
  }),
  loader: ({ params }) => getMessages({ data: { projectId: params.projectId } }),
  head: () => ({ meta: [{ title: 'Correos · Infra Futuro · Intranet' }] }),
  component: MessagesRoutePage,
})

function MessagesRoutePage() {
  const { team, member, status, ref } = Route.useSearch()
  return (
    <MessagesPage
      key={member ?? team ?? 'group'}
      result={Route.useLoaderData()}
      initialStatus={status}
      initialRef={ref}
      fixedAudience={
        member
          ? { kind: 'member', memberId: member }
          : team
            ? { kind: 'team', applicationId: team }
            : undefined
      }
    />
  )
}
