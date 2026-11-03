import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES, type Status } from '@convex/admin/status'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
            <BreadcrumbPage>Estadísticas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <Badge variant="secondary">Infra Futuro · 2026</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">
          Quiénes postularon, en totales. Filtra por estado para ver cómo va
          quedando el grupo aceptado.
        </p>
      </header>

      <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={!status ? 'secondary' : 'outline'}
          aria-pressed={!status}
          onClick={() => onStatus(undefined)}
          className={!status ? 'border border-ring' : undefined}
        >
          Todas
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={status === s ? 'secondary' : 'outline'}
            aria-pressed={status === s}
            onClick={() => onStatus(s)}
            className={status === s ? 'border border-ring' : undefined}
          >
            {STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

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

          <section aria-label="Totales" className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-3">
            <Metric label="Personas" value={stats.people} />
            <Metric label="Inscripciones" value={stats.applications} />
            <Metric label="Con alergias" value={stats.allergies} />
          </section>

          <PerDay perDay={stats.perDay} />

          <div className="grid min-w-0 gap-4 @min-[52rem]/page:grid-cols-2">
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
        <Alert role="status">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h2>
              {result.status === 'unconfigured'
                ? 'Falta conectar el proyecto'
                : 'No pudimos cargar las estadísticas'}
            </h2>
          </AlertTitle>
          <AlertDescription>
            {result.status === 'unconfigured'
              ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
              : 'El servicio de Infra Futuro no está disponible. Intenta en un momento.'}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="min-w-0 gap-2 py-5">
      <CardHeader className="px-5">
        <CardDescription className="text-xs sm:text-sm">{label}</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <strong className="block text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
          {value}
        </strong>
      </CardContent>
    </Card>
  )
}

function PerDay({ perDay }: { perDay: Stats['perDay'] }) {
  const days = fillDays(perDay)
  const [hovered, setHovered] = useState<string | null>(null)
  const highest = Math.max(1, ...days.map((day) => day.applications))
  const shown = days.find((day) => day.day === hovered)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2>Inscripciones por día</h2>
        </CardTitle>
        <CardDescription aria-live="polite">
          {shown
            ? `${dayLabel(shown.day)}: ${teams(shown.applications)} · ${people(shown.people)}`
            : `El día con más tuvo ${teams(highest)}. Pasa por una barra para ver el detalle.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {days.length ? (
          <>
            <div
              role="img"
              aria-label={`Inscripciones por día, entre ${dayLabel(days[0].day)} y ${dayLabel(days[days.length - 1].day)}. El detalle está en la tabla.`}
              className="flex h-36 items-end gap-0.5 border-b"
              onPointerLeave={() => setHovered(null)}
            >
              {days.map((day) => (
                <div
                  key={day.day}
                  className="flex h-full min-w-0 flex-1 items-end"
                  onPointerEnter={() => setHovered(day.day)}
                >
                  <div
                    className={`w-full rounded-t-[4px] ${hovered === day.day ? 'bg-primary' : 'bg-primary/70'}`}
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
              <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
              <table className="mt-2 w-full text-left tabular-nums">
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
      </CardContent>
    </Card>
  )
}

function Breakdown({ title, unit, rows }: { title: string; unit: string; rows: Row[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const highest = Math.max(1, ...rows.map((row) => row.count))
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>
          {total} {unit}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <ul className="space-y-3 text-sm">
            {rows.map((row) => (
              <li key={row.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 [overflow-wrap:anywhere]">{row.label}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {row.count} · {percent(row.count, total)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.count / highest) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        )}
      </CardContent>
    </Card>
  )
}
