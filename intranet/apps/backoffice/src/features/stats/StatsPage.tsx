import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  AlertCircle,
  ClipboardList,
  Clock3,
  RefreshCw,
  Search,
  UsersRound,
} from 'lucide-react'
import type { RegistrationStats } from '@intranet/integrations/infra-futuro'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  stats: RegistrationStats | null
}

export function StatsPage({ result }: { result: Result }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const stats = result.stats
  const groups =
    stats?.groups.filter((group) =>
      group.members.some((name) =>
        name
          .toLocaleLowerCase('es')
          .includes(search.trim().toLocaleLowerCase('es')),
      ),
    ) ?? []

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
            Inscripciones
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Actualizar inscripciones"
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
          Postulantes y equipos inscritos en la hackathon.
        </p>
        {stats && (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            Actualizado
            <time dateTime={stats.checkedAt} className="tabular-nums">
              {new Intl.DateTimeFormat('es-CL', {
                timeZone: 'America/Santiago',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date(stats.checkedAt))}
            </time>
            <span>· Hora de Santiago</span>
          </p>
        )}
      </header>

      {stats ? (
        <>
          <section
            className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2"
            aria-label="Totales de inscripción"
          >
            <Metric
              label="Personas inscritas"
              value={stats.applicants}
              detail="Total de participantes"
              icon={<UsersRound className="size-4 text-muted-foreground" />}
            />
            <Metric
              label="Inscripciones"
              value={stats.submissions}
              detail="Individuales y equipos"
              icon={<ClipboardList className="size-4 text-muted-foreground" />}
            />
          </section>

          <section aria-labelledby="groups-title" className="space-y-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h2
                  id="groups-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Equipos y postulantes
                </h2>
                <p className="text-sm text-muted-foreground">
                  {stats.submissions} inscripciones en total
                </p>
              </div>
              <div className="relative w-full min-w-0 sm:w-64 sm:shrink-0">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  aria-label="Buscar por nombre"
                  placeholder="Buscar por nombre…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {groups.length ? (
              <ol
                className="grid min-w-0 gap-4 @min-[38rem]/page:grid-cols-2"
                aria-label="Inscripciones"
              >
                {groups.map((group) => (
                  <li key={group.id} className="min-w-0">
                    <Card className="h-full min-w-0 gap-4">
                      <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle className="min-w-0">
                          <h3 className="text-sm font-medium">
                            Inscripción{' '}
                            {String(group.submission).padStart(2, '0')}
                          </h3>
                        </CardTitle>
                        <Badge variant="secondary">
                          {group.members.length}{' '}
                          {group.members.length === 1 ? 'persona' : 'personas'}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <Separator className="mb-4" />
                        <ul className="space-y-3">
                          {group.members.map((name, index) => (
                            <li
                              key={index}
                              className="flex min-w-0 items-center gap-3 text-sm"
                            >
                              <Avatar size="sm" aria-hidden="true">
                                <AvatarFallback>
                                  {name
                                    .trim()
                                    .split(/\s+/)
                                    .slice(0, 2)
                                    .map((part) => part[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 [overflow-wrap:anywhere]">
                                {name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ol>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  {stats.submissions
                    ? 'No encontramos postulantes con ese nombre.'
                    : 'Todavía no hay inscripciones.'}
                </CardContent>
              </Card>
            )}
          </section>
        </>
      ) : (
        <Alert role="status">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h2>
              {result.status === 'unconfigured'
                ? 'Falta conectar el proyecto'
                : 'No pudimos cargar las inscripciones'}
            </h2>
          </AlertTitle>
          <AlertDescription>
            {result.status === 'unconfigured'
              ? 'Configura la conexión a Infra Futuro en el servidor de la intranet.'
              : 'El servicio de inscripciones no está disponible. Intenta actualizar en un momento.'}
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
