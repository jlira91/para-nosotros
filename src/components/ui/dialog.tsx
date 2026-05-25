'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
