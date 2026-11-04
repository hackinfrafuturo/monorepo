import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES, type Status } from '@convex/admin/status'
import { DataNotice, DotMeter, Figure, PageHeader, Tabs } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DIET_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
  people,
  santiago,
  teamSize,
  teams,
} from '../labels'

type Stats = FunctionReturnType<typeof api.admin.stats.get>
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: Stats | null
}
type Row = { label: string; count: number }

const YES_NO: Record<string, string> = { yes: 'Sí', no: 'No' }
const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : '0%'
/** noon, so a date never slips to the day before in Santiago */
const dayLabel = (day: string) => santiago(`${day}T12:00:00-03:00`, false)

/** every day from the first application to the last, so quiet days show as gaps */
function fillDays(perDay: Stats['perDay']) {
  if (!perDay.length) return []
  const counts = new Map(perDay.map((row) => [row.day, row]))
  const days = []
  const end = new Date(`${perDay[perDay.length - 1].day}T00:00:00Z`)
  for (const date = new Date(`${perDay[0].day}T00:00:00Z`); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.toISOString().slice(0, 10)
    days.push(counts.get(day) ?? { day, applications: 0, people: 0 })
  }
  return days
}

export function InsightsPage({
  result,
  status,
  onStatus,
}: {
  result: Result
  status?: Status
  onStatus: (status?: Status) => void
}) {
  const stats = result.data
  return (
    <>
      <PageHeader
        title="Estadísticas"
        description="Quiénes postularon, en totales. Filtra por estado para ver cómo va quedando el grupo aceptado."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/projects/$projectId/stats" params={{ projectId: 'infra-futuro' }}>
              Lista de inscripciones
            </Link>
          </Button>
        }
      />

      <Tabs
        label="Estado"
        value={status}
        onChange={onStatus}
        tabs={[
          { value: undefined, label: 'Todas' },
          ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
        ]}
      />

      {stats ? (
        <>
          {stats.truncated && (
            <Alert role="status">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>
                <h2>Los totales están incompletos</h2>
              </AlertTitle>
              <AlertDescription>
                Hay más postulantes de los que esta página puede contar.
              </AlertDescription>
            </Alert>
          )}

          <section aria-label="Totales" className="grid grid-cols-2 gap-x-6 gap-y-4 @min-[40rem]/page:grid-cols-4">
            <Figure label="Personas" value={stats.people} />
            <Figure label="Inscripciones" value={stats.applications} />
            <Figure label="Con alergias" value={stats.allergies} />
            <Figure label="Sin RUT" value={stats.missingId} />
          </section>

          <PerDay perDay={stats.perDay} />

          <div className="grid min-w-0 gap-x-10 gap-y-6 @min-[52rem]/page:grid-cols-2">
            <Breakdown
              title="Género"
              unit="personas"
              rows={stats.gender.map((row) => ({
                label: GENDER_LABELS[row.key as keyof typeof GENDER_LABELS] ?? row.key,
                count: row.count,
              }))}
            />
            <Breakdown
              title="¿Programa en su día a día?"
              unit="personas"
              rows={stats.coding.map((row) => ({ label: YES_NO[row.key] ?? row.key, count: row.count }))}
            />
            <Breakdown
              title="Tamaño de los equipos"
              unit="inscripciones"
              rows={stats.sizes.map((row) => ({ label: teamSize(Number(row.key)), count: row.count }))}
            />
            <Breakdown
              title="Alimentación"
              unit="personas"
              rows={stats.diet.map((row) => ({
                label: DIET_LABELS[row.key as keyof typeof DIET_LABELS] ?? row.key,
                count: row.count,
              }))}
            />
            <Breakdown
              title="Estacionamiento"
              unit="personas"
              rows={stats.parking.map((row) => ({
                label: row.key === 'yes' ? 'Lo necesita' : 'No lo necesita',
                count: row.count,
              }))}
            />
            <Breakdown
              title="Ofertas laborales"
              unit="personas"
              rows={stats.jobs.map((row) => ({
                label: row.key === 'yes' ? 'Le interesan' : 'No le interesan',
                count: row.count,
              }))}
            />
            <Breakdown
              title="Referidos"
              unit="inscripciones"
              rows={stats.refs.map((row) => ({ label: row.key || 'Sin referido', count: row.applications }))}
            />
          </div>
        </>
      ) : (
        <DataNotice status={result.status} what="las estadísticas" />
      )}
    </>
  )
}

function PerDay({ perDay }: { perDay: Stats['perDay'] }) {
  const days = fillDays(perDay)
  const [hovered, setHovered] = useState<string | null>(null)
  const highest = Math.max(1, ...days.map((day) => day.applications))
  const shown = days.find((day) => day.day === hovered)
  return (
    <section aria-labelledby="days-title" className="min-w-0 space-y-3 border-t border-foreground pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="days-title" className="text-sm">
          Inscripciones por día
        </h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {shown
            ? `${dayLabel(shown.day)}: ${teams(shown.applications)} · ${people(shown.people)}`
            : `Máximo: ${teams(highest)} en un día`}
        </p>
      </div>
      {days.length ? (
        <>
          <div
            role="img"
            aria-label={`Inscripciones por día, entre ${dayLabel(days[0].day)} y ${dayLabel(days[days.length - 1].day)}. El detalle está en la tabla.`}
            className="flex h-32 items-end gap-0.5 border-b"
            onPointerLeave={() => setHovered(null)}
          >
            {days.map((day) => (
              <div
                key={day.day}
                className="flex h-full min-w-0 flex-1 items-end transition-colors duration-75 hover:bg-accent"
                onPointerEnter={() => setHovered(day.day)}
              >
                <div
                  className={`w-full ${hovered === day.day ? 'bg-foreground' : 'bg-primary'}`}
                  style={{ height: `${(day.applications / highest) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{dayLabel(days[0].day)}</span>
            <span>{dayLabel(days[days.length - 1].day)}</span>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Ver como tabla</summary>
            <table className="mt-2 w-full max-w-md text-left tabular-nums">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-normal">Día</th>
                  <th className="py-1 text-right font-normal">Inscripciones</th>
                  <th className="py-1 text-right font-normal">Personas</th>
                </tr>
              </thead>
              <tbody>
                {days
                  .filter((day) => day.applications)
                  .map((day) => (
                    <tr key={day.day} className="border-t">
                      <td className="py-1">{dayLabel(day.day)}</td>
                      <td className="py-1 text-right">{day.applications}</td>
                      <td className="py-1 text-right">{day.people}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No hay inscripciones aquí.</p>
      )}
    </section>
  )
}

function Breakdown({ title, unit, rows }: { title: string; unit: string; rows: Row[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const highest = Math.max(1, ...rows.map((row) => row.count))
  return (
    <section className="min-w-0 space-y-2 border-t border-foreground pt-3">
      <h2 className="flex items-baseline justify-between gap-3 text-sm">
        {title}
        <span className="text-xs text-muted-foreground">
          {total} {unit}
        </span>
      </h2>
      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 [overflow-wrap:anywhere]">{row.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {row.count} · {percent(row.count, total)}
                </span>
              </div>
              <DotMeter value={row.count} max={highest} label={row.label} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      )}
    </section>
  )
}
