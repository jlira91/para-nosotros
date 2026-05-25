'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { daysUntilBirthday, getAge } from '@/lib/utils'
import type { Birthday } from '@/lib/types'
import { Cake, Plus, Trash2, Gift, Pencil } from 'lucide-react'
import { notifyPartner } from '@/lib/notify'

const RELATIONS = ['Familia directa', 'Familia extendida', 'Amigos', 'Trabajo', 'Otro']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Year 1900 is our sentinel for "no year known"
const NO_YEAR = 1900

function hasYear(birthDate: string) {
  return new Date(birthDate).getFullYear() !== NO_YEAR
}

function formatBirthdayDate(birthDate: string) {
  const d = new Date(birthDate + 'T00:00:00')
  if (!hasYear(birthDate)) {
    return d.toLocaleDateString('es', { day: 'numeric', month: 'long' })
  }
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

export default function CumpleanosPage() {
  const supabase = createClient()
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null)
  const [form, setForm] = useState({ name: '', birth_date: '', relation: '', notes: '', noYear: false, month: '1', day: '1' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data } = await supabase.from('birthdays').select('*').eq('couple_id', profile.couple_id).order('birth_date')
      setBirthdays(data || [])
    }
    load()
  }, [])

  function openCreate() {
    setEditingBirthday(null)
    setForm({ name: '', birth_date: '', relation: '', notes: '', noYear: false, month: '1', day: '1' })
    setShowDialog(true)
  }

  function openEdit(b: Birthday) {
    setEditingBirthday(b)
    const noYear = !hasYear(b.birth_date)
    const d = new Date(b.birth_date + 'T00:00:00')
    setForm({
      name: b.name,
      birth_date: b.birth_date,
      relation: b.relation || '',
      notes: b.notes || '',
      noYear,
      month: String(d.getMonth() + 1),
      day: String(d.getDate()),
    })
    setShowDialog(true)
  }

  function buildDate(): string {
    if (form.noYear) {
      const m = String(form.month).padStart(2, '0')
      const d = String(form.day).padStart(2, '0')
      return `${NO_YEAR}-${m}-${d}`
    }
    return form.birth_date
  }

  function isFormValid() {
    if (!form.name.trim()) return false
    if (form.noYear) return !!form.month && !!form.day
    return !!form.birth_date
  }

  async function saveBirthday() {
    if (!isFormValid()) return
    setLoading(true)
    const dateToSave = buildDate()
    if (editingBirthday) {
      await supabase.from('birthdays').update({
        name: form.name,
        birth_date: dateToSave,
        relation: form.relation || null,
        notes: form.notes || null,
      }).eq('id', editingBirthday.id)
      setBirthdays(b => b.map(x => x.id === editingBirthday.id ? { ...x, name: form.name, birth_date: dateToSave, relation: form.relation || null, notes: form.notes || null } : x))
    } else {
      if (!coupleId) { setLoading(false); return }
      const { data } = await supabase.from('birthdays').insert({
        couple_id: coupleId,
        name: form.name,
        birth_date: dateToSave,
        relation: form.relation || null,
        notes: form.notes || null,
        added_by: userId,
      }).select().single()
      if (data) {
        setBirthdays(b => [...b, data].sort((a, b) => daysUntilBirthday(a.birth_date) - daysUntilBirthday(b.birth_date)))
        notifyPartner(coupleId, userId!, '🎂 Cumpleaños', `Se añadió el cumpleaños de ${form.name}`, '/cumpleanos')
      }
    }
    setLoading(false)
    setShowDialog(false)
  }

  async function deleteBirthday(id: string) {
    await supabase.from('birthdays').delete().eq('id', id)
    setBirthdays(b => b.filter(x => x.id !== id))
  }

  // Days in selected month (use non-leap year 2001 for safety)
  const daysInMonth = new Date(2001, Number(form.month), 0).getDate()

  const sorted = [...birthdays].sort((a, b) => daysUntilBirthday(a.birth_date) - daysUntilBirthday(b.birth_date))
  const today = sorted.filter(b => daysUntilBirthday(b.birth_date) === 0)
  const thisWeek = sorted.filter(b => { const d = daysUntilBirthday(b.birth_date); return d > 0 && d <= 7 })
  const upcoming = sorted.filter(b => daysUntilBirthday(b.birth_date) > 7)

  function BirthdayCard({ b }: { b: Birthday }) {
    const days = daysUntilBirthday(b.birth_date)
    const age = hasYear(b.birth_date) ? getAge(b.birth_date) : null
    return (
      <Card className="flex items-center gap-4 px-5 py-4 group hover:shadow-md transition">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${days === 0 ? 'bg-amber-100' : 'bg-[var(--primary-light)]'}`}>
          {days === 0 ? '🎉' : <Cake size={20} className="text-[var(--primary)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--foreground)]">{b.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {b.relation && `${b.relation} · `}{age !== null ? `${age} años · ` : ''}{formatBirthdayDate(b.birth_date)}
          </p>
          {b.notes && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{b.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${days === 0 ? 'bg-amber-100 text-amber-700' : days <= 7 ? 'bg-red-100 text-red-600' : 'bg-[var(--primary-light)] text-[var(--primary)]'}`}>
            {days === 0 ? '¡Hoy!' : `${days}d`}
          </span>
          <button
            onClick={() => openEdit(b)}
            className="md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => deleteBirthday(b.id)}
            className="md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 text-red-400 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Cake size={24} className="text-[var(--primary)]" />
            Cumpleaños
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {birthdays.length} personas registradas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Añadir
        </Button>
      </div>

      {birthdays.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎂</div>
          <p className="text-[var(--muted-foreground)] mb-4">No hay cumpleaños registrados aún</p>
          <Button onClick={openCreate}><Plus size={16} /> Añadir primero</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {today.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 flex items-center gap-2 mb-3">
                🎉 ¡Hoy es su cumpleaños!
              </h2>
              <div className="flex flex-col gap-2">{today.map(b => <BirthdayCard key={b.id} b={b} />)}</div>
            </div>
          )}
          {thisWeek.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2 mb-3">
                <Gift size={14} /> Esta semana
              </h2>
              <div className="flex flex-col gap-2">{thisWeek.map(b => <BirthdayCard key={b.id} b={b} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Próximos</h2>
              <div className="flex flex-col gap-2">{upcoming.map(b => <BirthdayCard key={b.id} b={b} />)}</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} title={editingBirthday ? 'Editar cumpleaños' : 'Añadir cumpleaños'}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" placeholder="Nombre y apellido" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          {/* No-year toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.noYear}
              onChange={e => setForm(f => ({ ...f, noYear: e.target.checked, birth_date: '' }))}
              className="rounded"
            />
            No sé el año de nacimiento
          </label>

          {form.noYear ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Mes</label>
                <select
                  value={form.month}
                  onChange={e => setForm(f => ({ ...f, month: e.target.value, day: '1' }))}
                  className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-base text-[var(--foreground)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Día</label>
                <select
                  value={form.day}
                  onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-base text-[var(--foreground)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <Input label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
          )}

          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Relación</label>
            <div className="flex flex-wrap gap-2">
              {RELATIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setForm(f => ({ ...f, relation: r }))}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition ${form.relation === r ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Notas (opcional)" placeholder="Ideas de regalo, preferencias..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveBirthday} loading={loading} disabled={!isFormValid()}>{editingBirthday ? 'Guardar' : 'Añadir'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
