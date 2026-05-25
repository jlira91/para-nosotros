'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home, FolderOpen, List, Cake, Calendar, NotebookPen,
  ShoppingCart, LogOut, Heart, Copy, Check, Menu, X, LayoutDashboard
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Profile, CoupleInvite } from '@/lib/types'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/documentos', icon: FolderOpen, label: 'Documentos' },
  { href: '/listas', icon: List, label: 'Listas' },
  { href: '/compras', icon: ShoppingCart, label: 'Compras' },
  { href: '/cumpleanos', icon: Cake, label: 'Cumpleaños' },
  { href: '/calendario', icon: Calendar, label: 'Calendario' },
  { href: '/notas', icon: NotebookPen, label: 'Notas' },
]

interface SidebarProps {
  profile: Profile | null
  partnerProfile: Profile | null
  invite: CoupleInvite | null
}

export function Sidebar({ profile, partnerProfile, invite }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function copyCode() {
    if (invite?.code) {
      await navigator.clipboard.writeText(invite.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sidebarContent = (
    <aside className="w-64 h-full bg-white border-r border-[var(--border)] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm">
            <span className="text-lg">💑</span>
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-[var(--foreground)] text-sm leading-tight">Para Nosotros</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Espacio compartido</p>
          </div>
          {/* Close button — mobile only */}
          <button
            className="md:hidden text-[var(--muted-foreground)]"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Partner section */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        {partnerProfile ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] flex items-center justify-center">
              <Heart size={14} className="text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--muted-foreground)]">Tu pareja</p>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {partnerProfile.full_name || partnerProfile.email}
              </p>
            </div>
          </div>
        ) : invite ? (
          <div className="bg-[var(--primary-light)] rounded-xl p-3">
            <p className="text-xs text-[var(--accent)] font-medium mb-1">Invita a tu pareja</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-bold text-[var(--primary)] tracking-widest flex-1">
                {invite.code}
              </code>
              <button onClick={copyCode} className="text-[var(--primary)] hover:text-[var(--accent)] transition">
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
            {(profile?.full_name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {profile?.full_name || 'Mi perfil'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[var(--muted-foreground)] hover:text-red-500 transition"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[var(--border)] flex items-center gap-3 px-4 h-14">
        <button onClick={() => setOpen(true)} className="text-[var(--foreground)]">
          <Menu size={22} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
          <span className="text-sm">💑</span>
        </div>
        <span className="font-bold text-sm text-[var(--foreground)] flex-1">Para Nosotros</span>
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition">
          <LayoutDashboard size={20} />
        </Link>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block min-h-screen w-64 flex-shrink-0">
        {sidebarContent}
      </div>
    </>
  )
}
