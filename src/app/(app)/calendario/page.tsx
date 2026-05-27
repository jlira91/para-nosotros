'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types'
import { Calendar, Plus, Trash2, MapPin, ChevronLeft, ChevronRight, Link2, Check, Pencil } from 'lucide-react'
import { notifyPartner } from '@/lib/notify'

const COLORS = ['#C4737A', '#7A9BC4', '#7AC4A0', '#C4A87A', '#A87AC4', '#FF6B6B', '#4ECDC4']
const TZ = 'America/Lima'

/** Devuelve { year, month (0-based), day } de una Date en zona Lima */
function limaParts(date: Date) {
  const str = date.toLocaleDateString('en-CA', { timeZone: TZ }) // "YYYY-MM-DD"
  const [y, m, d] = str.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

export default function CalendarioPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '', all_day: true, color: COLORS[0], location: '' })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyFeedUrl() {
    if (!coupleId) return
    const url = `${window.location.origin}/api/calendar/${coupleId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data } = await supabase.from('events').select('*').eq('couple_id', profile.couple_id).order('start_date')
      setEvents(data || [])
    }
    load()
  }, [])

  function openCreate(dateStr?: string) {
    setEditingEvent(null)
    setForm({ title: '', description: '', start_date: dateStr || '', end_date: '', all_day: true, color: COLORS[0], location: '' })
    setShowDialog(true)
  }

  function openEdit(e: React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation()
    setEditingEvent(event)
    setForm({
      title: event.title,
      description: event.description || '',
      start_date: event.start_date,
      end_date: event.end_date || '',
      all_day: event.all_day,
      color: event.color,
      location: event.location || '',
    })
    setShowDialog(true)
  }

  async function saveEvent() {
    if (!form.title.trim() || !form.start_date) return
    setLoading(true)
    if (editingEvent) {
      await supabase.from('events').update({
        title: form.title,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        all_day: form.all_day,
        color: form.color,
        location: form.location || null,
      }).eq('id', editingEvent.id)
      setEvents(e => e.map(x => x.id === editingEvent.id ? { ...x, title: form.title, description: form.description || null, start_date: form.start_date, end_date: form.end_date || null, all_day: form.all_day, color: form.color, location: form.location || null } : x).sort((a, b) => a.start_date.localeCompare(b.start_date)))
    } else {
      if (!coupleId) { setLoading(false); return }
      const { data } = await supabase.from('events').insert({
        couple_id: coupleId,
        title: form.title,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        all_day: form.all_day,
        color: form.color,
        location: form.location || null,
        created_by: userId,
      }).select().single()
      if (data) {
        setEvents(e => [...e, data].sort((a, b) => a.start_date.localeCompare(b.start_date)))
        notifyPartner(coupleId, userId!, '📅 Calendario', `Nuevo evento: "${form.title}"`, '/calendario')
      }
    }
    setLoading(false)
    setShowDialog(false)
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(e => e.filter(x => x.id !== id))
  }

  // Calendar grid
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = new Date(year, month).toLocaleDateString('es', { month: 'long', year: 'numeric' })
  const today = new Date()
  const todayLima = limaParts(today)

  function prevMonth() { setCurrentDate(new Date(year, month - 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1)) }

  function eventsOnDay(day: number) {
    const cellDate = new Date(Date.UTC(year, month, day))
    return events.filter(e => {
      if (e.all_day) {
        const start = new Date(e.start_date)
        const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
        const endUTC = e.end_date
          ? (() => { const ed = new Date(e.end_date); return Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate()) })()
          : startUTC
        return cellDate.getTime() >= startUTC && cellDate.getTime() <= endUTC
      }
      // Eventos con hora: comparar en zona Lima
      const p = limaParts(new Date(e.start_date))
      return p.year === year && p.month === month && p.day === day
    })
  }

  function formatEventDate(dateStr: string, allDay: boolean) {
    const d = new Date(dateStr)
    if (allDay) {
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        .toLocaleDateString('es', { day: 'numeric', month: 'short' })
    }
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: TZ })
  }

  const selectedEvents = selectedDate ? eventsOnDay(selectedDate.getDate()) : []

  // Upcoming events — comparar contra "ahora" en Lima
  const nowLima = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  const upcoming = events.filter(e => new Date(e.start_date) >= nowLima).slice(0, 5)

  function openDialogForDate(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    openCreate(dateStr)
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Calendar size={24} className="text-[var(--primary)]" />
            Calendario
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Vuestros eventos importantes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyFeedUrl} title="Copiar enlace para suscribirse en Google Calendar / Outlook">
            {copied ? <Check size={16} className="text-green-500" /> : <Link2 size={16} />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Suscribirse'}</span>
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo evento</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold text-[var(--foreground)] capitalize">{monthName}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-[var(--muted-foreground)] py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayEvents = eventsOnDay(day)
              const isToday = todayLima.year === year && todayLima.month === month && todayLima.day === day
              const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : new Date(year, month, day))}
                  onDoubleClick={() => openDialogForDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-xl text-sm transition ${isToday ? 'bg-[var(--primary)] text-white font-bold' : isSelected ? 'bg-[var(--primary-light)] text-[var(--primary)] font-medium' : 'hover:bg-[var(--muted)]'}`}
                >
                  {day}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: isToday ? 'white' : e.color }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {selectedDate && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-sm font-medium text-[var(--foreground)] mb-2 capitalize">
                {selectedDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {selectedEvents.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--muted-foreground)]">Sin eventos</p>
                  <Button size="sm" variant="ghost" onClick={() => openDialogForDate(selectedDate.getDate())}>
                    <Plus size={14} /> Añadir
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedEvents.map(e => (
                    <div key={e.id} className="flex items-center gap-2 group">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-[var(--foreground)]">{e.title}</span>
                        {!e.all_day && (
                          <span className="text-xs text-[var(--muted-foreground)] ml-1.5">
                            {new Date(e.start_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}
                          </span>
                        )}
                      </div>
                      <button onClick={ev => openEdit(ev, e)} className="md:opacity-0 md:group-hover:opacity-100 p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteEvent(e.id)} className="md:opacity-0 md:group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Próximos eventos</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No hay eventos próximos</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map(event => (
                <div key={event.id} className="flex items-start gap-3 group">
                  <div className="w-1.5 h-10 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{event.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatEventDate(event.start_date, event.all_day)}
                      {!event.all_day && (
                        <span> · {new Date(event.start_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}</span>
                      )}
                    </p>
                    {event.location && (
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {event.location}
                      </p>
                    )}
                  </div>
                  <div className="md:opacity-0 md:group-hover:opacity-100 flex gap-1 flex-shrink-0 mt-1 transition">
                    <button onClick={e => openEdit(e, event)} className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteEvent(event.id)} className="p-1 rounded hover:bg-red-50 text-red-400 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} title={editingEvent ? 'Editar evento' : 'Nuevo evento'}>
        <div className="flex flex-col gap-4">
          <Input label="Título" placeholder="Ej: Aniversario" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type={form.all_day ? 'date' : 'datetime-local'} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="Fecha fin (opcional)" type={form.all_day ? 'date' : 'datetime-local'} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.all_day} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))} className="rounded" />
            Todo el día
          </label>
          <Input label="Lugar (opcional)" placeholder="Ej: Roma, Italia" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <Textarea label="Descripción (opcional)" placeholder="Detalles del evento..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveEvent} loading={loading} disabled={!form.title.trim() || !form.start_date}>{editingEvent ? 'Guardar' : 'Crear evento'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
