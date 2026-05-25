'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import type { List, ListType } from '@/lib/types'
import { List as ListIcon, Plus, Trash2, ArrowRight, Pencil } from 'lucide-react'

const LIST_TYPES: { value: ListType; label: string; icon: string; color: string }[] = [
  { value: 'restaurants', label: 'Restaurantes', icon: '🍽️', color: '#FF6B6B' },
  { value: 'movies', label: 'Películas', icon: '🎬', color: '#4ECDC4' },
  { value: 'series', label: 'Series', icon: '📺', color: '#45B7D1' },
  { value: 'bucket', label: 'Bucket list', icon: '🗺️', color: '#96CEB4' },
  { value: 'gifts', label: 'Ideas de regalos', icon: '🎁', color: '#DDA0DD' },
  { value: 'custom', label: 'Lista personalizada', icon: '📝', color: '#C4737A' },
]

export default function ListasPage() {
  const supabase = createClient()
  const [lists, setLists] = useState<List[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingList, setEditingList] = useState<List | null>(null)
  const [form, setForm] = useState({ name: '', type: 'restaurants' as ListType })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data } = await supabase.from('lists').select('*').eq('couple_id', profile.couple_id).neq('type', 'shopping').order('created_at')
      setLists(data || [])
    }
    load()
  }, [])

  function openCreate() {
    setEditingList(null)
    setForm({ name: '', type: 'restaurants' })
    setShowDialog(true)
  }

  function openEdit(e: React.MouseEvent, list: List) {
    e.preventDefault()
    setEditingList(list)
    setForm({ name: list.name, type: list.type as ListType })
    setShowDialog(true)
  }

  async function saveList() {
    if (!coupleId || !form.name.trim()) return
    setLoading(true)
    if (editingList) {
      const typeInfo = LIST_TYPES.find(t => t.value === form.type)
      await supabase.from('lists').update({
        name: form.name,
        type: form.type,
        icon: typeInfo?.icon,
        color: typeInfo?.color,
      }).eq('id', editingList.id)
      setLists(l => l.map(x => x.id === editingList.id ? { ...x, name: form.name, type: form.type, icon: typeInfo?.icon || x.icon, color: typeInfo?.color || x.color } : x))
    } else {
      const typeInfo = LIST_TYPES.find(t => t.value === form.type)
      const { data } = await supabase.from('lists').insert({
        couple_id: coupleId,
        name: form.name,
        type: form.type,
        icon: typeInfo?.icon,
        color: typeInfo?.color,
        created_by: userId,
      }).select().single()
      if (data) setLists(l => [...l, data])
    }
    setForm({ name: '', type: 'restaurants' })
    setLoading(false)
    setShowDialog(false)
  }

  async function deleteList(id: string) {
    if (!confirm('¿Eliminar esta lista y todos sus items?')) return
    await supabase.from('lists').delete().eq('id', id)
    setLists(l => l.filter(x => x.id !== id))
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <ListIcon size={24} className="text-[var(--primary)]" />
            Listas
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Restaurantes, películas, bucket list y más
          </p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus size={16} /> Nueva lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-[var(--muted-foreground)] mb-4">Crea vuestra primera lista juntos</p>
          <Button onClick={openCreate}>
            <Plus size={16} /> Crear lista
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map(list => {
            const typeInfo = LIST_TYPES.find(t => t.value === list.type)
            return (
              <Link key={list.id} href={`/listas/${list.id}`}>
                <Card className="group flex items-center gap-4 px-5 py-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: (list.color || typeInfo?.color || '#C4737A') + '20' }}
                  >
                    {list.icon || typeInfo?.icon || '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)]">{list.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{typeInfo?.label}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => openEdit(e, list)}
                      className="md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); deleteList(list.id) }}
                      className="md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 text-red-400 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ArrowRight size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} title={editingList ? 'Editar lista' : 'Nueva lista'}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre de la lista" placeholder="Ej: Restaurantes pendientes" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {LIST_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setForm(f => ({ ...f, type: type.value }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${form.type === type.value ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}
                >
                  <span>{type.icon}</span> {type.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveList} loading={loading} disabled={!form.name.trim()}>{editingList ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
