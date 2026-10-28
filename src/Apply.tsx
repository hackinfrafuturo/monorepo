import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useStore } from '@tanstack/react-form'
import { Button } from '@base-ui/react/button'
import { Field } from '@base-ui/react/field'
import { Fieldset } from '@base-ui/react/fieldset'
import { Progress } from '@base-ui/react/progress'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { uiSound } from './ui-sound'
import { MemberForm } from './apply/MemberForm'
import { TextField } from './apply/fields'
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type Step,
} from './apply/draft'
import {
  FIELD_ORDER,
  TEAM_SIZES,
  fieldId,
  firstErrorKey,
  type Member,
  type TeamSize,
} from './apply/model'
import { checkTeam, schemaIssue, teamSizeSchema } from './apply/schema'
import { submitTeam } from './apply/submit'
import { MAX_REF_LENGTH, normalizeRef, pathWithRef, refFromSearch, urlWithRef } from './apply/ref'
import { memberAt, memberPath, shownError, useApplyForm } from './apply/use-apply-form'
import { applyMessages } from './i18n/apply'
import { APPLY_META } from './i18n/meta'
import { HOME, htmlLang } from './i18n/locale'
import { useLocale } from './i18n/use-locale'

const RULE = 'border-[#d6d4d0]'

const LINK =
  'text-[#5a5956] no-underline transition-[background-color,color] duration-75 ease-linear hover:bg-[#e8e5df] hover:text-[#181818] focus-visible:bg-[#e8e5df] focus-visible:text-[#181818] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'

const PRIMARY =
  'inline-block min-w-40 cursor-pointer bg-brand px-5 py-3 text-center font-mono text-base leading-7 text-[#f4f2ee] no-underline transition-colors duration-75 ease-linear hover:bg-brand-hover focus-visible:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#181818] data-disabled:cursor-wait data-disabled:opacity-70'

const GHOST =
  'cursor-pointer px-2 py-3 font-mono text-base leading-7 text-[#181818] transition-colors duration-75 ease-linear hover:bg-[#e8e5df] focus-visible:bg-[#e8e5df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const SIZE_CHOICE =
  'flex aspect-square cursor-pointer items-center justify-center border border-[#8a8780] font-pixel text-5xl text-[#181818] transition-colors duration-75 ease-linear select-none hover:bg-[#e8e5df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-checked:border-[#181818] data-checked:bg-[#181818] data-checked:text-[#f4f2ee] data-checked:hover:bg-[#181818] group-data-invalid:border-[#b42318] md:text-6xl'

const INVALID_CONTROL =
  'input[data-invalid], textarea[data-invalid], button[data-invalid], [role="radio"][data-invalid][tabindex="0"]'

function focusInvalidControl() {
  document.querySelector<HTMLElement>(INVALID_CONTROL)?.focus()
}

/** Where a step sits in the progress bar, counting from 0. */
function position(step: Step, size: TeamSize | null): number {
  if (step === 'consent') return 0
  if (step === 'size') return 1
  if (step === 'review') return (size ?? 3) + 2
  return step + 2
}

function Nav({
  back,
  backLabel,
  children,
}: {
  back?: () => void
  backLabel: string
  children: ReactNode
}) {
  return (
    <div className="mt-12 flex items-center justify-between gap-4">
      {back ? (
        <Button
          type="button"
          className={GHOST}
          onClick={() => {
            uiSound.onClick()
            back()
          }}
          onPointerEnter={uiSound.onPointerEnter}
        >
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      {children}
    </div>
  )
}

export default function Apply() {
  const [locale] = useLocale()
  const t = applyMessages[locale]

  const [initial] = useState(() => {
    const draft = loadDraft()
    const search = window.location.search
    return {
      ...draft,
      ref: new URLSearchParams(search).has('ref') ? (refFromSearch(search) ?? '') : draft.ref,
    }
  })
  const form = useApplyForm(initial)
  const values = useStore(form.store, (state) => state.values)
  const { size, members, ref } = values

  const [requestedStep, setStep] = useState<Step>(initial.step)
  const [consentAccepted, setConsentAccepted] = useState(initial.consentAccepted)
  const step = consentAccepted ? requestedStep : 'consent'
  const [status, setStatus] = useState<'idle' | 'sending' | 'failed'>('idle')
  const [sentTo, setSentTo] = useState<string[] | null>(null)
  const [invalidTick, setInvalidTick] = useState(0)
  // Set when review finds a person to fix. The member step validates after it mounts.
  const [checkMember, setCheckMember] = useState<number | null>(null)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const shownStep = useRef<string | null>(null)
  const keepDraft = useRef(true)

  const done = sentTo !== null
  const stepKey = done ? 'done' : String(step)
  const homeUrl = pathWithRef(HOME, ref)

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    document.documentElement.style.backgroundColor = '#f4f2ee'
    document.documentElement.style.colorScheme = 'light'
    document.title = APPLY_META[locale].title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', APPLY_META[locale].description)

    return () => {
      document.documentElement.style.backgroundColor = ''
      document.documentElement.style.colorScheme = ''
    }
  }, [locale])

  useEffect(() => {
    if (!keepDraft.current) return
    saveDraft({ size, members, step, ref, consentAccepted })
  }, [size, members, step, ref, consentAccepted])

  useEffect(() => {
    const current = window.location.href
    const next = urlWithRef(current, ref)
    if (next !== current) window.history.replaceState(window.history.state, '', next)
  }, [ref])

  // Pin the title where it already sits, so scrolling the page doesn't drag it up.
  useLayoutEffect(() => {
    const header = headerRef.current
    const rail = railRef.current
    if (!header || !rail) return
    const pin = () => {
      const main = rail.parentElement
      const pad = main ? Number.parseFloat(getComputedStyle(main).paddingTop) : 0
      rail.style.top = `${header.offsetHeight + pad}px`
    }
    pin()
    const observer = new ResizeObserver(pin)
    observer.observe(header)
    window.addEventListener('resize', pin)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', pin)
    }
  }, [])

  // New step: land on the heading. A jump back from review focuses the bad field instead.
  useEffect(() => {
    const previous = shownStep.current
    shownStep.current = stepKey
    if (previous === null || previous === stepKey || checkMember != null) return
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [stepKey, checkMember])

  useEffect(() => {
    if (invalidTick === 0) return
    const frame = requestAnimationFrame(() => focusInvalidControl())
    return () => cancelAnimationFrame(frame)
  }, [invalidTick])

  useEffect(() => {
    if (checkMember == null || step !== checkMember) return
    let cancelled = false
    void (async () => {
      for (const key of FIELD_ORDER) {
        if (!document.getElementById(fieldId(checkMember, key))) continue
        await form.validateField(memberPath(checkMember, key), 'submit')
      }
      if (cancelled) return
      setCheckMember(null)
      requestAnimationFrame(() => focusInvalidControl())
    })()
    return () => {
      cancelled = true
    }
  }, [checkMember, step, form])

  const label = (m: Member, i: number) => m.name || t.member.fallback(i + 1)

  const submitSize = async () => {
    const errors = await form.validateField('size', 'submit')
    if (errors.length > 0) {
      setInvalidTick((n) => n + 1)
      return
    }
    setStep(0)
  }

  const submitMember = async (index: number) => {
    if (size == null) return
    const checked = checkTeam(form.getFieldValue('members'), size)
    const current = checked[index]
    if (!current) return
    form.setFieldValue(memberAt(index), current.member, { dontValidate: true })
    if (!firstErrorKey(current.errors)) {
      setStep(index + 1 < size ? index + 1 : 'review')
      return
    }
    // Validate after paint, so the cleaned values are on screen before the errors.
    setCheckMember(index)
  }

  const submitTeamNow = async () => {
    if (!consentAccepted || size == null || status === 'sending') return
    const checked = checkTeam(form.getFieldValue('members'), size)
    checked.forEach((item, index) => {
      form.setFieldValue(memberAt(index), item.member, { dontValidate: true })
    })
    const bad = checked.findIndex((item) => firstErrorKey(item.errors) != null)
    if (bad !== -1) {
      setCheckMember(bad)
      setStep(bad)
      return
    }

    const cleaned = checked.map((item) => item.member)
    setStatus('sending')
    try {
      await submitTeam({ members: cleaned, ref: normalizeRef(ref) })
      keepDraft.current = false
      clearDraft()
      setStatus('idle')
      setSentTo(cleaned.map((m) => m.email))
    } catch {
      setStatus('failed')
    }
  }

  // The left column says what this step is; the right column is the work.
  let title: string
  let hint: string
  let body: ReactNode

  if (done) {
    title = t.done.title
    hint = t.done.body
    body = (
      <div>
        <p className="text-base leading-7 text-[#5a5956]">{t.done.sentTo}</p>
        <ul className={`mt-2 border-t ${RULE}`}>
          {sentTo.map((email) => (
            <li
              key={email}
              className={`border-b py-3 text-base leading-7 break-words ${RULE}`}
            >
              {email}
            </li>
          ))}
        </ul>
        <div className="mt-12">
          <a href={homeUrl} {...uiSound} className={PRIMARY}>
            {t.done.home}
          </a>
        </div>
      </div>
    )
  } else if (step === 'consent') {
    title = t.consent.title
    hint = t.consent.hint
    body = (
      <div>
        <dl className={`border-t ${RULE}`}>
          <div className={`border-b py-4 ${RULE}`}>
            <dt className="text-lg leading-7">{t.consent.conduct}</dt>
            <dd className="mt-1 text-base leading-6 text-[#5a5956]">
              {t.consent.conductBody}{' '}
              <a
                href="https://indies.la/conducta/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:bg-[#e8e5df] focus-visible:bg-[#e8e5df] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              >
                {t.consent.readConduct}
              </a>
            </dd>
          </div>
          <div className={`border-b py-4 ${RULE}`}>
            <dt className="text-lg leading-7">{t.consent.answers}</dt>
            <dd className="mt-1 text-base leading-6 text-[#5a5956]">
              {t.consent.answersBody}
            </dd>
          </div>
          <div className={`border-b py-4 ${RULE}`}>
            <dt className="text-lg leading-7">{t.consent.sharing}</dt>
            <dd className="mt-1 text-base leading-6 text-[#5a5956]">
              {t.consent.sharingBody}
            </dd>
          </div>
          <div className={`border-b py-4 ${RULE}`}>
            <dt className="text-lg leading-7">{t.consent.submission}</dt>
            <dd className="mt-1 text-base leading-6 text-[#5a5956]">
              {t.consent.submissionBody}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-base leading-7 font-bold md:text-lg md:leading-8">
          {t.consent.exceptions}
        </p>
        <Nav backLabel={t.back}>
          <Button
            type="button"
            className={PRIMARY}
            onClick={() => {
              uiSound.onClick()
              setConsentAccepted(true)
              setStep('size')
            }}
            onPointerEnter={uiSound.onPointerEnter}
          >
            {t.consent.accept}
          </Button>
        </Nav>
      </div>
    )
  } else if (step === 'size' || size === null) {
    title = t.size.title
    hint = t.size.hint
    body = (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submitSize()
        }}
      >
        <form.Field
          name="size"
          validators={{
            onSubmit: ({ value }) => {
              const code = schemaIssue(teamSizeSchema, value)
              return code ? t.errors[code] : undefined
            },
            onChange: ({ value, fieldApi }) => {
              if (!fieldApi.state.meta.errorMap.onSubmit) return undefined
              const code = schemaIssue(teamSizeSchema, value)
              return code ? t.errors[code] : undefined
            },
          }}
        >
          {(field) => {
            const message = shownError(field.state.meta.errorMap)
            return (
              <Field.Root name="size" invalid={Boolean(message)} className="group">
                <Fieldset.Root
                  render={
                    <RadioGroup
                      value={field.state.value ?? ''}
                      onValueChange={(v) => field.handleChange(v as TeamSize)}
                    />
                  }
                  className="m-0 min-w-0 border-0 p-0"
                >
                  <Fieldset.Legend className="sr-only">{t.size.title}</Fieldset.Legend>
                  <div className="grid grid-cols-4 gap-3">
                    {TEAM_SIZES.map((n, i) => (
                      <Radio.Root
                        key={n}
                        value={n}
                        id={i === 0 ? 'size' : undefined}
                        aria-label={t.size.people(n)}
                        className={SIZE_CHOICE}
                        {...uiSound}
                      >
                        {n}
                      </Radio.Root>
                    ))}
                  </div>
                </Fieldset.Root>
                {message ? (
                  <Field.Error className="mt-2 text-base leading-6 text-[#b42318]" match>
                    {message}
                  </Field.Error>
                ) : null}
              </Field.Root>
            )
          }}
        </form.Field>
        <Nav back={() => setStep('consent')} backLabel={t.back}>
          <Button type="submit" {...uiSound} className={PRIMARY}>
            {t.next}
          </Button>
        </Nav>
      </form>
    )
  } else if (step === 'review') {
    title = t.review.title
    hint = t.review.hint
    body = (
      <div>
        <ol className={`border-t ${RULE}`}>
          {members.slice(0, size).map((m, i) => (
            <li key={i} className={`flex items-start gap-4 border-b py-4 ${RULE}`}>
              <span
                aria-hidden
                className="w-6 shrink-0 pt-px text-base leading-7 text-[#5a5956] tabular-nums"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg leading-7 break-words">{label(m, i)}</p>
                <p className="text-base leading-6 break-words text-[#5a5956]">
                  {m.email}
                </p>
                {m.github ? (
                  <p className="text-base leading-6 break-words text-[#5a5956]">
                    github.com/{m.github}
                  </p>
                ) : null}
                {m.linkedin ? (
                  <p className="text-base leading-6 break-words text-[#5a5956]">
                    linkedin.com/in/{m.linkedin}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                className={GHOST}
                aria-label={`${t.edit}: ${label(m, i)}`}
                onClick={() => {
                  uiSound.onClick()
                  setStep(i)
                }}
                onPointerEnter={uiSound.onPointerEnter}
              >
                {t.edit}
              </Button>
            </li>
          ))}
        </ol>
        {status === 'failed' ? (
          <p role="alert" className="mt-6 text-base leading-6 text-[#b42318]">
            {t.review.failed}
          </p>
        ) : null}
        <Nav back={() => setStep(size - 1)} backLabel={t.back}>
          <Button
            type="button"
            disabled={status === 'sending'}
            focusableWhenDisabled
            className={PRIMARY}
            onClick={() => {
              uiSound.onClick()
              void submitTeamNow()
            }}
            onPointerEnter={uiSound.onPointerEnter}
          >
            {status === 'sending' ? t.review.sending : t.review.submit}
          </Button>
        </Nav>
      </div>
    )
  } else {
    const index = step
    title = members[index].name.trim() || t.member.title(index + 1, size)
    hint = index === 0 ? t.member.hintFirst : t.member.hintNext
    body = (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submitMember(index)
        }}
      >
        <MemberForm form={form} index={index} t={t} />
        {index === 0 ? (
          <div className="mt-16">
            <form.Field name="ref">
              {(field) => (
                <TextField
                  id="ref"
                  name={field.name}
                  label={t.fields.ref.label}
                  optional={t.optional}
                  placeholder={t.fields.ref.placeholder}
                  maxLength={MAX_REF_LENGTH}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  onBlur={() => {
                    const cleaned = normalizeRef(field.state.value) ?? ''
                    if (cleaned !== field.state.value) field.handleChange(cleaned)
                    field.handleBlur()
                  }}
                />
              )}
            </form.Field>
          </div>
        ) : null}
        <Nav
          back={() => setStep(index === 0 ? 'size' : index - 1)}
          backLabel={t.back}
        >
          <Button type="submit" {...uiSound} className={PRIMARY}>
            {t.next}
          </Button>
        </Nav>
      </form>
    )
  }

  const total = (size ?? 3) + 3
  const reached = done ? total : position(step, size) + 1

  return (
    <div className="min-h-svh bg-[#f4f2ee] font-mono text-[#181818] antialiased">
      <header
        ref={headerRef}
        className="sticky top-0 z-50 bg-[#f4f2ee] px-4 pt-4 pb-4 md:px-6"
      >
        <div className="flex items-baseline justify-between gap-4">
          <a href={homeUrl} className={`${LINK} text-base leading-7`}>
            {t.home}
          </a>
          <p className="text-base leading-7 text-[#5a5956] tabular-nums">
            {t.progress.text(reached, total)}
          </p>
        </div>
        <Progress.Root
          value={reached}
          max={total}
          aria-label={t.progress.label}
          getAriaValueText={() => t.progress.text(reached, total)}
          className="mt-3"
        >
          <Progress.Track className="block h-1.5 w-full bg-[#d6d4d0]">
            <Progress.Indicator className="block h-full bg-brand transition-[width] duration-300 ease-out motion-reduce:transition-none" />
          </Progress.Track>
        </Progress.Root>
      </header>

      <main className="grid gap-10 px-4 pt-10 pb-24 md:grid-cols-[minmax(0,30rem)_minmax(0,34rem)] md:gap-x-12 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,32rem)_minmax(0,36rem)]">
        <div ref={railRef} className="md:col-start-1 md:row-start-1 md:sticky md:self-start">
          <p className="mb-2 text-base leading-7 text-[#5a5956] md:mb-3">{t.kicker}</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-pixel text-4xl leading-[1.1] text-balance wrap-break-word text-[#181818] outline-none sm:text-5xl md:text-6xl"
          >
            {title}
          </h1>
          <p className="mt-4 max-w-[36ch] text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
            {hint}
          </p>
        </div>

        <div key={stepKey} className="animate-step-in min-w-0 md:col-start-2 md:row-start-1">
          {body}
        </div>
      </main>
    </div>
  )
}
