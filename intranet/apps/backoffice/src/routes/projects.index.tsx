import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { getSession } from '../server/functions'
import { PageHeader } from '@/components/page'

export const Route = createFileRoute('/projects/')({
  loader: () => getSession(),
  component: Projects,
})
function Projects() {
  const { projects } = Route.useLoaderData()
  return (
    <>
      <PageHeader
        kicker="Espacio de trabajo"
        title="Proyectos"
        description="Información y herramientas de cada proyecto."
      />
      <ul className="divide-y border-t border-foreground">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="group flex items-center justify-between gap-4 px-1 py-4 transition-colors duration-75 hover:bg-foreground hover:text-background"
            >
              <span className="min-w-0">
                <span className="block font-pixel text-2xl leading-tight">{project.name}</span>
                <span className="block text-sm opacity-70">{project.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm">
                Abrir proyecto
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
