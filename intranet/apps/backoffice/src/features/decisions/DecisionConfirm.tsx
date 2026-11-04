import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, Mail, MailX } from 'lucide-react'
import type { Status } from '@convex/admin/status'
import { STATUS_DECISIONS } from '@convex/admin/status'
import { decisionEmail } from '@convex/admin/emailTemplates'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { decide } from '../../server/functions'
import { STATUS_LABELS, people, teams as teamsLabel } from '../labels'

export const ACTION_LABELS: Record<Status, string> = {
  accepted: 'Aceptar',
  waitlisted: 'Lista de espera',
  rejected: 'Rechazar',
  pending: 'Volver a pendiente',
  withdrawn: 'Marcar como retirada',
}

export type Team = {
  _id: string
  names: string[]
  size: number
  status: Status
  /** how many organizers scored it, when the page knows */
  reviews?: number
  /** how many members still lack the ID the venue requires */
  missingIds?: number
}

/**
 * The last step before a decision, in a side panel so the list stays where it was: who it applies to,
 * what it does to the places left, and the exact email each member gets. Nothing changes until confirmed.
 */
export function DecisionConfirm({
  teams,
  status,
  capacity,
  acceptedPeople,
  emailsMode,
  onCancel,
  onDone,
}: {
  teams: Team[]
  status: Status
  capacity: number | null
  acceptedPeople: number
  emailsMode: 'send' | 'off'
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const moving = teams.filter((team) => team.status !== status)
  const peopleCount = moving.reduce((sum, team) => sum + team.size, 0)
  const unreviewed = moving.filter((team) => team.reviews === 0).length
  const missingIds = moving.reduce((sum, team) => sum + (team.missingIds ?? 0), 0)
  const decision = STATUS_DECISIONS.find((d) => d === status)
  const preview = decision && decisionEmail(decision, moving[0]?.names[0] ?? 'nombre')
  // places: accepting adds people, moving accepted teams elsewhere frees theirs
  const freed = moving
    .filter((team) => team.status === 'accepted')
    .reduce((sum, team) => sum + team.size, 0)
  const after = acceptedPeople - freed + (status === 'accepted' ? peopleCount : 0)
  const left = capacity === null ? null : capacity - after

  async function confirm() {
    setSaving(true)
    setError(null)
    const result = await decide({
      data: {
        projectId: 'infra-futuro',
        applicationIds: moving.map((team) => team._id),
        status,
      },
    }).catch(() => ({
      ok: false as const,
      message: 'No pudimos guardar la decisión. Intenta de nuevo.',
    }))
    setSaving(false)
    if (!result.ok) return setError(result.message)
    await router.invalidate()
    const { changed, emails } = result.result
    onDone(
      `Listo: ${teamsLabel(changed)} en ${STATUS_LABELS[status]}${
        emails
          ? emailsMode === 'send'
            ? ` · ${emails} ${emails === 1 ? 'correo' : 'correos'} en camino`
            : ` · ${emails} ${emails === 1 ? 'correo registrado' : 'correos registrados'} sin enviar`
          : ''
      }.`,
    )
  }

  return (
    <Sheet open onOpenChange={(open) => !open && !saving && onCancel()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b pr-10">
          <SheetTitle className="font-pixel text-2xl leading-tight font-medium">
            {ACTION_LABELS[status]}
          </SheetTitle>
          <SheetDescription>
            {teamsLabel(moving.length)} · {people(peopleCount)}. Queda registrado con tu nombre.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm">
          <ul className="max-h-48 divide-y overflow-y-auto border-y">
            {moving.map((team) => (
              <li key={team._id} className="py-1.5 [overflow-wrap:anywhere]">
                {team.names.join(', ')}{' '}
                <span className="text-xs text-muted-foreground">· {STATUS_LABELS[team.status]}</span>
              </li>
            ))}
          </ul>

          {status === 'accepted' && unreviewed > 0 && (
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {unreviewed === 1
                ? 'Una de estas inscripciones no tiene revisiones.'
                : `${unreviewed} de estas inscripciones no tienen revisiones.`}
            </p>
          )}

          {status === 'accepted' && missingIds > 0 && (
            <p className="flex items-start gap-2 text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {missingIds === 1
                ? 'A una persona le falta el RUT, y la seguridad del recinto lo exige.'
                : `A ${missingIds} personas les falta el RUT, y la seguridad del recinto lo exige.`}
            </p>
          )}

          {left !== null && (status === 'accepted' || freed > 0) && (
            <p
              className={
                left < 0 ? 'flex items-start gap-2 text-destructive' : 'text-muted-foreground'
              }
            >
              {left < 0 && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              {left < 0
                ? `Superarías los cupos por ${people(-left)}.`
                : `Quedarían ${people(left)} de cupo libre.`}
            </p>
          )}

          {preview ? (
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                {emailsMode === 'send' ? (
                  <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <MailX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                )}
                {emailsMode === 'send'
                  ? `Se enviará un correo a cada integrante (${people(peopleCount)}).`
                  : 'En este entorno los correos no se envían: quedan registrados como no enviados.'}
              </p>
              <div className="space-y-2 bg-muted/60 p-3 text-xs">
                <p className="text-muted-foreground">
                  Asunto: <span className="text-foreground">{preview.subject}</span>
                </p>
                <p className="whitespace-pre-wrap">{preview.text}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Este cambio no envía correos.</p>
          )}

          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </div>
        <SheetFooter className="mt-0 flex-row justify-end border-t">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={saving || !moving.length}
            aria-busy={saving}
            variant={status === 'rejected' ? 'destructive' : 'default'}
          >
            {saving
              ? 'Guardando…'
              : decision && emailsMode === 'send'
                ? `Confirmar y enviar ${peopleCount} ${peopleCount === 1 ? 'correo' : 'correos'}`
                : 'Confirmar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
