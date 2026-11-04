import type { Status } from '@convex/admin/status'
import { cn } from 'cn'
import { STATUS_LABELS } from '../labels'

/** The one purple marks who's in; the rest differ by shape and text, so color never carries it alone. */
const MARK: Record<Status, string> = {
  pending: 'border border-current',
  accepted: 'bg-primary',
  waitlisted: 'bg-[linear-gradient(135deg,currentColor_50%,transparent_50%)] border border-current',
  rejected: 'bg-current',
  withdrawn: 'border border-dashed border-current',
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const out = status === 'rejected' || status === 'withdrawn'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap',
        out && 'text-muted-foreground',
        className,
      )}
    >
      <span className={cn('size-2.5', MARK[status])} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
