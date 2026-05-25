import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--primary-light)] text-[var(--primary)]',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    muted: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
