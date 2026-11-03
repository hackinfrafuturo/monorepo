import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { AlertCircle, ChevronRight, RefreshCw, Search } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES } from '@convex/admin/status'
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
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { STATUS_LABELS, santiago, teamSize, teams } from '../labels'
import { StatusBadge } from './StatusBadge'
import type { Filters } from './filters'

type List = FunctionReturnType<typeof api.admin.applications.list>
type Application = List['applications'][number]
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: List | null
}

/** lowercase without accents, so "munoz" finds "Muñoz" */
const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es')

function matches(application: Application, filters: Filters) {
  if (filters.status && application.status !== filters.status) return false
  if (filters.size && application.size !== filters.size) return false
  if (filters.ref && application.ref !== filters.ref) return false
  const q = filters.q && fold(filters.q.trim())
  return (
    !q ||
    application.members.some((member) =>
      [member.name, member.email, member.github].some((field) =>
        fold(field).includes(q),
      ),
    )
  )
}

export function ParticipantsPage({
  result,
  filters,
  onFilters,
}: {
  result: Result
  filters: Filters
  onFilters: (filters: Filters) => void
}) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const all = result.data?.applications ?? []
  const shown = all.filter((application) => matches(application, filters))
  // each filter's counts honor the others, so the numbers say what clicking would show
  const count = (patch: Filters) =>
    all.filter((application) => matches(application, { ...filters, ...patch }))
      .length
  const refs = [...new Set(all.flatMap((a) => (a.ref ? [a.ref] : [])))].sort(
    (a, b) => a.localeCompare(b, 'es'),
  )
  const sizes = [...new Set(all.map((a) => a.size))].sort((a, b) => a - b)
  const set = (patch: Filters) => onFilters({ ...filters, ...patch })
  const filtered = Boolean(
    filters.q || filters.status || filters.size || filters.ref,
  )

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
              <Link to="/projects">Proyectos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects/$projectId" params={{ projectId: 'infra-futuro' }}>
                Infra Futuro
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Participantes</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <Badge variant="secondary">Infra Futuro · 2026</Badge>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight sm:text-3xl">
            Participantes
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Actualizar participantes"
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
          Cada inscripción con su equipo. Abre una para leer sus respuestas.
        </p>
      </header>

      {result.data ? (
        <>
          {result.data.truncated && (
            <Alert role="status">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>
                <h2>La lista está incompleta</h2>
              </AlertTitle>
              <AlertDescription>
                Hay más inscripciones de las que esta página puede mostrar.
              </AlertDescription>
            </Alert>
          )}

          <section aria-label="Filtros" className="space-y-3">
            <div className="relative min-w-0 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Buscar por nombre, email o GitHub"
                placeholder="Nombre, email o GitHub…"
                value={filters.q ?? ''}
                onChange={(event) => set({ q: event.target.value || undefined })}
                className="pl-9"
              />
            </div>
            <Chips label="Estado">
              <Chip
                active={!filters.status}
                onClick={() => set({ status: undefined })}
                count={count({ status: undefined })}
              >
                Todas
              </Chip>
              {STATUSES.map((status) => (
                <Chip
                  key={status}
                  active={filters.status === status}
                  onClick={() => set({ status })}
                  count={count({ status })}
                >
                  {STATUS_LABELS[status]}
                </Chip>
              ))}
            </Chips>
            <Chips label="Tamaño">
              <Chip
                active={!filters.size}
                onClick={() => set({ size: undefined })}
                count={count({ size: undefined })}
              >
                Todos
              </Chip>
              {sizes.map((size) => (
                <Chip
                  key={size}
                  active={filters.size === size}
                  onClick={() => set({ size })}
                  count={count({ size })}
                >
                  {teamSize(size)}
                </Chip>
              ))}
            </Chips>
            {refs.length > 0 && (
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Referido</span>
                <select
                  value={filters.ref ?? ''}
                  onChange={(event) =>
                    set({ ref: event.target.value || undefined })
                  }
                  className="h-8 max-w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm dark:bg-input/30"
                >
                  <option value="">Todos</option>
                  {refs.map((ref) => (
                    <option key={ref} value={ref}>
                      {ref}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section aria-labelledby="results-title" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="results-title"
                className="text-sm text-muted-foreground"
                aria-live="polite"
              >
                {filtered
                  ? `${shown.length} de ${teams(all.length)}`
                  : teams(all.length)}
              </h2>
              {filtered && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => onFilters({})}
                >
                  Quitar filtros
                </Button>
              )}
            </div>
            {shown.length ? (
              <Card className="py-0">
                <ul className="divide-y" aria-label="Inscripciones">
                  {shown.map((application) => (
                    <li key={application._id}>
                      <Row application={application} />
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  {all.length
                    ? 'Ninguna inscripción coincide con estos filtros.'
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
              ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
              : 'El servicio de Infra Futuro no está disponible. Intenta actualizar en un momento.'}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

function Row({ application }: { application: Application }) {
  const noCode = application.members.some((member) => member.coding === 'no')
  return (
    <Link
      to="/projects/$projectId/participants/$applicationId"
      params={{ projectId: 'infra-futuro', applicationId: application._id }}
      className="flex min-w-0 items-center gap-3 px-4 py-3 outline-none hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium [overflow-wrap:anywhere]">
          {application.members.map((member) => member.name).join(', ') ||
            'Sin integrantes'}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{teamSize(application.size)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(application.submittedAt).toISOString()}>
            {santiago(application.submittedAt, false)}
          </time>
          {application.ref && (
            <>
              <span aria-hidden="true">·</span>
              <span className="[overflow-wrap:anywhere]">
                Referido: {application.ref}
              </span>
            </>
          )}
          {noCode && (
            <Badge variant="outline" className="text-muted-foreground">
              No programa
            </Badge>
          )}
        </p>
      </div>
      <StatusBadge status={application.status} />
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  )
}

function Chips({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  )
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={active ? 'border border-ring' : undefined}
    >
      {children}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </Button>
  )
}
