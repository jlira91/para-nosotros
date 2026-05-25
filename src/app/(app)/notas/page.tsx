'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { Note, NoteCategory } from '@/lib/types'
import { NotebookPen, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES: { value: NoteCategory; label: string; emoji: string; color: string }[] = [
  { value: 'general',    label: 'General',    emoji: '📝', color: 'bg-gray-100 text-gray-600' },
  { value: 'ideas',      label: 'Ideas',      emoji: '💡', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'importante', label: 'Importante', emoji: '⭐', color: 'bg-amber-100 text-amber-700' },
  { value: 'recetas',    label: 'Recetas',    emoji: '🍳', color: 'bg-orange-100 text-orange-700' },
  { value: 'viajes',     label: 'Viajes',     emoji: '✈️', color: 'bg-blue-100 text-blue-700' },
  { value: 'pendiente',  label: 'Pendiente',  emoji: '📌', color: 'bg-red-100 text-red-600' },
]

const emptyForm = { title: '', content: '', category: 'general' as NoteCategory }

export default function NotasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<NoteCategory | 'all'>('all')
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data } = await supabase.from('notes').select('*').eq('couple_id', profile.couple_id).order('updated_at', { ascending: false })
      setNotes(data || [])
    }
    load()
  }, [])

  function openCreate() {
    setForm(emptyForm)
    setShowDialog(true)
  }

  async function saveNote() {
    if (!coupleId || !form.title.trim()) return
    setSaving(true)
    const { data } = await supabase.from('notes')
      .insert({ couple_id: coupleId, title: form.title.trim(), content: form.content || null, category: form.category, created_by: userId })
      .select().single()
    setSaving(false)
    setShowDialog(false)
    if (data) router.push(`/notas/${data.id}`)
  }

  async function deleteNote(note: Note) {
    if (!confirm('¿Eliminar esta nota?')) return
    await supabase.from('notes').delete().eq('id', note.id)
    setNotes(n => n.filter(x => x.id !== note.id))
  }

  const filtered = filterCat === 'all' ? notes : notes.filter(n => n.category === filterCat)

  function getCat(value: NoteCategory) {
    return CATEGORIES.find(c => c.value === value) || CATEGORIES[0]
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <NotebookPen size={24} className="text-[var(--primary)]" />
            Notas
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Vuestro espacio de ideas y apuntes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nueva nota
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterCat === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}
        >
          Todas
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCat(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${filterCat === cat.value ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}
          >
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-[var(--muted-foreground)] mb-4">
            {filterCat === 'all' ? 'No hay notas todavía' : `No hay notas en "${getCat(filterCat as NoteCategory).label}"`}
          </p>
          <Button onClick={openCreate}><Plus size={16} /> Crear primera nota</Button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-4 space-y-4">
          {filtered.map(note => {
            const cat = getCat(note.category)
            return (
              <div
                key={note.id}
                className="break-inside-avoid bg-white border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition group cursor-pointer"
                onClick={() => router.push(`/notas/${note.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cat.color}`}>
                      {cat.emoji} {cat.label}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => deleteNote(note)}
                      className="md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">{note.title}</h3>
                {note.content && (
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-2">{note.content}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-3">{formatDate(note.updated_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} title="Nueva nota">
        <div className="flex flex-col gap-4">
          <Input
            label="Título"
            placeholder="¿De qué trata esta nota?"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <Textarea
            label="Contenido (opcional)"
            placeholder="Escribe aquí..."
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={5}
          />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 border ${
                    form.category === cat.value
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveNote} loading={saving} disabled={!form.title.trim()}>
              Crear nota
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
