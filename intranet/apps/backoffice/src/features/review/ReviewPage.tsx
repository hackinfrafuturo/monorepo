import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { AlertCircle, CircleCheck, SkipForward } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveReview } from '../../server/functions'
import { SCORES, SCORE_LABELS, santiago, teamSize } from '../labels'
import { MemberCard } from '../participants/MemberCard'

type Queue = FunctionReturnType<typeof api.admin.review.next>
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: Queue | null
}

export function ReviewPage({
  result,
  skipped,
  onSkip,
  onResetSkips,
}: {
  result: Result
  skipped: number
  onSkip: (applicationId: string) => void
  onResetSkips: () => void
}) {
  const queue = result.data
  const application = queue?.application ?? null
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
            <BreadcrumbPage>Revisar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <Badge variant="secondary">Infra Futuro · 2026</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Revisar
        </h1>
        <p className="text-sm text-muted-foreground">
          Un equipo pendiente a la vez. Puntúa lo que hicieron, no quiénes
          son: el email, el género y los puntajes de los demás no aparecen aquí.
        </p>
        {queue && (
          <Progress done={queue.reviewedByMe} total={queue.pending} />
        )}
      </header>

      {!queue ? (
        <Alert role="status">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h2>
              {result.status === 'unconfigured'
                ? 'Falta conectar el proyecto'
                : 'No pudimos cargar la revisión'}
            </h2>
          </AlertTitle>
          <AlertDescription>
            {result.status === 'unconfigured'
              ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
              : 'El servicio de Infra Futuro no está disponible. Intenta en un momento.'}
          </AlertDescription>
        </Alert>
      ) : application ? (
        <>
          <section aria-labelledby="team-title" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="team-title" className="text-lg font-semibold tracking-tight">
                {teamSize(application.size)}
              </h2>
              <span className="text-sm text-muted-foreground">
                · inscrita el {santiago(application.submittedAt, false)}
              </span>
            </div>
            <div className="grid min-w-0 gap-4 @min-[56rem]/page:grid-cols-2">
              {application.members.map((member) => (
                <MemberCard key={member._id} member={member} />
              ))}
            </div>
          </section>
          <ScorePanel
            key={application._id}
            applicationId={application._id}
            onSkip={() => onSkip(application._id)}
          />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-2">
            <p className="flex items-center gap-2 font-medium">
              <CircleCheck className="size-5" aria-hidden="true" />
              {skipped
                ? 'Solo quedan los equipos que saltaste.'
                : 'Revisaste todos los equipos pendientes.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {skipped > 0 && (
                <Button variant="outline" onClick={onResetSkips}>
                  Volver a los que salté
                </Button>
              )}
              <Button asChild>
                <Link
                  to="/projects/$projectId/decisions"
                  params={{ projectId: 'infra-futuro' }}
                >
                  Ir a decisiones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const share = total ? Math.round((done / total) * 100) : 100
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground tabular-nums">
        Revisaste {done} de {total} pendientes
      </p>
      <div
        role="progressbar"
        aria-label="Equipos pendientes revisados"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-secondary"
      >
        <div className="h-full bg-primary" style={{ width: `${share}%` }} />
      </div>
    </div>
  )
}

function ScorePanel({
  applicationId,
  onSkip,
}: {
  applicationId: string
  onSkip: () => void
}) {
  const router = useRouter()
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!score || saving) return
    setSaving(true)
    setError(null)
    const result = await saveReview({
      data: { projectId: 'infra-futuro', applicationId, score, note },
    }).catch(() => ({ ok: false as const, message: 'No pudimos guardar el puntaje. Intenta de nuevo.' }))
    if (result.ok) await router.invalidate()
    else setError(result.message)
    setSaving(false)
  }

  // 1–4 picks a score from the keyboard, outside the note
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return
      const value = Number(event.key)
      if (SCORES.some((s) => s === value)) setScore(value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Card className="sticky bottom-0 z-10 shadow-lg">
      <CardHeader>
        <CardTitle>
          <h2>¿Lo invitarías?</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="radiogroup"
          aria-label="Puntaje"
          className="grid grid-cols-2 gap-2 @min-[40rem]/page:grid-cols-4"
        >
          {SCORES.map((value) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={score === value}
              aria-label={`${value} · ${SCORE_LABELS[value]}`}
              variant={score === value ? 'default' : 'outline'}
              onClick={() => setScore(value)}
              className="justify-start"
            >
              <span className="tabular-nums">{value}</span>
              <span>{SCORE_LABELS[value]}</span>
            </Button>
          ))}
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Nota (opcional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Lo que viste y quieres que el resto sepa"
            className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={saving}>
            <SkipForward aria-hidden="true" />
            Saltar
          </Button>
          <Button onClick={save} disabled={!score || saving} aria-busy={saving}>
            {saving ? 'Guardando…' : 'Guardar y siguiente'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
