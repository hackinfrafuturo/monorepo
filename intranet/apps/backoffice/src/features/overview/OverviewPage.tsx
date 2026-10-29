import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  AlertCircle,
  CircleCheck,
  ClipboardList,
  Clock3,
  History,
  Hourglass,
  RefreshCw,
  UsersRound,
} from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES } from '@convex/admin/status'
import { STATUS_LABELS, describeEntry, people, teamSize, teams } from '../labels'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Overview = FunctionReturnType<typeof api.admin.overview.get>
type Activity = FunctionReturnType<typeof api.admin.activity.recent>
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: { overview: Overview; activity: Activity; checkedAt: string } | null
}

const time = (iso: string | number, withDate = false) =>
  new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    ...(withDate ? { day: 'numeric', month: 'short' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

export function OverviewPage({ result }: { result: Result }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const data = result.data

  async function refresh() {
    setRefreshing(true)
    try {
      await router.invalidate()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <Breadcrumb aria-label="Ubicación actual">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects" aria-label="Volver a proyectos">
                Proyectos
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Infra Futuro</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <Badge variant="secondary">Infra Futuro · 2026</Badge>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight sm:text-3xl">
            Resumen
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Actualizar resumen"
            className="size-9 shrink-0 p-0 sm:w-auto sm:px-3"
          >
            <RefreshCw
              className={refreshing ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          En qué etapa está cada inscripción y qué hizo el equipo organizador.
        </p>
        {data && (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            Actualizado
            <time dateTime={data.checkedAt} className="tabular-nums">
              {time(data.checkedAt)}
            </time>
            <span>· Hora de Santiago</span>
          </p>
        )}
      </header>

      {data ? (
        <>
          {data.overview.truncated && (
            <Alert role="status">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>
                <h2>Los totales están incompletos</h2>
              </AlertTitle>
              <AlertDescription>
                Hay más inscripciones de las que este resumen puede contar.
              </AlertDescription>
            </Alert>
          )}

          <section
            className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 @min-[60rem]/page:grid-cols-4"
            aria-label="Totales"
          >
            <Metric
              label="Personas inscritas"
              value={data.overview.people}
              detail={teams(data.overview.applications)}
              icon={<UsersRound className="size-4 text-muted-foreground" />}
            />
            <Metric
              label="Inscripciones"
              value={data.overview.applications}
              detail="Individuales y equipos"
              icon={<ClipboardList className="size-4 text-muted-foreground" />}
            />
            <Metric
              label="Por decidir"
              value={data.overview.byStatus.pending.applications}
              detail={people(data.overview.byStatus.pending.people)}
              icon={<Hourglass className="size-4 text-muted-foreground" />}
            />
            <Metric
              label="Aceptadas"
              value={data.overview.byStatus.accepted.applications}
              detail={people(data.overview.byStatus.accepted.people)}
              icon={<CircleCheck className="size-4 text-muted-foreground" />}
            />
          </section>

          <div className="grid min-w-0 gap-4 @min-[60rem]/page:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>
                  <h2>Por estado</h2>
                </CardTitle>
                <CardDescription>
                  Cada equipo se decide completo. Abre un estado para ver sus equipos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {STATUSES.map((status) => {
                    const counts = data.overview.byStatus[status]
                    return (
                      <li key={status}>
                        <Link
                          to="/projects/$projectId/participants"
                          params={{ projectId: 'infra-futuro' }}
                          search={{ status }}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span>{STATUS_LABELS[status]}</span>
                          <span className="text-right text-muted-foreground tabular-nums">
                            <strong className="font-medium text-foreground">
                              {counts.applications}
                            </strong>{' '}
                            · {people(counts.people)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>
                  <h2>Tamaño de los equipos</h2>
                </CardTitle>
                <CardDescription>Inscripciones según cuántas personas traen.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.overview.sizes.length ? (
                  <ul className="divide-y text-sm">
                    {data.overview.sizes.map(({ size, applications }) => (
                      <li
                        key={size}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span>{teamSize(size)}</span>
                        <strong className="font-medium tabular-nums">
                          {applications}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay inscripciones.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <section aria-labelledby="activity-title" className="space-y-4">
            <div className="space-y-1">
              <h2
                id="activity-title"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight"
              >
                <History className="size-4 text-muted-foreground" aria-hidden="true" />
                Actividad reciente
              </h2>
              <p className="text-sm text-muted-foreground">
                Quién cambió qué, para tener registro.
              </p>
            </div>
            <Card>
              <CardContent>
                {data.activity.length ? (
                  <ol className="divide-y text-sm">
                    {data.activity.map((entry) => (
                      <li key={entry._id} className="space-y-1 py-3">
                        <p className="[overflow-wrap:anywhere]">
                          <span className="font-medium">{entry.actor}</span>{' '}
                          {describeEntry(entry)}
                          {entry.team.length > 0 && (
                            <>
                              {' '}· <span className="font-medium">{entry.team.join(', ')}</span>
                            </>
                          )}
                        </p>
                        <time
                          dateTime={new Date(entry._creationTime).toISOString()}
                          className="text-xs text-muted-foreground tabular-nums"
                        >
                          {time(entry._creationTime, true)}
                        </time>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    Todavía no hay actividad registrada.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Alert role="status">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h2>
              {result.status === 'unconfigured'
                ? 'Falta conectar el proyecto'
                : 'No pudimos cargar el resumen'}
            </h2>
          </AlertTitle>
          <AlertDescription>
            {result.status === 'unconfigured'
              ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
              : 'El servicio de Infra Futuro no está disponible. Intenta actualizar en un momento.'}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: number
  detail: string
  icon: React.ReactNode
}) {
  return (
    <Card className="min-w-0 gap-3 py-5">
      <CardHeader className="flex min-h-10 flex-row items-start justify-between gap-2 px-5 sm:min-h-5">
        <CardDescription className="min-w-0 text-xs sm:text-sm">
          {label}
        </CardDescription>
        <span
          className="hidden shrink-0 min-[440px]:inline-flex"
          aria-hidden="true"
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent className="space-y-2 px-5">
        <strong className="block text-4xl font-semibold tabular-nums tracking-tight">
          {value}
        </strong>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
