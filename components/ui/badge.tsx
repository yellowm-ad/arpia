import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-gold/60 bg-black/30 px-2 py-0.5 text-[11px] font-medium text-gold-soft',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
