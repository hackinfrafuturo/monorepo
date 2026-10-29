import { useState, type FormEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { AlertCircle, MailX } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES, canMove, type Status } from '@convex/admin/status'
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
import { Input } from '@/components/ui/input'
import { setCapacity } from '../../server/functions'
import {
  STATUS_LABELS,
  people,
  reviewsLabel,
  santiago,
  score,
  teamSize,
  teams,
} from '../labels'
import { ACTION_LABELS, DecisionConfirm } from './DecisionConfirm'

type List = FunctionReturnType<typeof api.admin.applications.list>
type Settings = FunctionReturnType<typeof api.admin.settings.get>
type Application = List['applications'][number]
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: (List & { settings: Settings }) | null
}

/** best-scored first; unreviewed teams last, then the earliest to apply */
const byScore = (a: Application, b: Application) =>
  (b.reviews.average ?? -1) - (a.reviews.average ?? -1) ||
  b.reviews.count - a.reviews.count ||
  a.submittedAt - b.submittedAt

export function DecisionsPage({
  result,
  status,
  onStatus,
}: {
  result: Result
  status: Status
  onStatus: (status: Status) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [action, setAction] = useState<Status | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const data = result.data
  const all = data?.applications ?? []
  const shown = all.filter((a) => a.status === status).sort(byScore)
  const chosen = shown.filter((a) => selected.has(a._id))
  const acceptedPeople = all
    .filter((a) => a.status === 'accepted')
    .reduce((sum, a) => sum + a.size, 0)
  // only moves every selected team can make
  const targets = STATUSES.filter(
    (target) => chosen.length > 0 && chosen.every((a) => canMove(a.status, target)),
  )
  const allChosen = shown.length > 0 && chosen.length === shown.length

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const switchTab = (next: Status) => {
    setSelected(new Set())
    setAction(null)
    onStatus(next)
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
            <BreadcrumbPage>Decisiones</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <Badge variant="secondary">Infra Futuro · 2026</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Decisiones</h1>
        <p className="text-sm text-muted-foreground">
          Equipos ordenados por puntaje. Elige varios y decide: cada equipo se
          decide completo y cada integrante recibe su correo.
        </p>
      </header>

      {!data ? (
        <Alert role="status">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h2>
              {result.status === 'unconfigured'
                ? 'Falta conectar el proyecto'
                : 'No pudimos cargar las decisiones'}
            </h2>
          </AlertTitle>
          <AlertDescription>
            {result.status === 'unconfigured'
              ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
              : 'El servicio de Infra Futuro no está disponible. Intenta en un momento.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {data.settings.decisionEmails === 'off' && (
            <Alert role="status">
              <MailX aria-hidden="true" />
              <AlertTitle>
                <h2>Correos de decisión desactivados</h2>
              </AlertTitle>
              <AlertDescription>
                En este entorno las decisiones se guardan y los correos quedan
                registrados, pero no se envían. Se activan en producción con DECISION_EMAILS=send.
              </AlertDescription>
            </Alert>
          )}

          <CapacityCard capacity={data.settings.capacity} accepted={acceptedPeople} />

          <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const count = all.filter((a) => a.status === s).length
              return (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={status === s ? 'secondary' : 'outline'}
                  aria-pressed={status === s}
                  onClick={() => switchTab(s)}
                  className={status === s ? 'border border-ring' : undefined}
                >
                  {STATUS_LABELS[s]}
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                </Button>
              )
            })}
          </div>

          {message && (
            <p role="status" className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
              {message}
            </p>
          )}

          {shown.length ? (
            <Card className="gap-0 py-0">
              <label className="flex items-center gap-3 border-b px-4 py-3 text-sm sm:px-6">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={allChosen}
                  onChange={() =>
                    setSelected(allChosen ? new Set() : new Set(shown.map((a) => a._id)))
                  }
                />
                <span className="text-muted-foreground">
                  {chosen.length
                    ? `${teams(chosen.length)} · ${people(chosen.reduce((sum, a) => sum + a.size, 0))} elegidas`
                    : `Elegir las ${teams(shown.length)}`}
                </span>
              </label>
              <ul className="divide-y" aria-label="Equipos">
                {shown.map((application) => (
                  <li key={application._id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary"
                      checked={selected.has(application._id)}
                      onChange={() => toggle(application._id)}
                      aria-label={`Elegir a ${application.members.map((m) => m.name).join(', ')}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        to="/projects/$projectId/participants/$applicationId"
                        params={{ projectId: 'infra-futuro', applicationId: application._id }}
                        className="text-sm font-medium underline-offset-4 [overflow-wrap:anywhere] hover:underline"
                      >
                        {application.members.map((m) => m.name).join(', ')}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {teamSize(application.size)} · {santiago(application.submittedAt, false)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {application.reviews.average === null ? (
                        <span className="text-xs text-muted-foreground">Sin revisar</span>
                      ) : (
                        <>
                          <p className="text-base font-semibold tabular-nums">
                            {score(application.reviews.average)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reviewsLabel(application.reviews.count)}
                          </p>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No hay equipos en {STATUS_LABELS[status]}.
              </CardContent>
            </Card>
          )}

          {chosen.length > 0 && !action && (
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 shadow-lg">
              <span className="mr-auto text-sm">
                {teams(chosen.length)} · {people(chosen.reduce((sum, a) => sum + a.size, 0))}
              </span>
              {targets.map((target) => (
                <Button
                  key={target}
                  size="sm"
                  variant={target === 'accepted' ? 'default' : 'outline'}
                  onClick={() => {
                    setMessage(null)
                    setAction(target)
                  }}
                >
                  {ACTION_LABELS[target]}
                </Button>
              ))}
            </div>
          )}

          {action && (
            <div className="sticky bottom-0 z-10">
              <DecisionConfirm
                teams={chosen.map((a) => ({
                  _id: a._id,
                  names: a.members.map((m) => m.name),
                  size: a.size,
                  status: a.status,
                }))}
                status={action}
                capacity={data.settings.capacity}
                acceptedPeople={acceptedPeople}
                emailsMode={data.settings.decisionEmails}
                onCancel={() => setAction(null)}
                onDone={(text) => {
                  setAction(null)
                  setSelected(new Set())
                  setMessage(text)
                }}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

function CapacityCard({ capacity, accepted }: { capacity: number | null; accepted: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(capacity === null)
  const [value, setValue] = useState(capacity ? String(capacity) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const share = capacity ? Math.min(100, Math.round((accepted / capacity) * 100)) : 0

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const result = await setCapacity({
      data: { projectId: 'infra-futuro', capacity: Number(value) },
    }).catch(() => ({ ok: false as const, message: 'No pudimos guardar los cupos.' }))
    setSaving(false)
    if (!result.ok) return setError(result.message)
    await router.invalidate()
    setEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cupos</h2>
        </CardTitle>
        <CardDescription>
          {capacity === null
            ? 'Define cuántas personas caben en el evento.'
            : `${people(accepted)} aceptadas de ${capacity} · ${
                capacity - accepted >= 0
                  ? `quedan ${capacity - accepted}`
                  : `${accepted - capacity} sobre el cupo`
              }`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {capacity !== null && (
          <div
            role="progressbar"
            aria-label="Cupos usados"
            aria-valuenow={accepted}
            aria-valuemin={0}
            aria-valuemax={capacity}
            className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={accepted > capacity ? 'h-full bg-destructive' : 'h-full bg-primary'}
              style={{ width: `${share}%` }}
            />
          </div>
        )}
        {editing ? (
          <form onSubmit={save} className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              max={10000}
              step={1}
              required
              inputMode="numeric"
              aria-label="Cupos en personas"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">personas</span>
            <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
            {capacity !== null && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </form>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Cambiar cupos
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
