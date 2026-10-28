import { createFileRoute, redirect } from '@tanstack/react-router'
// Private compatibility link for the first migrated feature.
export const Route = createFileRoute('/stats')({
  beforeLoad: () => {
    throw redirect({
      to: '/projects/$projectId/stats',
      params: { projectId: 'infra-futuro' },
    })
  },
})
