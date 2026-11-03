import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, ChevronDown, History, Mail } from 'lucide-react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DIET_LABELS,
  FIELD_LABELS,
  GENDER_LABELS,
  SCORE_LABELS,
  STATUS_LABELS,
  describeEntry,
  reviewsLabel,
  santiago,
  score,
  teamSize,
} from '../labels'
import { ACTION_LABELS, DecisionConfirm } from '../decisions/DecisionConfirm'
import { StatusBadge } from './StatusBadge'
import { MemberCard } from './MemberCard'

type Application = NonNullable<
  FunctionReturnType<typeof api.admin.applications.get>
>
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

export function ApplicationPage({ result }: { result: Result }) {
  const application = result.data
  const [action, setAction] = useState<Status | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const targets = application
    ? STATUSES.filter((target) => canMove(application.status, target))
    : []
  const average = application?.reviews.length
    ? application.reviews.reduce((sum, review) => sum + review.score, 0) /
      application.reviews.length
    : null
  const title = application
    ? application.members.map((member) => member.name).join(', ')
    : 'Inscripción'
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
            <BreadcrumbLink asChild>
              <Link
                to="/projects/$projectId/participants"
                params={{ projectId: 'infra-futuro' }}
              >
                Participantes
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {application ? (
        <>
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={application.status} />
              <Badge variant="secondary">{teamSize(application.size)}</Badge>
              {application.ref && (
                <Badge variant="outline" className="max-w-full">
                  <span className="truncate">Referido: {application.ref}</span>
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Inscrita el{' '}
              <time dateTime={new Date(application.submittedAt).toISOString()}>
                {santiago(application.submittedAt)}
              </time>
              {application.decidedBy && application.decidedAt && (
                <>
                  {' '}· {STATUS_LABELS[application.status]} por{' '}
                  {application.decidedBy} el {santiago(application.decidedAt)}
                </>
              )}
            </p>
          </header>

          <section aria-label="Decisión" className="space-y-3">
            {message && (
              <p role="status" className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                {message}
              </p>
            )}
            {action ? (
              <DecisionConfirm
                teams={[
                  {
                    _id: application._id,
                    names: application.members.map((member) => member.name),
                    size: application.size,
                    status: application.status,
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
            ) : (
              <div className="flex flex-wrap gap-2">
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
                <Button asChild size="sm" variant="ghost">
                  <Link
                    to="/projects/$projectId/messages"
                    params={{ projectId: 'infra-futuro' }}
                    search={{ team: application._id }}
                  >
                    <Mail aria-hidden="true" />
                    Escribir al equipo
                  </Link>
                </Button>
              </div>
            )}
          </section>

          <section aria-label="Integrantes" className="grid min-w-0 gap-4 @min-[56rem]/page:grid-cols-2">
            {application.members.map((member) => (
              <MemberCard key={member._id} member={member} />
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Revisiones</h2>
              </CardTitle>
              <CardDescription>
                {average === null
                  ? 'Nadie la ha revisado todavía.'
                  : `Promedio ${score(average)} · ${reviewsLabel(application.reviews.length)}`}
              </CardDescription>
            </CardHeader>
            {application.reviews.length > 0 && (
              <CardContent>
                <ul className="divide-y text-sm">
                  {application.reviews.map((review) => (
                    <li key={review._id} className="space-y-1 py-3">
                      <p className="[overflow-wrap:anywhere]">
                        <span className="font-medium">{review.reviewer}</span> ·{' '}
                        <span className="tabular-nums">{review.score}</span>{' '}
                        {SCORE_LABELS[review.score]}
                      </p>
                      {review.note && (
                        <p className="whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
                          {review.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>

          {application.emails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                    Correos de decisión
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {application.emails.map((email) => (
                    <li key={email._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span className="[overflow-wrap:anywhere]">
                        {application.members.find((member) => member._id === email.memberId)?.name ??
                          'Integrante'}{' '}
                        · {STATUS_LABELS[email.decision]}
                      </span>
                      <span
                        className="text-muted-foreground"
                        title={email.error}
                      >
                        {EMAIL_STATES[email.state]} · {santiago(email._creationTime)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <details className="group rounded-xl border bg-card text-card-foreground">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-medium [&::-webkit-details-marker]:hidden">
              <span>
                Contacto y logística
                <span className="block text-sm font-normal text-muted-foreground">
                  Email, alimentación, alergias y más. Para cuando haga falta.
                </span>
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="grid min-w-0 gap-4 border-t px-6 py-4 @min-[44rem]/page:grid-cols-2">
              {application.members.map((member) => (
                <div key={member._id} className="min-w-0 space-y-2 text-sm">
                  <h3 className="font-medium [overflow-wrap:anywhere]">{member.name}</h3>
                  <Link
                    to="/projects/$projectId/messages"
                    params={{ projectId: 'infra-futuro' }}
                    search={{ member: member._id }}
                    className="text-xs underline underline-offset-4"
                  >
                    Escribirle
                  </Link>
                  <dl className="space-y-2">
                  <Fact label="Email">
                    <a
                      href={`mailto:${member.email}`}
                      className="underline underline-offset-4 [overflow-wrap:anywhere]"
                    >
                      {member.email}
                    </a>
                  </Fact>
                  <Fact label="Alimentación">{DIET_LABELS[member.diet]}</Fact>
                  <Fact label="Alergias">{member.allergies.trim() || 'Ninguna'}</Fact>
                  <Fact label="Ofertas laborales">
                    {member.jobs === 'yes' ? 'Le interesan' : 'No le interesan'}
                  </Fact>
                  <Fact label="Género">{GENDER_LABELS[member.gender]}</Fact>
                  </dl>
                </div>
              ))}
            </div>
          </details>

          <section aria-labelledby="history-title" className="space-y-4">
            <h2
              id="history-title"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <History className="size-4 text-muted-foreground" aria-hidden="true" />
              Historial
            </h2>
            <Card>
              <CardContent>
                <ol className="divide-y text-sm">
                  {application.history.map((entry) => (
                    <li key={entry._id} className="space-y-1 py-3">
                      <p className="[overflow-wrap:anywhere]">
                        <span className="font-medium">{entry.actor}</span>{' '}
                        {describeEntry(entry)}
                      </p>
                      {entry.changes?.map((change) => (
                        <p
                          key={change.field}
                          className="text-xs text-muted-foreground [overflow-wrap:anywhere]"
                        >
                          {FIELD_LABELS[change.field] ?? change.field}: «{change.from}» → «{change.to}»
                        </p>
                      ))}
                      <time
                        dateTime={new Date(entry._creationTime).toISOString()}
                        className="text-xs text-muted-foreground tabular-nums"
                      >
                        {santiago(entry._creationTime)}
                      </time>
                    </li>
                  ))}
                  <li className="space-y-1 py-3">
                    <p>Se inscribió</p>
                    <time
                      dateTime={new Date(application.submittedAt).toISOString()}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {santiago(application.submittedAt)}
                    </time>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <>
          <Alert role="status">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>
              <h1>
                {result.status === 'notFound'
                  ? 'No encontramos esta inscripción'
                  : result.status === 'unconfigured'
                    ? 'Falta conectar el proyecto'
                    : 'No pudimos cargar la inscripción'}
              </h1>
            </AlertTitle>
            <AlertDescription>
              {result.status === 'notFound'
                ? 'Puede que el enlace esté incompleto.'
                : result.status === 'unconfigured'
                  ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
                  : 'El servicio de Infra Futuro no está disponible. Intenta en un momento.'}
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-fit">
            <Link
              to="/projects/$projectId/participants"
              params={{ projectId: 'infra-futuro' }}
            >
              <ArrowLeft aria-hidden="true" />
              Volver a participantes
            </Link>
          </Button>
        </>
      )}
    </>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
