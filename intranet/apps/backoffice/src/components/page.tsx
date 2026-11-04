import { useState, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'

/** The top of every page: a kicker, the pixel title, one line of context, and the page's own actions. */
export function PageHeader({
  title,
  description,
  actions,
  kicker = 'Infra Futuro · 5–6 dic 2026',
  compact = false,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  kicker?: string
  /** for long titles, like a team's names */
  compact?: boolean
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-5">
      <div className="min-w-0 flex-1 basis-80 space-y-2">
        <p className="text-xs tracking-wide text-brand uppercase">{kicker}</p>
        <h1
          className={cn(
            'font-pixel leading-[1.1] [overflow-wrap:anywhere]',
            compact ? 'text-2xl sm:text-[28px]' : 'text-[32px] sm:text-[40px]',
          )}
        >
          {title}
        </h1>
        {description && (
          <div className="max-w-[65ch] text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Reloads the page's data, with the state the button needs. */
export function RefreshButton({ label }: { label: string }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  async function refresh() {
    setRefreshing(true)
    try {
      await router.invalidate()
    } finally {
      setRefreshing(false)
    }
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={refresh}
      disabled={refreshing}
      aria-busy={refreshing}
      aria-label={label}
    >
      <RefreshCw className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
      <span className="hidden sm:inline">{refreshing ? 'Actualizando…' : 'Actualizar'}</span>
    </Button>
  )
}

/** Why a page has no data: the deployment isn't connected, or the service failed. */
export function DataNotice({
  status,
  what,
}: {
  status: 'unconfigured' | 'unavailable' | 'ready' | 'notFound'
  what: string
}) {
  const unconfigured = status === 'unconfigured'
  return (
    <Alert role="status">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>
        <h2>{unconfigured ? 'Falta conectar el proyecto' : `No pudimos cargar ${what}`}</h2>
      </AlertTitle>
      <AlertDescription>
        {unconfigured
          ? 'Configura la conexión a Convex de Infra Futuro en el servidor de la intranet.'
          : 'El servicio de Infra Futuro no está disponible. Intenta actualizar en un momento.'}
      </AlertDescription>
    </Alert>
  )
}

/** A big number, the way the event's site sets its figures. */
export function Figure({
  label,
  value,
  detail,
  className,
}: {
  label: string
  value: number | string
  detail?: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-pixel text-[32px] leading-none tabular-nums sm:text-[40px]">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

/** The brand's dotted band as a meter: dots fill in purple over a track of pale ones. */
export function DotMeter({
  value,
  max,
  label,
  size = 6,
  className,
}: {
  value: number
  max: number
  label: string
  size?: number
  className?: string
}) {
  const share = max > 0 ? Math.min(1, value / max) : 0
  const style = { '--dot': `${size}px`, height: size } as React.CSSProperties
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('dots relative w-full [--dot-color:var(--border)]', className)}
      style={style}
    >
      <div
        className="dots absolute inset-y-0 left-0 [--dot-color:var(--primary)]"
        style={{ ...style, width: `${share * 100}%` }}
      />
    </div>
  )
}

export type Tab<T> = { value: T; label: string; count?: number }

/** One choice among a few, along a rule: the page's main filter. */
export function Tabs<T extends string | undefined>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string
  tabs: Tab<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex overflow-x-auto border-b">
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex shrink-0 items-baseline gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-75 hover:bg-accent',
              active ? 'border-primary' : 'border-transparent text-muted-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="text-xs tabular-nums">{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** A key the page responds to, shown next to what it does. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden border border-current/40 px-1 text-[11px] leading-4 opacity-70 pointer-fine:inline-block">
      {children}
    </kbd>
  )
}

/** A compact select, in the same shape as everything else. */
export function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 max-w-44 min-w-0 border border-input bg-background px-2 text-sm"
      >
        {children}
      </select>
    </label>
  )
}

export const textareaClass =
  'w-full min-w-0 border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground'
