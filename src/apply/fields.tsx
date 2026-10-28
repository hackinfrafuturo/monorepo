import { Field } from '@base-ui/react/field'
import { Fieldset } from '@base-ui/react/fieldset'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Select } from '@base-ui/react/select'
import { uiSound } from '../ui-sound'

// Class names are written out in full: Tailwind only keeps what it can read in the source.
//
// Every field sits in a `Field.Root` marked `group`. `invalid` puts `data-invalid` on it,
// so `group-data-invalid:` turns the edge red for whichever control the field wraps.
const ROOT = 'group flex flex-col gap-2'
const LABEL = 'block text-base leading-7 text-[#181818]'
const HINT = 'text-base leading-6 text-[#5a5956]'
const ERROR = 'text-base leading-6 text-[#b42318]'

const CONTROL =
  'block w-full border border-[#8a8780] bg-transparent px-3 py-2.5 font-mono text-base leading-7 text-[#181818] placeholder:text-[#6b6962] outline-none transition-colors duration-75 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand group-data-invalid:border-[#b42318]'

const PREFIXED_FRAME =
  'flex items-center border border-[#8a8780] transition-colors duration-75 ease-linear focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand group-data-invalid:border-[#b42318]'

const PREFIXED_INPUT =
  'min-w-0 flex-1 bg-transparent py-2.5 pr-3 pl-0.5 font-mono text-base leading-7 text-[#181818] outline-none placeholder:text-[#6b6962]'

type Base = {
  /** DOM id of the control. The page uses it to focus a field after a jump. */
  id: string
  /** Field name. Errors are passed in separately. */
  name: string
  label: string
  /** Shown next to the label, e.g. "optional". Omit for required fields. */
  optional?: string
  hint?: string
  error?: string
}

function LabelText({ label, optional }: Pick<Base, 'label' | 'optional'>) {
  return (
    <>
      {label}
      {optional ? <span className="text-[#5a5956]"> · {optional}</span> : null}
    </>
  )
}

function ErrorLine({ error }: Pick<Base, 'error'>) {
  if (!error) return null
  return (
    <Field.Error className={ERROR} match>
      {error}
    </Field.Error>
  )
}

function Description({ hint }: Pick<Base, 'hint'>) {
  if (!hint) return null
  return <Field.Description className={HINT}>{hint}</Field.Description>
}

export function TextField({
  id,
  name,
  label,
  optional,
  hint,
  error,
  value,
  onValueChange,
  onBlur,
  prefix,
  placeholder,
  inputMode,
  autoComplete = 'off',
  technical = false,
  maxLength,
}: Base & {
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  prefix?: string
  placeholder?: string
  /**
   * Deliberately no `type` prop: `type="email"` makes the browser report its own
   * (untranslated) validity message through Field.Error. Use `inputMode` instead.
   */
  inputMode?: 'text' | 'email' | 'url'
  autoComplete?: string
  /** Handles, emails and URLs: no autocapitalize, no spellcheck. */
  technical?: boolean
  maxLength?: number
}) {
  const control = (
    <Field.Control
      id={id}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      autoCapitalize={technical ? 'none' : undefined}
      spellCheck={technical ? false : undefined}
      onValueChange={onValueChange}
      onBlur={onBlur}
      className={prefix ? PREFIXED_INPUT : CONTROL}
    />
  )

  return (
    <Field.Root name={name} invalid={Boolean(error)} className={ROOT}>
      <Field.Label className={LABEL}>
        <LabelText label={label} optional={optional} />
      </Field.Label>
      <Description hint={hint} />
      {prefix ? (
        <div className={PREFIXED_FRAME}>
          <span
            aria-hidden
            className="shrink-0 pl-3 text-base leading-7 text-[#5a5956] select-none"
          >
            {prefix}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
      <ErrorLine error={error} />
    </Field.Root>
  )
}

export function TextArea({
  id,
  name,
  label,
  optional,
  hint,
  error,
  value,
  onValueChange,
  onBlur,
  minLength,
}: Base & {
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  /** Counts characters under the box, so the minimum is visible before they press Next. */
  minLength?: number
}) {
  const written = value.trim().length
  return (
    <Field.Root name={name} invalid={Boolean(error)} className={ROOT}>
      <Field.Label className={LABEL}>
        <LabelText label={label} optional={optional} />
      </Field.Label>
      <Description hint={hint} />
      <Field.Control
        id={id}
        value={value}
        autoComplete="off"
        onValueChange={onValueChange}
        onBlur={onBlur}
        render={<textarea rows={3} />}
        className={`${CONTROL} min-h-[6.5rem] resize-y`}
      />
      {minLength === undefined ? null : (
        <p className={`text-right text-base leading-6 tabular-nums ${HINT}`}>
          {written} / {minLength}
        </p>
      )}
      <ErrorLine error={error} />
    </Field.Root>
  )
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className="size-4 shrink-0 text-[#181818]"
    >
      <path d="M5 9l7 7 7-7" />
    </svg>
  )
}

export function SelectField({
  id,
  name,
  label,
  optional,
  hint,
  error,
  value,
  onValueChange,
  placeholder,
  options,
}: Base & {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: readonly { value: string; label: string }[]
}) {
  return (
    <Field.Root name={name} invalid={Boolean(error)} className={ROOT}>
      <Field.Label nativeLabel={false} render={<div />} className={LABEL}>
        <LabelText label={label} optional={optional} />
      </Field.Label>
      <Description hint={hint} />
      <Select.Root
        id={id}
        items={options}
        value={value || null}
        onValueChange={(next) => onValueChange(next ?? '')}
      >
        <Select.Trigger
          className={`${CONTROL} flex cursor-pointer items-center justify-between gap-3 text-left`}
        >
          <Select.Value
            placeholder={placeholder}
            className="min-w-0 truncate data-placeholder:text-[#6b6962]"
          />
          <Select.Icon>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            alignItemWithTrigger={false}
            sideOffset={4}
            className="z-50 outline-none"
          >
            <Select.Popup className="min-w-(--anchor-width) border border-[#181818] bg-[#f4f2ee] font-mono text-[#181818] outline-none">
              <Select.List className="max-h-[min(var(--available-height),22rem)] overflow-y-auto py-1">
                {options.map((item) => (
                  <Select.Item
                    key={item.value}
                    value={item.value}
                    className="cursor-default px-3 py-1.5 text-base leading-7 outline-none select-none data-highlighted:bg-[#181818] data-highlighted:text-[#f4f2ee]"
                  >
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <ErrorLine error={error} />
    </Field.Root>
  )
}

const CHOICE =
  'inline-block cursor-pointer border border-[#8a8780] px-3 py-2.5 font-mono text-base leading-7 text-[#181818] select-none transition-colors duration-75 ease-linear hover:bg-[#e8e5df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-checked:border-[#181818] data-checked:bg-[#181818] data-checked:text-[#f4f2ee] data-checked:hover:bg-[#181818] group-data-invalid:border-[#b42318]'

/** A radio group drawn as squares. Selected inverts to ink. */
export function ChoiceField<T extends string>({
  id,
  name,
  label,
  optional,
  hint,
  error,
  value,
  options,
  onValueChange,
}: Base & {
  value: T | ''
  options: readonly { value: T; label: string }[]
  onValueChange: (value: T) => void
}) {
  return (
    <Field.Root name={name} invalid={Boolean(error)} className={ROOT}>
      <Fieldset.Root
        render={
          <RadioGroup value={value} onValueChange={(v) => onValueChange(v as T)} />
        }
        className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
      >
        <Fieldset.Legend className={LABEL}>
          <LabelText label={label} optional={optional} />
        </Fieldset.Legend>
        <Description hint={hint} />
        <div className="flex flex-wrap gap-2">
          {options.map((option, i) => (
            <Radio.Root
              key={option.value}
              value={option.value}
              id={i === 0 ? id : undefined}
              className={CHOICE}
              {...uiSound}
            >
              {option.label}
            </Radio.Root>
          ))}
        </div>
      </Fieldset.Root>
      <ErrorLine error={error} />
    </Field.Root>
  )
}
