import { createFileRoute } from '@tanstack/react-router'
import { getMessages } from '../server/functions'
import { MessagesPage } from '../features/messages/MessagesPage'

type Search = { team?: string; member?: string }

export const Route = createFileRoute('/projects/$projectId/messages')({
  // a team's page opens this addressed to that team, or to one of its members
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.team === 'string' ? { team: search.team } : {}),
    ...(typeof search.member === 'string' ? { member: search.member } : {}),
  }),
  loader: ({ params }) => getMessages({ data: { projectId: params.projectId } }),
  head: () => ({ meta: [{ title: 'Correos · Infra Futuro · Intranet' }] }),
  component: MessagesRoutePage,
})

function MessagesRoutePage() {
  const { team, member } = Route.useSearch()
  return (
    <MessagesPage
      key={member ?? team ?? 'group'}
      result={Route.useLoaderData()}
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
