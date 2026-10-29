import { createFileRoute } from '@tanstack/react-router'
import { getReviewQueue } from '../server/functions'
import { ReviewPage } from '../features/review/ReviewPage'

type Search = { skip?: string[] }

export const Route = createFileRoute('/projects/$projectId/review')({
  // teams skipped this session stay in the URL, so the queue moves past them until reset
  validateSearch: (search: Record<string, unknown>): Search => {
    const skip = Array.isArray(search.skip)
      ? search.skip.filter((id): id is string => typeof id === 'string').slice(0, 200)
      : []
    return skip.length ? { skip } : {}
  },
  loaderDeps: ({ search }) => ({ skip: search.skip ?? [] }),
  loader: ({ params, deps }) =>
    getReviewQueue({ data: { projectId: params.projectId, skip: deps.skip } }),
  head: () => ({ meta: [{ title: 'Revisar · Infra Futuro · Intranet' }] }),
  component: ReviewRoutePage,
})

function ReviewRoutePage() {
  const navigate = Route.useNavigate()
  const { skip = [] } = Route.useSearch()
  return (
    <ReviewPage
      result={Route.useLoaderData()}
      skipped={skip.length}
      onSkip={(id) => navigate({ search: { skip: [...skip, id] }, replace: true })}
      onResetSkips={() => navigate({ search: {}, replace: true })}
    />
  )
}
