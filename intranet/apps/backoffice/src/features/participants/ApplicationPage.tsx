import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  History,
} from 'lucide-react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  DIET_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
  santiago,
  teamSize,
} from '../labels'
import { StatusBadge } from './StatusBadge'

type Application = NonNullable<
  FunctionReturnType<typeof api.admin.applications.get>
>
type Member = Application['members'][number]
type Result = {
  status: 'ready' | 'notFound' | 'unconfigured' | 'unavailable'
  data: Application | null
}

/** the three questions that say the most about someone, in the form's words */
const ESSAYS = [
  ['deep', '¿Qué cosas fuera de lo común hacías mientras crecías?'],
  ['hardest', '¿Qué es lo más difícil que has logrado?'],
  ['favorite', 'De las cosas que has creado, ¿cuál es tu favorita?'],
] as const

/** only http(s) links leave the backoffice; anything else stays as plain text */
function safeUrl(value: string) {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function ApplicationPage({ result }: { result: Result }) {
  const application = result.data
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

          <section aria-label="Integrantes" className="grid min-w-0 gap-4 @min-[56rem]/page:grid-cols-2">
            {application.members.map((member) => (
              <MemberCard key={member._id} member={member} />
            ))}
          </section>

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
                        <span className="font-medium">{entry.actor}</span>
                        {entry.from && entry.to
                          ? ` la movió de ${STATUS_LABELS[entry.from]} a ${STATUS_LABELS[entry.to]}`
                          : ' la modificó'}
                      </p>
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

function MemberCard({ member }: { member: Member }) {
  const links = [
    member.github && {
      label: `github.com/${member.github}`,
      href: safeUrl(`https://github.com/${encodeURIComponent(member.github)}`),
    },
    member.linkedin && {
      label: `linkedin.com/in/${member.linkedin}`,
      href: safeUrl(`https://www.linkedin.com/in/${encodeURIComponent(member.linkedin)}`),
    },
    member.site && { label: member.site, href: safeUrl(member.site) },
  ].filter((link) => !!link)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2 className="[overflow-wrap:anywhere]">{member.name}</h2>
        </CardTitle>
        <CardDescription className="[overflow-wrap:anywhere]">
          {member.role}
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant={member.coding === 'yes' ? 'secondary' : 'outline'}>
            {member.coding === 'yes' ? 'Programa' : 'No programa'}
          </Badge>
        </div>
        {links.length > 0 && (
          <ul className="space-y-1 pt-1 text-sm">
            {links.map((link) => (
              <li key={link.label} className="min-w-0">
                {link.href ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex max-w-full items-center gap-1.5 underline underline-offset-4"
                  >
                    <span className="[overflow-wrap:anywhere]">{link.label}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="[overflow-wrap:anywhere]">{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {ESSAYS.map(([field, question]) => (
          <div key={field} className="space-y-1.5">
            <Separator className="mb-4" />
            <h3 className="text-sm font-medium text-muted-foreground">{question}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
              {member[field]}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
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
