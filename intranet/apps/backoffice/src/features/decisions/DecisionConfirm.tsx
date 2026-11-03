import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, Mail, MailX } from 'lucide-react'
import type { Status } from '@convex/admin/status'
import { STATUS_DECISIONS } from '@convex/admin/status'
import { decisionEmail } from '@convex/admin/emailTemplates'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
}

/**
 * The last step before a decision: who it applies to, what it does to the places left, and the exact
 * email each member gets. Nothing changes until it's confirmed.
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
  const decision = STATUS_DECISIONS.find((d) => d === status)
  const preview = decision && decisionEmail(decision, moving[0]?.names[0] ?? 'nombre')
  // places: accepting adds people, moving accepted teams elsewhere frees theirs
  const freed = moving
    .filter((team) => team.status === 'accepted')
    .reduce((sum, team) => sum + team.size, 0)
  const after =
    acceptedPeople - freed + (status === 'accepted' ? peopleCount : 0)
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
    <Card
      role="dialog"
      aria-labelledby="confirm-title"
      className="border-ring shadow-lg"
    >
      <CardHeader>
        <CardTitle>
          <h2 id="confirm-title">
            {ACTION_LABELS[status]}: {teamsLabel(moving.length)} ·{' '}
            {people(peopleCount)}
          </h2>
        </CardTitle>
        <CardDescription>
          Pasan a {STATUS_LABELS[status]}. Queda registrado con tu nombre.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-3">
          {moving.map((team) => (
            <li key={team._id} className="[overflow-wrap:anywhere]">
              {team.names.join(', ')}{' '}
              <span className="text-muted-foreground">
                · {STATUS_LABELS[team.status]}
              </span>
            </li>
          ))}
        </ul>

        {left !== null && (status === 'accepted' || freed > 0) && (
          <p
            className={
              left < 0
                ? 'flex items-center gap-2 font-medium text-destructive'
                : 'text-muted-foreground'
            }
          >
            {left < 0 && <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />}
            {left < 0
              ? `Superarías los cupos por ${people(-left)}.`
              : `Quedarían ${people(left)} de cupo libre.`}
          </p>
        )}

        {preview ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-medium">
              {emailsMode === 'send' ? (
                <Mail className="size-4" aria-hidden="true" />
              ) : (
                <MailX className="size-4" aria-hidden="true" />
              )}
              {emailsMode === 'send'
                ? `Se enviará un correo a cada integrante (${people(peopleCount)}).`
                : 'En este entorno los correos no se envían: quedan registrados como no enviados.'}
            </p>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Asunto: <span className="text-foreground">{preview.subject}</span>
              </p>
              <p className="text-xs whitespace-pre-wrap">{preview.text}</p>
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
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
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
      </CardFooter>
    </Card>
  )
}
