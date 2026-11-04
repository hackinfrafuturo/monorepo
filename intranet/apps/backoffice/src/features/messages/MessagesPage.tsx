import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { MailX, Send } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'
import { STATUSES, type Status } from '@convex/admin/status'
import { EDIT_LINK_DAYS, LINK_TAG, NAME_TAG, messageEmail } from '@convex/admin/emailTemplates'
import { DataNotice, PageHeader, Select, textareaClass } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  initialStatus,
  initialRef,
}: {
  result: Result
  /** set when arriving from a team's page: this one person or team */
  fixedAudience?: AudienceInput
  /** set when arriving from a filtered list */
  initialStatus?: Status
  initialRef?: string
}) {
  const router = useRouter()
  const data = result.data
  const [status, setStatus] = useState<Status | ''>(initialStatus ?? '')
  const [ref, setRef] = useState(initialRef ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [reach, setReach] = useState<{ count: number; sample: string[] } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const bodyField = useRef<HTMLTextAreaElement>(null)
  const audience: AudienceInput = fixedAudience ?? {
    kind: 'group',
    ...(status ? { status } : {}),
    ...(ref ? { ref } : {}),
  }
  const audienceKey = JSON.stringify(audience)
  const sending = data?.settings.messageEmails === 'send' && !!data.settings.replyTo
  const hasDraft = Boolean(subject.trim() && body.trim())
  const preview = messageEmail(
    subject,
    body,
    reach?.sample[0] ?? 'Nombre',
    'https://hackinfrafuturo.cl/corregir#enlace-privado',
  )

  // who this reaches, always in view while writing
  useEffect(() => {
    let live = true
    setReach(null)
    getAudience({ data: { projectId: 'infra-futuro', audience: JSON.parse(audienceKey) as AudienceInput } })
      .then((result) => live && setReach(result.ok ? result.result : null))
      .catch(() => live && setReach(null))
    return () => {
      live = false
    }
  }, [audienceKey])

  /** adds {nombre} or {enlace} where the cursor is */
  function insert(tag: string) {
    const field = bodyField.current
    const at = field?.selectionStart ?? body.length
    setBody(body.slice(0, at) + tag + body.slice(field?.selectionEnd ?? at))
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(at + tag.length, at + tag.length)
    })
  }

  async function send() {
    if (!reach) return
    setBusy(true)
    setError(null)
    const result = await sendMessage({
      data: { projectId: 'infra-futuro', audience, subject, body, expected: reach.count },
    }).catch(() => ({ ok: false as const, message: 'No pudimos enviar el correo. Intenta de nuevo.' }))
    setBusy(false)
    setConfirming(false)
    if (!result.ok) return setError(result.message)
    setDone(
      sending
        ? `Listo: va en camino a ${people(result.result.recipients)}.`
        : `Registrado para ${people(result.result.recipients)}, sin enviar: los correos están desactivados aquí.`,
    )
    setSubject('')
    setBody('')
    await router.invalidate()
  }

  return (
    <>
      <PageHeader
        title="Correos"
        description="Escríbele a una persona, a un equipo o a un grupo: para pedir más información o para que corrija su postulación."
      />

      {!data ? (
        <DataNotice status={result.status} what="los correos" />
      ) : (
        <>
          {!sending && (
            <Alert role="status">
              <MailX aria-hidden="true" />
              <AlertTitle>
                <h2>Correos desactivados</h2>
              </AlertTitle>
              <AlertDescription>
                En este entorno quedan registrados, pero no se envían. Se activan con
                MESSAGE_EMAILS=send y EMAIL_REPLY_TO en Convex.
              </AlertDescription>
            </Alert>
          )}

          {done && (
            <p role="status" className="border-l-2 border-primary bg-muted/60 px-4 py-2.5 text-sm">
              {done}
            </p>
          )}

          <div className="grid min-w-0 gap-x-10 gap-y-6 @min-[58rem]/page:grid-cols-2">
            <section aria-label="Nuevo correo" className="min-w-0 space-y-4 border-t border-foreground pt-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {fixedAudience ? (
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Para</span>
                    <span className="[overflow-wrap:anywhere]">
                      {reach ? reach.sample.join(', ') : '…'}
                    </span>
                    <Link
                      to="/projects/$projectId/messages"
                      params={{ projectId: 'infra-futuro' }}
                      className="text-xs underline decoration-input underline-offset-4 hover:bg-foreground hover:text-background"
                    >
                      Elegir un grupo
                    </Link>
                  </p>
                ) : (
                  <>
                    <Select
                      label="Estado"
                      value={status}
                      onChange={(value) => setStatus(value as Status | '')}
                    >
                      <option value="">Todos</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                    {data.refs.length > 0 && (
                      <Select label="Referido" value={ref} onChange={setRef}>
                        <option value="">Todos</option>
                        {data.refs.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-xs text-muted-foreground">Plantillas</span>
                {TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSubject(template.subject)
                      setBody(template.body)
                      setDone(null)
                    }}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Asunto</span>
                <Input
                  value={subject}
                  maxLength={200}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Mensaje</span>
                <textarea
                  ref={bodyField}
                  value={body}
                  maxLength={5000}
                  rows={12}
                  onChange={(event) => setBody(event.target.value)}
                  className={textareaClass}
                />
              </label>
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span className="mr-1">Insertar</span>
                <Button type="button" size="xs" variant="outline" onClick={() => insert(NAME_TAG)}>
                  Su nombre
                </Button>
                <Button type="button" size="xs" variant="outline" onClick={() => insert(LINK_TAG)}>
                  Enlace para corregir
                </Button>
              </div>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
            </section>

            <aside aria-label="Vista previa" className="min-w-0 space-y-3 border-t border-foreground pt-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p aria-live="polite">
                  {reach ? (
                    <>
                      Llega a <span className="font-pixel text-xl leading-none">{people(reach.count)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Calculando a quién llega…</span>
                  )}
                </p>
                <Button
                  size="sm"
                  disabled={!hasDraft || !reach?.count}
                  onClick={() => {
                    setError(null)
                    setConfirming(true)
                  }}
                >
                  <Send aria-hidden="true" />
                  {sending ? 'Enviar' : 'Registrar'}
                </Button>
              </div>
              <div className="space-y-2 bg-muted/60 p-4">
                {hasDraft ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Asunto: <span className="text-foreground">{preview.subject}</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{preview.text}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Elige una plantilla o escribe tu mensaje. Aquí ves cómo le llega a{' '}
                    {reach?.sample[0] ?? 'cada persona'}.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.settings.replyTo
                  ? `Las respuestas llegan a ${data.settings.replyTo}.`
                  : 'Falta definir a dónde llegan las respuestas (EMAIL_REPLY_TO).'}{' '}
                El enlace es único para cada persona y dura {EDIT_LINK_DAYS} días.
              </p>
            </aside>
          </div>

          {confirming && reach && (
            <Sheet open onOpenChange={(open) => !open && !busy && setConfirming(false)}>
              <SheetContent className="w-full gap-0 sm:max-w-md">
                <SheetHeader className="border-b pr-10">
                  <SheetTitle className="font-pixel text-2xl leading-tight font-medium">
                    Enviar a {people(reach.count)}
                  </SheetTitle>
                  <SheetDescription className="[overflow-wrap:anywhere]">
                    {reach.sample.join(', ')}
                    {reach.count > reach.sample.length ? ' y más' : ''}
                  </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                  <div className="space-y-2 bg-muted/60 p-3 text-xs">
                    <p className="text-muted-foreground">
                      Asunto: <span className="text-foreground">{preview.subject}</span>
                    </p>
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{preview.text}</p>
                  </div>
                  {!sending && (
                    <p className="text-sm text-muted-foreground">
                      En este entorno quedará registrado, pero no se envía.
                    </p>
                  )}
                </div>
                <SheetFooter className="mt-0 flex-row justify-end border-t">
                  <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button onClick={send} disabled={busy} aria-busy={busy}>
                    {busy ? 'Enviando…' : sending ? `Enviar a ${people(reach.count)}` : 'Registrar'}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}

          <section aria-labelledby="sent-title" className="space-y-2">
            <h2 id="sent-title" className="border-t border-foreground pt-3 text-sm">
              Enviados
            </h2>
            {data.messages.length ? (
              <ul className="divide-y text-sm">
                {data.messages.map((message) => (
                  <li
                    key={message._id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">{message.subject}</span>
                    <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {message.actor} · {santiago(message._creationTime)} ·{' '}
                      {message.states
                        .map(({ state, count }) => `${count} ${STATE_LABELS[state]}`)
                        .join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted-foreground">
                Todavía no se ha enviado ningún correo.
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}
