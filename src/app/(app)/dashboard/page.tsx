import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { daysUntilBirthday, formatDate } from '@/lib/utils'
import { FolderOpen, List, Cake, Calendar, NotebookPen, ShoppingCart, Heart, ArrowRight, Pin } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const coupleId = profile.couple_id

  const [
    { data: upcomingEvents },
    { data: upcomingBirthdays },
    { data: lists },
    { data: recentNotes },
    { data: pinnedNotes },
  ] = await Promise.all([
    supabase.from('events')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('start_date', new Date().toISOString())
      .order('start_date')
      .limit(3),
    supabase.from('birthdays')
      .select('*')
      .eq('couple_id', coupleId)
      .order('birth_date'),
    supabase.from('lists')
      .select('*')
      .eq('couple_id', coupleId)
      .neq('type', 'shopping'),
    supabase.from('notes')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('pinned', false)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase.from('notes')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('pinned', true)
      .order('title'),
  ])

  const sortedBirthdays = (upcomingBirthdays || [])
    .map(b => ({ ...b, daysLeft: daysUntilBirthday(b.birth_date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const quickLinks = [
    { href: '/documentos', icon: FolderOpen, label: 'Documentos', color: 'bg-blue-50 text-blue-600' },
    { href: '/listas', icon: List, label: 'Listas', color: 'bg-purple-50 text-purple-600' },
    { href: '/compras', icon: ShoppingCart, label: 'Compras', color: 'bg-green-50 text-green-600' },
    { href: '/cumpleanos', icon: Cake, label: 'Cumpleaños', color: 'bg-amber-50 text-amber-600' },
    { href: '/calendario', icon: Calendar, label: 'Calendario', color: 'bg-rose-50 text-rose-600' },
    { href: '/notas', icon: NotebookPen, label: 'Notas', color: 'bg-pink-50 text-pink-600' },
  ]

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Heart size={18} className="text-[var(--primary)]" fill="currentColor" />
          <span className="text-sm text-[var(--muted-foreground)]">{greeting}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {profile.full_name ? `Hola, ${profile.full_name.split(' ')[0]} 👋` : 'Bienvenido/a 👋'}
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">{formatDate(new Date())}</p>
      </div>

      {pinnedNotes && pinnedNotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {pinnedNotes.map((note: { id: string; title: string; content: string | null }) => (
            <Link key={note.id} href={`/notas/${note.id}`}>
              <div className="rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary-light)] p-5 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <Pin size={14} className="text-[var(--primary)] flex-shrink-0" fill="currentColor" />
                  <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">{note.title}</p>
                </div>
                {note.content && (
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-line leading-relaxed">{note.content}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {quickLinks.map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-[var(--border)] hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-xs font-medium text-[var(--foreground)] text-center leading-tight">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Calendar size={16} className="text-[var(--primary)]" />
              Próximos eventos
            </h2>
            <Link href="/calendario" className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <CardContent className="pt-3">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || '#C4737A' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{event.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {event.all_day
                          ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(event.start_date))
                          : `${formatDate(event.start_date)} · ${new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(event.start_date))}`}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] py-2">No hay eventos próximos.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Cake size={16} className="text-[var(--primary)]" />
              Próximos cumpleaños
            </h2>
            <Link href="/cumpleanos" className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <CardContent className="pt-3">
            {sortedBirthdays.length > 0 ? (
              <div className="flex flex-col gap-3">
                {sortedBirthdays.map(b => (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                      <Cake size={16} className="text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">{b.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(b.birth_date))}
                        {b.relation ? ` · ${b.relation}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${b.daysLeft <= 7 ? 'bg-red-100 text-red-600' : 'bg-[var(--primary-light)] text-[var(--primary)]'}`}>
                      {b.daysLeft === 0 ? '🎉 Hoy' : `${b.daysLeft}d`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] py-2">No hay cumpleaños registrados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
              <List size={16} className="text-[var(--primary)]" />
              Nuestras listas
            </h2>
            <Link href="/listas" className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <CardContent className="pt-3">
            {lists && lists.length > 0 ? (
              <div className="flex flex-col gap-2">
                {lists.slice(0, 4).map(list => {
                  const icons: Record<string, string> = { restaurants: '🍽️', movies: '🎬', series: '📺', bucket: '🗺️', gifts: '🎁', custom: '📝' }
                  return (
                    <Link key={list.id} href={`/listas/${list.id}`}>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--muted)] transition cursor-pointer">
                        <span className="text-lg">{icons[list.type] || '📝'}</span>
                        <span className="text-sm font-medium text-[var(--foreground)] flex-1">{list.name}</span>
                        <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] py-2">Crea tu primera lista.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
              <NotebookPen size={16} className="text-[var(--primary)]" />
              Notas recientes
            </h2>
            <Link href="/notas" className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <CardContent className="pt-3">
            {recentNotes && recentNotes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentNotes.map((n: { id: string; title: string; content: string | null; category: string }) => {
                  const catEmoji: Record<string, string> = { general: '📝', ideas: '💡', importante: '⭐', recetas: '🍳', viajes: '✈️', pendiente: '📌' }
                  return (
                    <div key={n.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0 text-lg">
                        {catEmoji[n.category] || '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{n.title}</p>
                        {n.content && <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">{n.content}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] py-2">Crea vuestra primera nota.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
