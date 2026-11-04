import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleCheck } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES } from '@convex/admin/status'
import { DataNotice, DotMeter, Figure, PageHeader, RefreshButton } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { StatusBadge } from '../participants/StatusBadge'
import { describeEntry, people, santiago, teams } from '../labels'

type Overview = FunctionReturnType<typeof api.admin.overview.get>
type Activity = FunctionReturnType<typeof api.admin.activity.recent>
type Settings = FunctionReturnType<typeof api.admin.settings.get>
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: {
    overview: Overview
    activity: Activity
    settings: Settings
    checkedAt: string
    toReview: number
    toDecide: number
  } | null
}

export function OverviewPage({ result }: { result: Result }) {
  const data = result.data
  const accepted = data?.overview.byStatus.accepted
  const capacity = data?.settings.capacity ?? null
  return (
    <>
      <PageHeader
        title="Resumen"
        description={data ? `Lo que necesita atención ahora. Actualizado a las ${santiago(data.checkedAt).split(', ')[1]}, hora de Santiago.` : undefined}
        actions={<RefreshButton label="Actualizar resumen" />}
      />

      {data && accepted ? (
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

          <section aria-label="Totales" className="grid grid-cols-2 gap-x-6 gap-y-5 @min-[44rem]/page:grid-cols-4">
            <Figure label="Personas inscritas" value={data.overview.people} detail={teams(data.overview.applications)} />
            <Figure
              label="Por decidir"
              value={data.overview.byStatus.pending.applications}
              detail={people(data.overview.byStatus.pending.people)}
            />
            <Figure label="Aceptadas" value={accepted.applications} detail={people(accepted.people)} />
            <div className="min-w-0 space-y-2">
              <Figure
                label="Cupos"
                value={capacity === null ? '—' : Math.max(0, capacity - accepted.people)}
                detail={capacity === null ? 'Sin definir' : `libres de ${capacity}`}
              />
              {capacity !== null && <DotMeter value={accepted.people} max={capacity} label="Cupos usados" />}
            </div>
          </section>

          <div className="grid min-w-0 gap-x-10 gap-y-8 @min-[52rem]/page:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section aria-labelledby="next-title" className="min-w-0 space-y-2">
              <h2 id="next-title" className="border-t border-foreground pt-3 text-sm">
                Qué sigue
              </h2>
              {data.toReview === 0 && data.toDecide === 0 ? (
                <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
                  Nada pendiente por ahora.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.toReview > 0 && (
                    <Step
                      to="/projects/$projectId/review"
                      title={`Revisar ${teams(data.toReview)}`}
                      detail="Las que todavía no puntúas tú"
                    />
                  )}
                  {data.toDecide > 0 && (
                    <Step
                      to="/projects/$projectId/decisions"
                      title={`Decidir ${teams(data.toDecide)}`}
                      detail="Ya tienen puntaje y esperan una decisión"
                    />
                  )}
                </ul>
              )}

              <h2 className="mt-6 border-t border-foreground pt-3 text-sm">Por estado</h2>
              <ul className="divide-y text-sm">
                {STATUSES.map((status) => {
                  const counts = data.overview.byStatus[status]
                  return (
                    <li key={status}>
                      <Link
                        to="/projects/$projectId/participants"
                        params={{ projectId: 'infra-futuro' }}
                        search={{ status }}
                        className="flex items-center justify-between gap-3 px-1 py-2 transition-colors duration-75 hover:bg-accent"
                      >
                        <StatusBadge status={status} className="text-sm text-foreground" />
                        <span className="text-right text-muted-foreground tabular-nums">
                          <span className="text-foreground">{counts.applications}</span> ·{' '}
                          {people(counts.people)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section aria-labelledby="activity-title" className="min-w-0 space-y-2">
              <h2 id="activity-title" className="border-t border-foreground pt-3 text-sm">
                Actividad reciente
              </h2>
              {data.activity.length ? (
                <ol className="divide-y text-sm">
                  {data.activity.map((entry) => (
                    <li key={entry._id} className="space-y-0.5 py-2.5">
                      <p className="[overflow-wrap:anywhere]">
                        <span className="text-muted-foreground">{entry.actor}</span>{' '}
                        {describeEntry(entry)}
                        {entry.team.length > 0 && <> · {entry.team.join(', ')}</>}
                      </p>
                      <time
                        dateTime={new Date(entry._creationTime).toISOString()}
                        className="text-xs text-muted-foreground tabular-nums"
                      >
                        {santiago(entry._creationTime)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">Todavía no hay actividad.</p>
              )}
            </section>
          </div>
        </>
      ) : (
        <DataNotice status={result.status} what="el resumen" />
      )}
    </>
  )
}

function Step({
  to,
  title,
  detail,
}: {
  to: '/projects/$projectId/review' | '/projects/$projectId/decisions'
  title: string
  detail: string
}) {
  return (
    <li>
      <Link
        to={to}
        params={{ projectId: 'infra-futuro' }}
        className="group flex items-center justify-between gap-3 px-1 py-3 transition-colors duration-75 hover:bg-foreground hover:text-background"
      >
        <span className="min-w-0">
          <span className="block font-pixel text-xl leading-tight">{title}</span>
          <span className="block text-xs opacity-70">{detail}</span>
        </span>
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>
    </li>
  )
}
