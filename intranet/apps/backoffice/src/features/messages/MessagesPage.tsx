import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { AlertCircle, Mail, MailX, Send } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES, type Status } from '@convex/admin/status'
import { EDIT_LINK_DAYS, LINK_TAG, NAME_TAG, messageEmail } from '@convex/admin/emailTemplates'
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAudience, sendMessage, type AudienceInput } from '../../server/functions'
import { STATUS_LABELS, people, santiago } from '../labels'

type List = FunctionReturnType<typeof api.admin.messages.list>
type Settings = FunctionReturnType<typeof api.admin.settings.get>
type Result = {
  status: 'ready' | 'unconfigured' | 'unavailable'
  data: { messages: List; settings: Settings; refs: string[] } | null
}

const TEMPLATES = [
  {
    label: 'Pedir más información',
    subject: 'Una pregunta sobre tu postulación · Infra Futuro 2026',
    body: `hola ${NAME_TAG},\n\nestamos revisando tu postulación a infra futuro 2026 y nos gustaría saber más sobre\n\nresponde a este correo y lo vemos.`,
  },
  {
    label: 'Corregir su postulación',
    subject: 'Revisa tu postulación · Infra Futuro 2026',
    body: `hola ${NAME_TAG},\n\nvimos algo que conviene revisar en tu postulación a infra futuro 2026:\n\npuedes corregirla en este enlace privado, válido por ${EDIT_LINK_DAYS} días. no lo compartas, abre solo tus respuestas:\n\n${LINK_TAG}\n\nsi tienes dudas, responde a este correo.`,
  },
]

const STATE_LABELS = { sent: 'enviados', queued: 'en cola', skipped: 'no enviados', failed: 'fallaron' } as const

export function MessagesPage({
  result,
  fixedAudience,
}: {
  result: Result
  /** set when arriving from a team's page: this one person or team */
  fixedAudience?: AudienceInput
}) {
  const router = useRouter()
  const data = result.data
  const [status, setStatus] = useState<Status | ''>('')
  const [ref, setRef] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [review, setReview] = useState<{ count: number; sample: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const audience: AudienceInput = fixedAudience ?? {
    kind: 'group',
    ...(status ? { status } : {}),
    ...(ref ? { ref } : {}),
  }
  const sending = data?.settings.messageEmails === 'send' && !!data.settings.replyTo
  const preview = review && messageEmail(subject, body, review.sample[0] ?? 'Nombre', 'https://hackinfrafuturo.cl/corregir#enlace-privado')

  async function check() {
    setBusy(true)
    setError(null)
    setDone(null)
    const result = await getAudience({ data: { projectId: 'infra-futuro', audience } }).catch(() => ({
      ok: false as const,
      message: 'No pudimos revisar a quién llega.',
    }))
    setBusy(false)
    if (!result.ok) return setError(result.message)
    if (!result.result.count) return setError('Nadie coincide con estos filtros.')
    setReview(result.result)
  }

  async function send() {
    if (!review) return
    setBusy(true)
    setError(null)
    const result = await sendMessage({
      data: { projectId: 'infra-futuro', audience, subject, body, expected: review.count },
    }).catch(() => ({ ok: false as const, message: 'No pudimos enviar el correo. Intenta de nuevo.' }))
    setBusy(false)
    if (!result.ok) {
      setReview(null)
      return setError(result.message)
    }
    setDone(
      sending
        ? `Listo: va en camino a ${people(result.result.recipients)}.`
        : `Registrado para ${people(result.result.recipients)}, sin enviar: los correos están desactivados aquí.`,
    )
    setReview(null)
    setSubject('')
    setBody('')
    await router.invalidate()
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
            <BreadcrumbPage>Correos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-3">
        <Badge variant="secondary">Infra Futuro · 2026</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Correos</h1>
        <p className="text-sm text-muted-foreground">
          Escríbele a una persona, a un equipo o a un grupo: para pedir más
          información o para que corrija su postulación.
        </p>
      </header>

      {!data ? (
        <Alert role="status">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            <h2>
              {result.status === 'unconfigured'
                ? 'Falta conectar el proyecto'
                : 'No pudimos cargar los correos'}
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
          {!sending && (
            <Alert role="status">
              <MailX aria-hidden="true" />
              <AlertTitle>
                <h2>Correos desactivados</h2>
              </AlertTitle>
              <AlertDescription>
                En este entorno quedan registrados, pero no se envían. Se activan
                con MESSAGE_EMAILS=send y EMAIL_REPLY_TO en Convex.
              </AlertDescription>
            </Alert>
          )}

          {done && (
            <p role="status" className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
              {done}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Nuevo correo</h2>
              </CardTitle>
              <CardDescription>
                {data.settings.replyTo
                  ? `Las respuestas llegan a ${data.settings.replyTo}.`
                  : 'Falta definir a dónde llegan las respuestas (EMAIL_REPLY_TO).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {fixedAudience ? (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Para:</span>
                  {fixedAudience.kind === 'member' ? 'una persona' : 'todo el equipo'}
                  <Link
                    to="/projects/$projectId/messages"
                    params={{ projectId: 'infra-futuro' }}
                    className="underline underline-offset-4"
                  >
                    Elegir un grupo
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Estado</span>
                    <select
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value as Status | '')
                        setReview(null)
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm dark:bg-input/30"
                    >
                      <option value="">Todos</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {data.refs.length > 0 && (
                    <label className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Referido</span>
                      <select
                        value={ref}
                        onChange={(event) => {
                          setRef(event.target.value)
                          setReview(null)
                        }}
                        className="h-8 max-w-full rounded-md border border-input bg-background px-2 text-sm dark:bg-input/30"
                      >
                        <option value="">Todos</option>
                        {data.refs.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSubject(template.subject)
                      setBody(template.body)
                      setReview(null)
                    }}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>

              <label className="block space-y-1.5">
                <span className="text-muted-foreground">Asunto</span>
                <Input
                  value={subject}
                  maxLength={200}
                  onChange={(event) => {
                    setSubject(event.target.value)
                    setReview(null)
                  }}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-muted-foreground">Mensaje</span>
                <textarea
                  value={body}
                  maxLength={5000}
                  rows={10}
                  onChange={(event) => {
                    setBody(event.target.value)
                    setReview(null)
                  }}
                  className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {NAME_TAG} se reemplaza por su nombre. {LINK_TAG} se reemplaza por
                un enlace privado para corregir su postulación, único para cada
                persona y válido por {EDIT_LINK_DAYS} días.
              </p>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            {!review && (
              <CardFooter className="justify-end">
                <Button onClick={check} disabled={busy || !subject.trim() || !body.trim()} aria-busy={busy}>
                  Revisar antes de enviar
                </Button>
              </CardFooter>
            )}
          </Card>

          {review && preview && (
            <Card role="dialog" aria-labelledby="send-title" className="border-ring shadow-lg">
              <CardHeader>
                <CardTitle>
                  <h2 id="send-title" className="flex items-center gap-2">
                    <Mail className="size-4" aria-hidden="true" />
                    Llega a {people(review.count)}
                  </h2>
                </CardTitle>
                <CardDescription className="[overflow-wrap:anywhere]">
                  {review.sample.join(', ')}
                  {review.count > review.sample.length ? ' y más' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Asunto: <span className="text-foreground">{preview.subject}</span>
                  </p>
                  <p className="text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">{preview.text}</p>
                </div>
                {!sending && (
                  <p className="text-muted-foreground">
                    En este entorno quedará registrado, pero no se envía.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setReview(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={send} disabled={busy} aria-busy={busy}>
                  <Send aria-hidden="true" />
                  {busy ? 'Enviando…' : sending ? `Enviar a ${people(review.count)}` : 'Registrar'}
                </Button>
              </CardFooter>
            </Card>
          )}

          <section aria-labelledby="sent-title" className="space-y-3">
            <h2 id="sent-title" className="text-lg font-semibold tracking-tight">
              Enviados
            </h2>
            <Card>
              <CardContent>
                {data.messages.length ? (
                  <ul className="divide-y text-sm">
                    {data.messages.map((message) => (
                      <li key={message._id} className="space-y-1 py-3">
                        <p className="font-medium [overflow-wrap:anywhere]">{message.subject}</p>
                        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                          {message.actor} · {santiago(message._creationTime)} ·{' '}
                          {people(message.recipients)} ·{' '}
                          {message.states
                            .map(({ state, count }) => `${count} ${STATE_LABELS[state]}`)
                            .join(', ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    Todavía no se ha enviado ningún correo.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </>
  )
}
