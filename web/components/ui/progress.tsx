import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number // 0 - 100
  className?: string
  barClassName?: string
  label?: string
}

function Progress({ value, className, barClassName, label }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn(
        'relative h-3 w-full overflow-hidden rounded-full border border-black/40 bg-black/40',
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-300', barClassName)}
        style={{ width: `${clamped}%` }}
      />
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-ink">
          {label}
        </span>
      )}
    </div>
  )
}

export { Progress }
