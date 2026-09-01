import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('panel-gilded p-3', className)} {...props} />
}

function CardParchment({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-parchment" className={cn('panel-parchment p-3', className)} {...props} />
}

export { Card, CardParchment }
