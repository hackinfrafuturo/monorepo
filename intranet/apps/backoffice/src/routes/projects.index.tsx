import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight, FolderKanban } from 'lucide-react'
import { getSession } from '../server/functions'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/projects/')({
  loader: () => getSession(),
  component: Projects,
})
function Projects() {
  const { projects } = Route.useLoaderData()
  return (
    <>
      <header className="space-y-2">
        <Badge variant="secondary">Espacio de trabajo</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
        <p className="text-sm text-muted-foreground">
          Información y herramientas de cada proyecto.
        </p>
      </header>
      <div className="grid min-w-0 gap-4 @min-[38rem]/page:grid-cols-2 @min-[60rem]/page:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to="/projects/$projectId/stats"
            params={{ projectId: project.id }}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:border-ring">
              <CardHeader>
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <FolderKanban className="size-5" aria-hidden="true" />
                </span>
                <CardTitle>
                  <h2>{project.name}</h2>
                </CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Inscripciones</Badge>
              </CardContent>
              <CardFooter className="mt-auto justify-between text-sm">
                Ver inscripciones{' '}
                <ArrowUpRight
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
