import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@base-ui/react/button'
import { ConvexError } from 'convex/values'
import { MemberForm } from './apply/MemberForm'
import { addTeammate, loadCorrection, loadTeam, saveCorrection, type TeamRoom } from './apply/correct'
import { FIELD_ORDER, TEAM_MAX, emptyMember, fieldId, firstErrorKey, type Member } from './apply/model'
import { checkTeam } from './apply/schema'
import { memberAt, memberPath, useApplyForm } from './apply/use-apply-form'
import { applyMessages } from './i18n/apply'
import { HOME, htmlLang, type Locale } from './i18n/locale'
import { useLocale } from './i18n/use-locale'

/**
 * Where an applicant corrects their own answers, from the private link an organizer emailed them
 * (convex/admin/messages.ts). The token sits after the # so it never reaches a server log or analytics.
 * It opens this one person's answers, through the application's own form and rules, and while the team
 * is pending it can add someone who was left off.
 */

const COPY: Record<
  Locale,
  {
    kicker: string
    title: string
    hint: string
    save: string
    saving: string
    loading: string
    invalidTitle: string
    invalidBody: string
    doneTitle: string
    doneBody: string
    noChanges: string
    failed: string
    takenEmail: string
    takenGithub: string
    takenId: string
    home: string
    offerTitle: string
    offerBody: (size: number) => string
    offerAction: string
    addTitle: string
    addHint: string
    add: string
    adding: string
    addCancel: string
    added: (name: string) => string
    teamDecided: string
    teamFull: string
  }
> = {
  es: {
    kicker: 'tu postulación',
    title: 'Corrige tus respuestas',
    hint: 'Solo tú ves este enlace. Cambia lo que necesites y guarda. No lo compartas.',
    save: 'Guardar cambios',
    saving: 'Guardando…',
    loading: 'Abriendo tu postulación…',
    invalidTitle: 'Este enlace ya no sirve',
    invalidBody: 'Puede que haya vencido o que te hayamos enviado uno más nuevo. Responde a nuestro correo y te mandamos otro.',
    doneTitle: 'Listo, gracias',
    doneBody: 'Guardamos tus cambios. Ya puedes cerrar esta página.',
    noChanges: 'No cambiaste nada. Si era eso, ya puedes cerrar esta página.',
    failed: 'No pudimos guardar. Intenta de nuevo.',
    takenEmail: 'Ese email ya está en otra postulación.',
    takenGithub: 'Ese GitHub ya está en otra postulación.',
    takenId: 'Ese documento ya está en otra postulación.',
    home: 'Ir al inicio',
    offerTitle: '¿Te faltó alguien en el equipo?',
    offerBody: (size) =>
      `Tu equipo tiene ${size === 1 ? '1 persona' : `${size} personas`} y pueden ser hasta ${TEAM_MAX}. Puedes sumar a quien te faltó antes de que revisemos la postulación.`,
    offerAction: 'Agregar a alguien',
    addTitle: 'Agrega a alguien a tu equipo',
    addHint: 'Completa sus datos y respuestas, igual que en la postulación. Le enviaremos un correo para confirmar.',
    add: 'Agregar al equipo',
    adding: 'Agregando…',
    addCancel: 'Volver a tus respuestas',
    added: (name) => `Agregamos a ${name} a tu equipo y le enviamos un correo.`,
    teamDecided: 'Tu equipo ya tiene una decisión, así que no podemos agregar a nadie. Responde a nuestro correo y lo vemos.',
    teamFull: `Tu equipo ya tiene ${TEAM_MAX} personas.`,
  },
  en: {
    kicker: 'your application',
    title: 'Correct your answers',
    hint: 'Only you can see this link. Change what you need and save. Please do not share it.',
    save: 'Save changes',
    saving: 'Saving…',
    loading: 'Opening your application…',
    invalidTitle: 'This link no longer works',
    invalidBody: 'It may have expired, or we may have sent you a newer one. Reply to our email and we will send another.',
    doneTitle: 'Done, thank you',
    doneBody: 'We saved your changes. You can close this page.',
    noChanges: 'Nothing changed. If that is what you wanted, you can close this page.',
    failed: 'We could not save. Please try again.',
    takenEmail: 'That email is already on another application.',
    takenGithub: 'That GitHub is already on another application.',
    takenId: 'That ID is already on another application.',
    home: 'Go home',
    offerTitle: 'Did you leave someone off your team?',
    offerBody: (size) =>
      `Your team has ${size === 1 ? '1 person' : `${size} people`} and can have up to ${TEAM_MAX}. You can add whoever you left off before we review the application.`,
    offerAction: 'Add someone',
    addTitle: 'Add someone to your team',
    addHint: 'Fill in their details and answers, as on the application. We will email them to confirm.',
    add: 'Add to team',
    adding: 'Adding…',
    addCancel: 'Back to your answers',
    added: (name) => `We added ${name} to your team and sent them an email.`,
    teamDecided: 'Your team already has a decision, so we cannot add anyone. Reply to our email and we will look into it.',
    teamFull: `Your team already has ${TEAM_MAX} people.`,
  },
}

const PRIMARY =
  'inline-block min-w-40 cursor-pointer bg-brand px-5 py-3 text-center font-mono text-base leading-7 text-[#f4f2ee] no-underline transition-colors duration-75 ease-linear hover:bg-brand-hover focus-visible:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#181818] data-disabled:cursor-wait data-disabled:opacity-70'

const GHOST =
  'cursor-pointer px-2 py-3 font-mono text-base leading-7 text-[#181818] transition-colors duration-75 ease-linear hover:bg-[#e8e5df] focus-visible:bg-[#e8e5df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const RULE = 'border-[#d6d4d0]'

const INVALID_CONTROL =
  'input[data-invalid], textarea[data-invalid], button[data-invalid], [role="radio"][data-invalid][tabindex="0"]'

/** What to tell the applicant when Convex refuses a save. */
function refusal(data: unknown, copy: (typeof COPY)[Locale]) {
  if (data === 'Email already registered') return copy.takenEmail
  if (data === 'GitHub already registered') return copy.takenGithub
  if (data === 'ID already registered') return copy.takenId
  if (data === 'Team already decided') return copy.teamDecided
  if (data === 'Team is full') return copy.teamFull
  return copy.failed
}

function CorrectionForm({
  token,
  member,
  locale,
  onSaved,
  onExpired,
}: {
  token: string
  member: Member
  locale: Locale
  onSaved: (changed: number) => void
  onExpired: () => void
}) {
  const t = applyMessages[locale]
  const copy = COPY[locale]
  const form = useApplyForm({ size: 1, members: [member], ref: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (saving) return
    setError(null)
    const [checked] = checkTeam(form.getFieldValue('members'), 1)
    form.setFieldValue(memberAt(0), checked.member, { dontValidate: true })
    if (firstErrorKey(checked.errors)) {
      for (const key of FIELD_ORDER) {
        if (document.getElementById(fieldId(0, key))) await form.validateField(memberPath(0, key), 'submit')
      }
      requestAnimationFrame(() => document.querySelector<HTMLElement>(INVALID_CONTROL)?.focus())
      return
    }
    setSaving(true)
    try {
      const { changed } = await saveCorrection(token, checked.member)
      onSaved(changed)
    } catch (failure) {
      const data = failure instanceof ConvexError ? failure.data : null
      if (data === 'This link is no longer valid') return onExpired()
      setError(refusal(data, copy))
      setSaving(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <MemberForm form={form} index={0} t={t} />
      {error ? (
        <p role="alert" className="mt-8 text-base leading-7 text-[#b42318]">
          {error}
        </p>
      ) : null}
      <div className="mt-12 flex justify-end">
        <Button type="submit" disabled={saving} focusableWhenDisabled className={PRIMARY}>
          {saving ? copy.saving : copy.save}
        </Button>
      </div>
    </form>
  )
}

/**
 * The new teammate's answers, on a blank copy of the form. The person with the link sits at index 0, so
 * the fields have their own ids and the form catches the new person repeating their email, GitHub or ID.
 */
function TeammateForm({
  token,
  owner,
  locale,
  onAdded,
  onCancel,
  onExpired,
}: {
  token: string
  owner: Member
  locale: Locale
  onAdded: (name: string, team: TeamRoom) => void
  onCancel: () => void
  onExpired: () => void
}) {
  const t = applyMessages[locale]
  const copy = COPY[locale]
  const form = useApplyForm({ size: 2, members: [owner, emptyMember()], ref: '' })
  const element = useRef<HTMLFormElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    if (saving) return
    setError(null)
    const [, checked] = checkTeam(form.getFieldValue('members'), 2)
    form.setFieldValue(memberAt(1), checked.member, { dontValidate: true })
    if (firstErrorKey(checked.errors)) {
      for (const key of FIELD_ORDER) {
        if (document.getElementById(fieldId(1, key))) await form.validateField(memberPath(1, key), 'submit')
      }
      requestAnimationFrame(() => element.current?.querySelector<HTMLElement>(INVALID_CONTROL)?.focus())
      return
    }
    setSaving(true)
    try {
      onAdded(checked.member.name, await addTeammate(token, checked.member))
    } catch (failure) {
      const data = failure instanceof ConvexError ? failure.data : null
      if (data === 'This link is no longer valid') return onExpired()
      setError(refusal(data, copy))
      setSaving(false)
    }
  }

  return (
    <form
      ref={element}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void add()
      }}
    >
      <MemberForm form={form} index={1} t={t} />
      {error ? (
        <p role="alert" className="mt-8 text-base leading-7 text-[#b42318]">
          {error}
        </p>
      ) : null}
      <div className="mt-12 flex items-center justify-between gap-4">
        <Button type="button" onClick={onCancel} className={GHOST}>
          {copy.addCancel}
        </Button>
        <Button type="submit" disabled={saving} focusableWhenDisabled className={PRIMARY}>
          {saving ? copy.adding : copy.add}
        </Button>
      </div>
    </form>
  )
}

export default function Correct() {
  const [locale] = useLocale()
  const copy = COPY[locale]
  const [token] = useState(() => window.location.hash.slice(1))
  const [state, setState] = useState<
    | { step: 'loading' }
    | { step: 'invalid' }
    | { step: 'form'; member: Member }
    | { step: 'done'; changed: number }
  >({ step: 'loading' })
  const [team, setTeam] = useState<TeamRoom | null>(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    document.documentElement.style.backgroundColor = '#f4f2ee'
    document.documentElement.style.colorScheme = 'light'
    document.title = `${copy.title} — Hack Infra Futuro 2026`
    return () => {
      document.documentElement.style.backgroundColor = ''
      document.documentElement.style.colorScheme = ''
    }
  }, [locale, copy.title])

  useEffect(() => {
    let live = true
    loadCorrection(token)
      .then((member) => live && setState(member ? { step: 'form', member } : { step: 'invalid' }))
      .catch(() => live && setState({ step: 'invalid' }))
    // Only offers adding someone, so the answers still open if this fails.
    loadTeam(token)
      .then((room) => live && setTeam(room))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [token])

  // After the render, or the page keeps the old scroll position as its height changes.
  useEffect(() => {
    if (adding || added) window.scrollTo(0, 0)
  }, [adding, added])

  const addingNow = adding && state.step === 'form'
  const title = addingNow
    ? copy.addTitle
    : state.step === 'invalid'
      ? copy.invalidTitle
      : state.step === 'done'
        ? copy.doneTitle
        : copy.title
  const hint = addingNow
    ? copy.addHint
    : state.step === 'invalid'
      ? copy.invalidBody
      : state.step === 'done'
        ? state.changed
          ? copy.doneBody
          : copy.noChanges
        : state.step === 'loading'
          ? copy.loading
          : added
            ? copy.added(added)
            : copy.hint

  return (
    <div className="min-h-svh bg-[#f4f2ee] font-mono text-[#181818] antialiased">
      <main className="grid gap-10 px-4 pt-10 pb-24 md:grid-cols-[minmax(0,30rem)_minmax(0,34rem)] md:gap-x-12 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,32rem)_minmax(0,36rem)]">
        <div className="md:sticky md:top-16 md:col-start-1 md:row-start-1 md:self-start">
          <p className="mb-2 text-base leading-7 text-[#5a5956] md:mb-3">{copy.kicker}</p>
          <h1 className="font-pixel text-4xl leading-[1.1] text-balance wrap-break-word text-[#181818] sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-[36ch] text-base leading-7 text-[#5a5956] md:text-lg md:leading-8" role="status">
            {hint}
          </p>
          {state.step === 'invalid' || state.step === 'done' ? (
            <a href={HOME} className={`${PRIMARY} mt-8`}>
              {copy.home}
            </a>
          ) : null}
        </div>
        {state.step === 'form' ? (
          <div className="min-w-0 md:col-start-2 md:row-start-1">
            {/* stays mounted while adding, so answers being corrected aren't lost */}
            <div hidden={adding}>
              <CorrectionForm
                token={token}
                member={state.member}
                locale={locale}
                onSaved={(changed) => {
                  setState({ step: 'done', changed })
                  window.scrollTo(0, 0)
                }}
                onExpired={() => setState({ step: 'invalid' })}
              />
              {team?.canAdd ? (
                <section className={`mt-16 border-t ${RULE} pt-8`}>
                  <h2 className="text-lg leading-7">{copy.offerTitle}</h2>
                  <p className="mt-2 text-base leading-7 text-[#5a5956]">{copy.offerBody(team.size)}</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setAdded(null)
                      setAdding(true)
                    }}
                    className={`${PRIMARY} mt-6`}
                  >
                    {copy.offerAction}
                  </Button>
                </section>
              ) : null}
            </div>
            {adding ? (
              <TeammateForm
                token={token}
                owner={state.member}
                locale={locale}
                onAdded={(name, room) => {
                  setTeam(room)
                  setAdded(name)
                  setAdding(false)
                }}
                onCancel={() => setAdding(false)}
                onExpired={() => setState({ step: 'invalid' })}
              />
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
