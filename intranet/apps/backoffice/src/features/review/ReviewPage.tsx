import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { CircleCheck, NotebookPen, SkipForward } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { DataNotice, DotMeter, Kbd, PageHeader, textareaClass } from '@/components/page'
import { Button } from '@/components/ui/button'
import { saveReview } from '../../server/functions'
import { SCORES, santiago, teamSize } from '../labels'
import { MemberCard } from '../participants/MemberCard'
import { ScorePicker } from './ScorePicker'

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
    // as tall as the screen, so the score bar sits in the same place for every team
    <div className="flex min-h-[calc(100svh-6.5rem)] flex-col gap-6">
      <PageHeader
        title="Revisar"
        description="Un equipo a la vez. Sin email, género ni puntajes de los demás, para juzgar solo lo que hicieron."
        actions={
          queue ? (
            <div className="w-44 space-y-1 text-right">
              <p className="text-xs text-muted-foreground tabular-nums">
                {queue.reviewedByMe} de {queue.pending} revisadas
              </p>
              <DotMeter value={queue.reviewedByMe} max={queue.pending} label="Equipos pendientes revisados" />
            </div>
          ) : undefined
        }
      />

      {!queue ? (
        <DataNotice status={result.status} what="la revisión" />
      ) : application ? (
        <>
          <section aria-labelledby="team-title" className="space-y-4">
            <p id="team-title" className="text-sm text-muted-foreground">
              {teamSize(application.size)} · inscrita el {santiago(application.submittedAt, false)}
            </p>
            <div
              className={`grid min-w-0 gap-x-10 gap-y-8 ${application.members.length > 1 ? '@min-[58rem]/page:grid-cols-2' : ''}`}
            >
              {application.members.map((member) => (
                <MemberCard key={member._id} member={member} />
              ))}
            </div>
          </section>
          <ScoreBar
            key={application._id}
            applicationId={application._id}
            onSkip={() => onSkip(application._id)}
          />
        </>
      ) : (
        <div className="space-y-4 border-t border-foreground pt-4">
          <p className="flex items-center gap-2 font-pixel text-2xl leading-tight">
            <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
            {skipped ? 'Solo quedan las que saltaste' : 'Revisaste todas las pendientes'}
          </p>
          <div className="flex flex-wrap gap-2">
            {skipped > 0 && (
              <Button variant="outline" onClick={onResetSkips}>
                Volver a las que salté
              </Button>
            )}
            <Button asChild>
              <Link to="/projects/$projectId/decisions" params={{ projectId: 'infra-futuro' }}>
                Ir a decisiones
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Stays at the bottom of the screen while the answers scroll, and works from the keyboard. */
function ScoreBar({ applicationId, onSkip }: { applicationId: string; onSkip: () => void }) {
  const router = useRouter()
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteField = useRef<HTMLTextAreaElement>(null)
  // the keyboard handler is set once; this keeps it reading the latest save and skip
  const actions = useRef({ save: () => {}, skip: onSkip })

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

  useEffect(() => {
    actions.current = { save: () => void save(), skip: onSkip }
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return
      if (event.key === 'Enter' && target instanceof HTMLElement && target.closest('a, button')) return
      const value = Number(event.key)
      if (SCORES.some((s) => s === value)) setScore(value)
      else if (event.key === 'Enter') actions.current.save()
      else if (event.key === 's') actions.current.skip()
      else if (event.key === 'n') {
        event.preventDefault()
        setNoteOpen(true)
        requestAnimationFrame(() => noteField.current?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section
      aria-label="Puntuar este equipo"
      className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-auto space-y-2 border-t border-foreground bg-background px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      {noteOpen && (
        <textarea
          ref={noteField}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') (event.target as HTMLElement).blur()
          }}
          maxLength={2000}
          rows={2}
          aria-label="Nota para el equipo organizador"
          placeholder="Lo que viste y quieres que el resto sepa"
          className={textareaClass}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ScorePicker value={score} onChange={setScore} className="min-w-0 flex-1 basis-96" />
        <div className="ml-auto flex items-center gap-1">
          {!noteOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNoteOpen(true)
                requestAnimationFrame(() => noteField.current?.focus())
              }}
            >
              <NotebookPen aria-hidden="true" />
              Nota <Kbd>N</Kbd>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={saving}>
            <SkipForward aria-hidden="true" />
            Saltar <Kbd>S</Kbd>
          </Button>
          <Button size="sm" onClick={save} disabled={!score || saving} aria-busy={saving}>
            {saving ? 'Guardando…' : 'Guardar y seguir'} <Kbd>↵</Kbd>
          </Button>
        </div>
      </div>
    </section>
  )
}
