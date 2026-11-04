import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import { SCORES, SCORE_LABELS } from '../labels'

/** The 1-to-4 scale, as one row of keys. */
export function ScorePicker({
  value,
  onChange,
  className,
}: {
  value: number | null
  onChange: (score: number) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label="Puntaje" className={cn('grid grid-cols-2 gap-1 sm:grid-cols-4', className)}>
      {SCORES.map((score) => (
        <Button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score} · ${SCORE_LABELS[score]}`}
          size="sm"
          variant={value === score ? 'default' : 'outline'}
          onClick={() => onChange(score)}
          className="justify-start"
        >
          <span className="font-pixel text-base leading-none">{score}</span>
          <span className="truncate">{SCORE_LABELS[score]}</span>
        </Button>
      ))}
    </div>
  )
}
