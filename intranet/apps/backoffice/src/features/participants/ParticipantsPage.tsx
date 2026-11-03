import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowDown, Mail, Search } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES } from '@convex/admin/status'
import { DataNotice, PageHeader, RefreshButton, Select, Tabs } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { STATUS_LABELS, santiago, score, teamSize, teams } from '../labels'
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
      [member.name, member.email, member.github].some((field) => fold(field).includes(q)),
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
  const all = result.data?.applications ?? []
  const shown = all.filter((application) => matches(application, filters))
  if (filters.sort === 'score')
    shown.sort((a, b) => (b.reviews.average ?? -1) - (a.reviews.average ?? -1))
  // each filter's counts honor the others, so the numbers say what clicking would show
  const count = (patch: Filters) =>
    all.filter((application) => matches(application, { ...filters, ...patch })).length
  const refs = [...new Set(all.flatMap((a) => (a.ref ? [a.ref] : [])))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  const sizes = [...new Set(all.map((a) => a.size))].sort((a, b) => a - b)
  const set = (patch: Filters) => onFilters({ ...filters, ...patch })
  const filtered = Boolean(filters.q || filters.status || filters.size || filters.ref)
  const emailable = !filters.q && !filters.size && (filters.status || filters.ref)

  return (
    <>
      <PageHeader
        title="Participantes"
        description="Cada inscripción con su equipo. Abre una para leer sus respuestas."
        actions={<RefreshButton label="Actualizar participantes" />}
      />

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
            <Tabs
              label="Estado"
              value={filters.status}
              onChange={(status) => set({ status })}
              tabs={[
                { value: undefined, label: 'Todas', count: count({ status: undefined }) },
                ...STATUSES.map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                  count: count({ status }),
                })),
              ]}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="relative min-w-48 flex-1 sm:max-w-sm">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  aria-label="Buscar en la lista por nombre, email o GitHub"
                  placeholder="Nombre, email o GitHub"
                  value={filters.q ?? ''}
                  onChange={(event) => set({ q: event.target.value || undefined })}
                  className="pl-8"
                />
              </div>
              <Select
                label="Tamaño"
                value={filters.size ? String(filters.size) : ''}
                onChange={(value) => set({ size: value ? Number(value) : undefined })}
              >
                <option value="">Todos</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {teamSize(size)} ({count({ size })})
                  </option>
                ))}
              </Select>
              {refs.length > 0 && (
                <Select
                  label="Referido"
                  value={filters.ref ?? ''}
                  onChange={(value) => set({ ref: value || undefined })}
                >
                  <option value="">Todos</option>
                  {refs.map((ref) => (
                    <option key={ref} value={ref}>
                      {ref}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </section>

          <section aria-labelledby="results-title" className="space-y-2">
            <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
              <h2 id="results-title" className="text-sm text-muted-foreground" aria-live="polite">
                {filtered ? `${shown.length} de ${teams(all.length)}` : teams(all.length)}
              </h2>
              <div className="flex flex-wrap items-center gap-1">
                {emailable && (
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      to="/projects/$projectId/messages"
                      params={{ projectId: 'infra-futuro' }}
                      search={{ status: filters.status, ref: filters.ref }}
                    >
                      <Mail aria-hidden="true" />
                      Escribir a este grupo
                    </Link>
                  </Button>
                )}
                {filtered && (
                  <Button variant="ghost" size="sm" onClick={() => onFilters({})}>
                    Quitar filtros
                  </Button>
                )}
              </div>
            </div>

            {shown.length ? (
              <table className="w-full border-t border-foreground text-sm">
                <thead className="hidden text-xs text-muted-foreground @min-[46rem]/page:table-header-group">
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-normal">Equipo</th>
                    <th className="py-2 pr-4 font-normal">Enviada</th>
                    <th className="py-2 pr-4 font-normal">Referido</th>
                    <th
                      className="py-2 pr-4 text-right font-normal"
                      aria-sort={filters.sort === 'score' ? 'descending' : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => set({ sort: filters.sort === 'score' ? undefined : 'score' })}
                        className={`inline-flex items-center gap-1 hover:text-foreground ${filters.sort === 'score' ? 'text-foreground' : ''}`}
                      >
                        Puntaje
                        <ArrowDown className={`size-3 ${filters.sort === 'score' ? '' : 'opacity-40'}`} aria-hidden="true" />
                      </button>
                    </th>
                    <th className="py-2 font-normal">Estado</th>
                  </tr>
                </thead>
                <tbody aria-label="Inscripciones">
                  {shown.map((application) => (
                    <Row key={application._id} application={application} />
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="border-t border-foreground py-8 text-center text-sm text-muted-foreground">
                {all.length
                  ? 'Ninguna inscripción coincide con estos filtros.'
                  : 'Todavía no hay inscripciones.'}
              </p>
            )}
          </section>
        </>
      ) : (
        <DataNotice status={result.status} what="las inscripciones" />
      )}
    </>
  )
}

function Row({ application }: { application: Application }) {
  const noCode = application.members.some((member) => member.coding === 'no')
  const average = application.reviews.average
  return (
    <tr className="relative border-b transition-colors duration-75 hover:bg-accent">
      <td className="py-2.5 pr-4 align-top">
        <Link
          to="/projects/$projectId/participants/$applicationId"
          params={{ projectId: 'infra-futuro', applicationId: application._id }}
          className="[overflow-wrap:anywhere] after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {application.members.map((member) => member.name).join(', ') || 'Sin integrantes'}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{teamSize(application.size)}</span>
          {noCode && <Badge variant="outline">No programa</Badge>}
          <span className="@min-[46rem]/page:hidden">· {santiago(application.submittedAt, false)}</span>
          {average !== null && (
            <span className="@min-[46rem]/page:hidden">· Puntaje {score(average)}</span>
          )}
        </p>
        <StatusBadge status={application.status} className="mt-1 @min-[46rem]/page:hidden" />
      </td>
      <td className="hidden py-2.5 pr-4 align-top whitespace-nowrap text-muted-foreground @min-[46rem]/page:table-cell">
        {santiago(application.submittedAt, false)}
      </td>
      <td className="hidden max-w-36 truncate py-2.5 pr-4 align-top text-muted-foreground @min-[46rem]/page:table-cell">
        {application.ref ?? '—'}
      </td>
      <td className="hidden py-2.5 pr-4 text-right align-top tabular-nums @min-[46rem]/page:table-cell">
        {average === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          score(average)
        )}
      </td>
      <td className="hidden py-2.5 align-top @min-[46rem]/page:table-cell">
        <StatusBadge status={application.status} />
      </td>
    </tr>
  )
}
