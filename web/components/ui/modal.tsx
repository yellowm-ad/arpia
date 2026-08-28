'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  widthClass?: string
}

export function Modal({ open, onClose, title, children, className, widthClass = 'max-w-xl' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={cn('panel-gilded w-full max-h-[85vh] overflow-y-auto scrollbar-thin p-4', widthClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between border-b border-gold/30 pb-2">
            <h2 className="font-display text-lg text-gold-soft text-shadow-ink">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
              <X className="size-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
