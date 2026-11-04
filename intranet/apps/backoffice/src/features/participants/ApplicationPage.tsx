import { useState, type ReactNode } from 'react'
import { Link, getRouteApi, useCanGoBack, useRouter } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, ChevronDown, Mail } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES, canMove, type Status } from '@convex/admin/status'
import { DataNotice, PageHeader } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { saveReview } from '../../server/functions'
import {
  DIET_LABELS,
  FIELD_LABELS,
  GENDER_LABELS,
  SCORE_LABELS,
  STATUS_LABELS,
  describeEntry,
  santiago,
  score,
  teamSize,
} from '../labels'
import { ACTION_LABELS, DecisionConfirm } from '../decisions/DecisionConfirm'
import { ScorePicker } from '../review/ScorePicker'
import { StatusBadge } from './StatusBadge'
import { MemberCard } from './MemberCard'

type Application = NonNullable<FunctionReturnType<typeof api.admin.applications.get>>
type Settings = FunctionReturnType<typeof api.admin.settings.get>
type Result = {
  status: 'ready' | 'notFound' | 'unconfigured' | 'unavailable'
  data: (Application & { settings: Settings; acceptedPeople: number }) | null
}

const EMAIL_STATES = {
  queued: 'En cola',
  sent: 'Enviado',
  skipped: 'No enviado',
  failed: 'Falló',
} as const

const root = getRouteApi('__root__')

/** back to the list exactly as it was left, filters included */
function BackLink() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const className =
    'inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-75 hover:bg-accent hover:text-foreground'
  return canGoBack ? (
    <button type="button" onClick={() => router.history.back()} className={className}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver
    </button>
  ) : (
    <Link
      to="/projects/$projectId/participants"
      params={{ projectId: 'infra-futuro' }}
      className={className}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Participantes
    </Link>
  )
}

function Rail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2 border-t border-foreground pt-3">
      <h2 className="text-sm">{title}</h2>
      {children}
    </section>
  )
}

export function ApplicationPage({ result }: { result: Result }) {
  const application = result.data
  const [action, setAction] = useState<Status | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!application) {
    return (
      <>
        <BackLink />
        {result.status === 'notFound' ? (
          <Alert role="status">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>
              <h1>No encontramos esta inscripción</h1>
            </AlertTitle>
            <AlertDescription>Puede que el enlace esté incompleto.</AlertDescription>
          </Alert>
        ) : (
          <DataNotice status={result.status} what="la inscripción" />
        )}
      </>
    )
  }

  const title = application.members.map((member) => member.name).join(', ')
  const targets = STATUSES.filter((target) => canMove(application.status, target))
  const average = application.reviews.length
    ? application.reviews.reduce((sum, review) => sum + review.score, 0) / application.reviews.length
    : null

  return (
    <>
      <BackLink />
      <PageHeader
        compact
        kicker={[teamSize(application.size), application.ref && `Referido: ${application.ref}`]
          .filter(Boolean)
          .join(' · ')}
        title={title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={application.status} className="text-foreground" />
            <span>
              · inscrita el {santiago(application.submittedAt)}
              {application.decidedBy && application.decidedAt && (
                <> · decidió {application.decidedBy} el {santiago(application.decidedAt)}</>
              )}
            </span>
          </span>
        }
      />

      <section aria-label="Decisión" className="flex flex-wrap items-center gap-2">
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
        <Button asChild size="sm" variant="ghost" className="sm:ml-auto">
          <Link
            to="/projects/$projectId/messages"
            params={{ projectId: 'infra-futuro' }}
            search={{ team: application._id }}
          >
            <Mail aria-hidden="true" />
            Escribir al equipo
          </Link>
        </Button>
      </section>

      {message && (
        <p role="status" className="border-l-2 border-primary bg-muted/60 px-4 py-2.5 text-sm">
          {message}
        </p>
      )}

      {action && (
        <DecisionConfirm
          teams={[
            {
              _id: application._id,
              names: application.members.map((member) => member.name),
              size: application.size,
              status: application.status,
              reviews: application.reviews.length,
            },
          ]}
          status={action}
          capacity={application.settings.capacity}
          acceptedPeople={application.acceptedPeople}
          emailsMode={application.settings.decisionEmails}
          onCancel={() => setAction(null)}
          onDone={(text) => {
            setAction(null)
            setMessage(text)
          }}
        />
      )}

      <div className="grid min-w-0 gap-x-10 gap-y-8 @min-[62rem]/page:grid-cols-[minmax(0,1fr)_19rem]">
        <section aria-label="Integrantes" className="min-w-0 space-y-8">
          {application.members.map((member) => (
            <MemberCard key={member._id} member={member} />
          ))}
        </section>

        <aside aria-label="Seguimiento" className="min-w-0 space-y-6">
          <Rail title={average === null ? 'Revisiones' : `Revisiones · promedio ${score(average)}`}>
            {application.reviews.length > 0 && (
              <ul className="divide-y text-sm">
                {application.reviews.map((review) => (
                  <li key={review._id} className="space-y-0.5 py-2">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-muted-foreground" title={review.reviewer}>
                        {review.reviewer}
                      </span>
                      <span className="shrink-0">
                        <span className="font-pixel text-base leading-none">{review.score}</span>{' '}
                        <span className="text-xs">{SCORE_LABELS[review.score]}</span>
                      </span>
                    </p>
                    {review.note && (
                      <p className="whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
                        {review.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <MyScore
              applicationId={application._id}
              reviews={application.reviews}
              count={application.reviews.length}
            />
          </Rail>

          <details className="group border-t border-foreground pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
              Contacto y logística
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-2 divide-y">
              {application.members.map((member) => (
                <div key={member._id} className="min-w-0 space-y-1.5 py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="min-w-0 [overflow-wrap:anywhere]">{member.name}</h3>
                    <Link
                      to="/projects/$projectId/messages"
                      params={{ projectId: 'infra-futuro' }}
                      search={{ member: member._id }}
                      className="shrink-0 text-xs underline decoration-input underline-offset-4 hover:bg-foreground hover:text-background"
                    >
                      Escribirle
                    </Link>
                  </div>
                  <dl className="space-y-0.5 text-xs">
                    <Fact label="Email">
                      <a
                        href={`mailto:${member.email}`}
                        className="underline decoration-input underline-offset-2 [overflow-wrap:anywhere]"
                      >
                        {member.email}
                      </a>
                    </Fact>
                    <Fact label="Alimentación">{DIET_LABELS[member.diet]}</Fact>
                    <Fact label="Alergias">{member.allergies.trim() || 'Ninguna'}</Fact>
                    <Fact label="Ofertas">{member.jobs === 'yes' ? 'Le interesan' : 'No le interesan'}</Fact>
                    <Fact label="Género">{GENDER_LABELS[member.gender]}</Fact>
                  </dl>
                </div>
              ))}
            </div>
          </details>

          {application.emails.length > 0 && (
            <Rail title="Correos de decisión">
              <ul className="divide-y text-xs">
                {application.emails.map((email) => (
                  <li key={email._id} className="space-y-0.5 py-2">
                    <p className="[overflow-wrap:anywhere]">
                      {application.members.find((member) => member._id === email.memberId)?.name ??
                        'Integrante'}{' '}
                      · {STATUS_LABELS[email.decision]}
                    </p>
                    <p className="text-muted-foreground" title={email.error}>
                      {email.state === 'failed' || email.state === 'skipped' ? (
                        <Badge variant="outline">{EMAIL_STATES[email.state]}</Badge>
                      ) : (
                        EMAIL_STATES[email.state]
                      )}{' '}
                      {santiago(email._creationTime)}
                    </p>
                  </li>
                ))}
              </ul>
            </Rail>
          )}

          <Rail title="Historial">
            <ol className="divide-y text-xs">
              {application.history.map((entry) => (
                <li key={entry._id} className="space-y-0.5 py-2">
                  <p className="[overflow-wrap:anywhere]">
                    <span className="text-muted-foreground">{entry.actor}</span>{' '}
                    {describeEntry(entry)}
                  </p>
                  {entry.changes?.map((change) => (
                    <p key={change.field} className="text-muted-foreground [overflow-wrap:anywhere]">
                      {FIELD_LABELS[change.field] ?? change.field}: «{change.from}» → «{change.to}»
                    </p>
                  ))}
                  <time
                    dateTime={new Date(entry._creationTime).toISOString()}
                    className="text-muted-foreground tabular-nums"
                  >
                    {santiago(entry._creationTime)}
                  </time>
                </li>
              ))}
              <li className="py-2">
                <p>Se inscribió</p>
                <time
                  dateTime={new Date(application.submittedAt).toISOString()}
                  className="text-muted-foreground tabular-nums"
                >
                  {santiago(application.submittedAt)}
                </time>
              </li>
            </ol>
          </Rail>
        </aside>
      </div>
    </>
  )
}

/** This organizer's own score, for teams reached from a list rather than the review queue. */
function MyScore({
  applicationId,
  reviews,
  count,
}: {
  applicationId: string
  reviews: Application['reviews']
  count: number
}) {
  const router = useRouter()
  const { login } = root.useLoaderData()
  const mine = reviews.find((review) => review.reviewer === login)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(score: number) {
    setError(null)
    const result = await saveReview({
      data: { projectId: 'infra-futuro', applicationId, score, note: mine?.note },
    }).catch(() => ({ ok: false as const, message: 'No pudimos guardar el puntaje.' }))
    if (!result.ok) return setError(result.message)
    await router.invalidate()
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      {count === 0 && <p className="text-sm text-muted-foreground">Nadie la ha revisado todavía.</p>}
      {open ? (
        <ScorePicker value={mine?.score ?? null} onChange={save} className="sm:grid-cols-2" />
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          {mine ? 'Cambiar mi puntaje' : 'Puntuar'}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}
