import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { MailX } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { MAX_DECISION_TEAMS, STATUSES, canMove, type Status } from '@convex/admin/status'
import { DataNotice, DotMeter, PageHeader, RefreshButton, Tabs } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setCapacity } from '../../server/functions'
import { STATUS_LABELS, people, reviewsLabel, santiago, score, teamSize, teams } from '../labels'
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
  const lastClicked = useRef<string | null>(null)
  const data = result.data
  const all = data?.applications ?? []
  const shown = all.filter((a) => a.status === status).sort(byScore)
  const chosen = shown.filter((a) => selected.has(a._id))
  const chosenPeople = chosen.reduce((sum, a) => sum + a.size, 0)
  const acceptedPeople = all
    .filter((a) => a.status === 'accepted')
    .reduce((sum, a) => sum + a.size, 0)
  const capacity = data?.settings.capacity ?? null
  const free = capacity === null ? null : capacity - acceptedPeople
  // only moves every selected team can make
  const targets = STATUSES.filter(
    (target) => chosen.length > 0 && chosen.every((a) => canMove(a.status, target)),
  )
  const selectable = shown.slice(0, MAX_DECISION_TEAMS)
  const allChosen = selectable.length > 0 && selectable.every((a) => selected.has(a._id))
  const scored = shown.some((a) => a.reviews.average !== null)

  /** a click toggles one row; with shift, every row from the last click */
  function toggle(index: number, event: MouseEvent) {
    const id = shown[index]._id
    // Capture the anchor before changing it, and find it by ID after a refresh/reorder.
    const anchor = shown.findIndex((a) => a._id === lastClicked.current)
    const from = event.shiftKey && anchor >= 0 ? anchor : index
    const next = new Set(shown.filter((a) => selected.has(a._id)).map((a) => a._id))
    const on = !next.has(id)
    for (let i = Math.min(from, index); i <= Math.max(from, index); i++) {
      if (on) next.add(shown[i]._id)
      else next.delete(shown[i]._id)
    }
    if (next.size > MAX_DECISION_TEAMS) {
      setMessage(`Puedes elegir hasta ${MAX_DECISION_TEAMS} equipos por decisión.`)
      return
    }
    setMessage(null)
    setSelected(next)
    lastClicked.current = id
  }

  /** the best-scored teams that still fit, skipping any too big for what's left */
  function fillPlaces() {
    let room = free ?? 0
    const next = new Set<string>()
    for (const application of shown) {
      if (next.size === MAX_DECISION_TEAMS) break
      if (application.reviews.average === null || application.size > room) continue
      next.add(application._id)
      room -= application.size
    }
    setMessage(null)
    setSelected(next)
    lastClicked.current = null
  }

  const switchTab = (next: Status) => {
    setSelected(new Set())
    setAction(null)
    lastClicked.current = null
    onStatus(next)
  }

  return (
    <>
      <PageHeader
        title="Decisiones"
        description="Equipos ordenados por puntaje. Cada equipo se decide completo y cada integrante recibe su correo."
        actions={<RefreshButton label="Actualizar decisiones" />}
      />

      {!data ? (
        <DataNotice status={result.status} what="las decisiones" />
      ) : (
        <>
          {data.settings.decisionEmails === 'off' && (
            <Alert role="status">
              <MailX aria-hidden="true" />
              <AlertTitle>
                <h2>Correos de decisión desactivados</h2>
              </AlertTitle>
              <AlertDescription>
                En este entorno las decisiones se guardan y los correos quedan registrados, pero
                no se envían. Se activan en producción con DECISION_EMAILS=send.
              </AlertDescription>
            </Alert>
          )}

          <Capacity capacity={capacity} accepted={acceptedPeople} />

          <Tabs
            label="Estado"
            value={status}
            onChange={switchTab}
            tabs={STATUSES.map((s) => ({
              value: s,
              label: STATUS_LABELS[s],
              count: all.filter((a) => a.status === s).length,
            }))}
          />

          {message && (
            <p role="status" className="border-l-2 border-primary bg-muted/60 px-4 py-2.5 text-sm">
              {message}
            </p>
          )}

          {shown.length ? (
            <div className="space-y-2">
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={allChosen}
                    onChange={() => {
                      setSelected(allChosen ? new Set() : new Set(selectable.map((a) => a._id)))
                      setMessage(null)
                      lastClicked.current = null
                    }}
                  />
                  {chosen.length
                    ? `${teams(chosen.length)} · ${people(chosenPeople)} elegidas`
                    : shown.length > MAX_DECISION_TEAMS
                      ? `Elegir las primeras ${teams(MAX_DECISION_TEAMS)}`
                      : `Elegir las ${teams(shown.length)}`}
                </label>
                {(status === 'pending' || status === 'waitlisted') && free !== null && free > 0 && scored && (
                  <Button variant="ghost" size="sm" onClick={fillPlaces}>
                    Elegir las mejores que caben
                  </Button>
                )}
              </div>
              {shown.length > MAX_DECISION_TEAMS && (
                <p className="text-xs text-muted-foreground">
                  Hasta {MAX_DECISION_TEAMS} equipos por decisión. Puedes continuar con los demás después.
                </p>
              )}
              <table className="w-full border-t border-foreground text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b text-left">
                    <th className="w-8 py-2 font-normal">
                      <span className="sr-only">Elegir</span>
                    </th>
                    <th className="w-24 py-2 pr-3 font-normal">Puntaje</th>
                    <th className="py-2 pr-3 font-normal">Equipo</th>
                    <th className="hidden py-2 pr-3 font-normal @min-[40rem]/page:table-cell">Revisiones</th>
                    <th className="hidden py-2 font-normal @min-[40rem]/page:table-cell">Enviada</th>
                  </tr>
                </thead>
                <tbody aria-label="Equipos">
                  {shown.map((application, index) => {
                    const names = application.members.map((m) => m.name).join(', ')
                    return (
                      <tr
                        key={application._id}
                        className={`border-b transition-colors duration-75 ${selected.has(application._id) ? 'bg-accent' : 'hover:bg-accent/60'}`}
                      >
                        <td className="py-2.5 align-top">
                          <input
                            type="checkbox"
                            className="size-4 align-middle"
                            checked={selected.has(application._id)}
                            onChange={() => {}}
                            onClick={(event) => toggle(index, event)}
                            aria-label={`Elegir a ${names}`}
                          />
                        </td>
                        <td className="py-2 pr-3 align-top">
                          {application.reviews.average === null ? (
                            <span className="text-xs whitespace-nowrap text-muted-foreground">Sin revisar</span>
                          ) : (
                            <span className="font-pixel text-xl leading-tight tabular-nums">
                              {score(application.reviews.average)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 align-top">
                          <Link
                            to="/projects/$projectId/participants/$applicationId"
                            params={{ projectId: 'infra-futuro', applicationId: application._id }}
                            className="underline decoration-transparent underline-offset-4 [overflow-wrap:anywhere] hover:decoration-current"
                          >
                            {names}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {teamSize(application.size)}
                          </p>
                        </td>
                        <td className="hidden py-2.5 pr-3 align-top whitespace-nowrap text-muted-foreground @min-[40rem]/page:table-cell">
                          {application.reviews.count ? reviewsLabel(application.reviews.count) : '—'}
                        </td>
                        <td className="hidden py-2.5 align-top whitespace-nowrap text-muted-foreground @min-[40rem]/page:table-cell">
                          {santiago(application.submittedAt, false)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border-t border-foreground py-8 text-center text-sm text-muted-foreground">
              No hay equipos en {STATUS_LABELS[status]}.
            </p>
          )}

          {chosen.length > 0 && (
            <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-foreground bg-background px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <span className="mr-auto text-sm">
                {teams(chosen.length)} · {people(chosenPeople)}
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
            <DecisionConfirm
              teams={chosen.map((a) => ({
                _id: a._id,
                names: a.members.map((m) => m.name),
                size: a.size,
                status: a.status,
                reviews: a.reviews.count,
                missingIds: a.members.filter((m) => !m.hasId).length,
              }))}
              status={action}
              capacity={capacity}
              acceptedPeople={acceptedPeople}
              emailsMode={data.settings.decisionEmails}
              onCancel={() => setAction(null)}
              onDone={(text) => {
                setAction(null)
                setSelected(new Set())
                setMessage(text)
              }}
            />
          )}
        </>
      )}
    </>
  )
}

function Capacity({ capacity, accepted }: { capacity: number | null; accepted: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(capacity === null)
  const [value, setValue] = useState(capacity ? String(capacity) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    <section aria-label="Cupos" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="min-w-0">
          <span className="font-pixel text-2xl leading-none tabular-nums">
            {capacity === null ? 'Sin cupos definidos' : `${accepted} / ${capacity}`}
          </span>{' '}
          {capacity !== null && (
            <span className="text-sm text-muted-foreground">
              personas aceptadas ·{' '}
              {capacity - accepted >= 0
                ? `quedan ${capacity - accepted}`
                : `${accepted - capacity} sobre el cupo`}
            </span>
          )}
        </p>
        {editing ? (
          <form onSubmit={save} className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              max={10000}
              step={1}
              required
              autoFocus={capacity !== null}
              inputMode="numeric"
              aria-label="Cupos en personas"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-8 w-24"
            />
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
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Cambiar cupos
          </Button>
        )}
      </div>
      {capacity !== null && <DotMeter value={accepted} max={capacity} label="Cupos usados" size={8} />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
