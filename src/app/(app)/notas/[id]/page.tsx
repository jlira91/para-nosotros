'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { Note, NoteCategory } from '@/lib/types'
import { ArrowLeft, Trash2, Check } from 'lucide-react'

const CATEGORIES: { value: NoteCategory; label: string; emoji: string }[] = [
  { value: 'general',    label: 'General',    emoji: '📝' },
  { value: 'ideas',      label: 'Ideas',      emoji: '💡' },
  { value: 'importante', label: 'Importante', emoji: '⭐' },
  { value: 'recetas',    label: 'Recetas',    emoji: '🍳' },
  { value: 'viajes',     label: 'Viajes',     emoji: '✈️' },
  { value: 'pendiente',  label: 'Pendiente',  emoji: '📌' },
]

export default function NotaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<NoteCategory>('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('notes').select('*').eq('id', id).single()
      if (!data) { router.replace('/notas'); return }
      setNote(data)
      setTitle(data.title)
      setContent(data.content || '')
      setCategory(data.category)
    }
    load()
  }, [id])

  // Auto-save after 1.5s of inactivity
  useEffect(() => {
    if (!dirty || !note) return
    const timer = setTimeout(save, 1500)
    return () => clearTimeout(timer)
  }, [title, content, category, dirty])

  function markDirty() {
    setDirty(true)
    setSaved(false)
  }

  async function save() {
    if (!note || !title.trim()) return
    setSaving(true)
    await supabase.from('notes')
      .update({ title: title.trim(), content: content || null, category })
      .eq('id', note.id)
    setSaving(false)
    setSaved(true)
    setDirty(false)
  }

  async function deleteNote() {
    if (!note || !confirm('¿Eliminar esta nota?')) return
    await supabase.from('notes').delete().eq('id', note.id)
    router.replace('/notas')
  }

  const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0]

  if (!note) return null

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[var(--border)] flex items-center gap-3 px-4 h-14 flex-shrink-0">
        <button
          onClick={() => { if (dirty) save(); router.push('/notas') }}
          className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1" />
        <span className="text-xs text-[var(--muted-foreground)]">
          {saving ? 'Guardando…' : saved ? <span className="flex items-center gap-1 text-green-600"><Check size={12} /> Guardado</span> : ''}
        </span>
        <button
          onClick={deleteNote}
          className="p-2 rounded-xl hover:bg-red-50 text-red-400 transition"
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Category selector */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => { setCategory(c.value); markDirty() }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition flex items-center gap-1 border ${
                category === c.value
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <textarea
          value={title}
          onChange={e => { setTitle(e.target.value); markDirty() }}
          placeholder="Título"
          rows={1}
          className="w-full text-2xl font-bold text-[var(--foreground)] bg-transparent border-none outline-none resize-none placeholder:text-[var(--muted-foreground)] leading-tight"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = el.scrollHeight + 'px'
          }}
        />

        {/* Divider */}
        <div className="border-t border-[var(--border)]" />

        {/* Body */}
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); markDirty() }}
          placeholder="Escribe aquí…"
          className="flex-1 w-full text-base text-[var(--foreground)] bg-transparent border-none outline-none resize-none placeholder:text-[var(--muted-foreground)] leading-relaxed min-h-[300px]"
        />
      </div>
    </div>
  )
}
