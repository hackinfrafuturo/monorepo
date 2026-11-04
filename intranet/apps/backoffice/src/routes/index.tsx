import { createFileRoute, redirect } from '@tanstack/react-router'
import { projects } from '../projects'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // With a single event, its overview is the home page.
    if (projects.length === 1)
      throw redirect({ to: '/projects/$projectId', params: { projectId: projects[0].id } })
    throw redirect({ to: '/projects' })
  },
})
