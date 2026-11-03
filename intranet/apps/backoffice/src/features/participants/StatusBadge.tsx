import type { Status } from '@convex/admin/status'
import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS } from '../labels'

const VARIANT = {
  pending: 'outline',
  accepted: 'default',
  waitlisted: 'secondary',
  rejected: 'outline',
  withdrawn: 'outline',
} as const

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant={VARIANT[status]}
      className={status === 'rejected' || status === 'withdrawn' ? 'text-muted-foreground' : undefined}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
