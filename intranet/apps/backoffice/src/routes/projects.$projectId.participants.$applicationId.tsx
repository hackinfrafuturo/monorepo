import { createFileRoute } from '@tanstack/react-router'
import { getApplication } from '../server/functions'
import { ApplicationPage } from '../features/participants/ApplicationPage'

export const Route = createFileRoute(
  '/projects/$projectId/participants/$applicationId',
)({
  loader: ({ params }) =>
    getApplication({
      data: { projectId: params.projectId, applicationId: params.applicationId },
    }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${
          loaderData?.data?.members.map((member) => member.name).join(', ') ??
          'Inscripción'
        } · Infra Futuro · Intranet`,
      },
    ],
  }),
  component: ApplicationRoutePage,
})

function ApplicationRoutePage() {
  return <ApplicationPage result={Route.useLoaderData()} />
}
