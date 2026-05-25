'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { List, ListItem, ItemStatus } from '@/lib/types'
import { ArrowLeft, Plus, Star, CheckCircle2, Circle, Trash2, ExternalLink, SkipForward, ArrowDownAZ, Clock, Pencil, RotateCcw } from 'lucide-react'
import { notifyPartner } from '@/lib/notify'

const STATUS_LABEL: Record<ItemStatus, string> = { pending: 'Pendiente', done: 'Hecho', skipped: 'Descartado' }

export default function ListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [list, setList] = useState<List | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<ListItem | null>(null)
  const [filter, setFilter] = useState<ItemStatus | 'all'>('all')
  const [sort, setSort] = useState<'newest' | 'alpha'>('newest')
  const [form, setForm] = useState({ title: '', notes: '', url: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data: listData } = await supabase.from('lists').select('*').eq('id', params.id as string).single()
      setList(listData)
      const { data: itemsData } = await supabase.from('list_items').select('*').eq('list_id', params.id as string).order('created_at', { ascending: false })
      setItems(itemsData || [])
    }
    load()
  }, [params.id])

  function openCreate() {
    setEditingItem(null)
    setForm({ title: '', notes: '', url: '' })
    setShowDialog(true)
  }

  function openEdit(item: ListItem) {
    setEditingItem(item)
    setForm({ title: item.title, notes: item.notes || '', url: item.url || '' })
    setShowDialog(true)
  }

  async function saveItem() {
    if (!form.title.trim()) return
    setLoading(true)
    if (editingItem) {
      await supabase.from('list_items').update({
        title: form.title,
        notes: form.notes || null,
        url: form.url || null,
      }).eq('id', editingItem.id)
      setItems(i => i.map(x => x.id === editingItem.id ? { ...x, title: form.title, notes: form.notes || null, url: form.url || null } : x))
    } else {
      if (!coupleId || !list) { setLoading(false); return }
      const { data } = await supabase.from('list_items').insert({
        list_id: list.id,
        couple_id: coupleId,
        title: form.title,
        notes: form.notes || null,
        url: form.url || null,
        added_by: userId,
      }).select().single()
      if (data) {
        setItems(i => [data, ...i])
        notifyPartner(coupleId, userId!, `📋 ${list.name}`, `Se añadió "${form.title}"`, `/listas/${list.id}`)
      }
    }
    setForm({ title: '', notes: '', url: '' })
    setLoading(false)
    setShowDialog(false)
  }

  async function updateStatus(item: ListItem, status: ItemStatus) {
    await supabase.from('list_items').update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null
    }).eq('id', item.id)
    setItems(items.map(i => i.id === item.id ? { ...i, status, completed_at: status === 'done' ? new Date().toISOString() : null } : i))
  }

  async function setRating(item: ListItem, rating: number) {
    await supabase.from('list_items').update({ rating }).eq('id', item.id)
    setItems(items.map(i => i.id === item.id ? { ...i, rating } : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('list_items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)
  const sorted = [...filtered].sort((a, b) =>
    sort === 'alpha'
      ? a.title.localeCompare(b.title, 'es')
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const pendingCount = items.filter(i => i.status === 'pending').length
  const doneCount = items.filter(i => i.status === 'done').length

  return (
    <div className="px-4 py-6 md:p-8 max-w-3xl mx-auto">
      <button onClick={() => router.push('/listas')} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition">
        <ArrowLeft size={16} /> Volver a listas
      </button>

      {list && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{list.icon || '📝'}</div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">{list.name}</h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {pendingCount} pendientes · {doneCount} completados
                </p>
              </div>
            </div>
            <Button onClick={openCreate}>
              <Plus size={16} /> Añadir
            </Button>
          </div>

          {/* Filters + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'done', 'skipped'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${filter === f ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}
                >
                  {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setSort('newest')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${sort === 'newest' ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}
              >
                <Clock size={12} /> Reciente
              </button>
              <button
                onClick={() => setSort('alpha')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${sort === 'alpha' ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}
              >
                <ArrowDownAZ size={12} /> A-Z
              </button>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[var(--muted-foreground)]">
                {filter === 'all' ? 'Esta lista está vacía. ¡Añade el primero!' : `No hay items ${STATUS_LABEL[filter as ItemStatus]?.toLowerCase()}s.`}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
              {sorted.map(item => (
                <div key={item.id} className="p-4 flex items-start gap-3 group hover:bg-[var(--muted)] transition first:rounded-t-2xl last:rounded-b-2xl">
                  {/* Status toggle */}
                  <button
                    onClick={() => updateStatus(item, item.status === 'pending' ? 'done' : 'pending')}
                    className="mt-0.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition flex-shrink-0"
                    title={item.status === 'skipped' ? 'Restaurar' : item.status === 'done' ? 'Marcar pendiente' : 'Marcar hecho'}
                  >
                    {item.status === 'done'
                      ? <CheckCircle2 size={20} className="text-green-500" />
                      : item.status === 'skipped'
                        ? <RotateCcw size={20} className="text-amber-400" />
                        : <Circle size={20} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm ${item.status === 'done' ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
                        {item.title}
                      </p>
                      {item.status !== 'pending' && (
                        <Badge variant={item.status === 'done' ? 'success' : 'muted'}>{STATUS_LABEL[item.status]}</Badge>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-[var(--muted-foreground)] mt-1">{item.notes}</p>}

                    {/* Stars for done items */}
                    {item.status === 'done' && (
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => setRating(item, star)}>
                            <Star
                              size={14}
                              className={star <= (item.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-[var(--muted-foreground)]'}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => updateStatus(item, item.status === 'skipped' ? 'pending' : 'skipped')}
                      className={`p-1.5 rounded-lg transition ${item.status === 'skipped' ? 'text-amber-400 hover:bg-amber-50' : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
                      title={item.status === 'skipped' ? 'Restaurar' : 'Descartar'}
                    >
                      {item.status === 'skipped' ? <RotateCcw size={14} /> : <SkipForward size={14} />}
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} title={editingItem ? 'Editar entrada' : `Añadir a "${list?.name}"`}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" placeholder="Ej: El Celler de Can Roca" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Notas (opcional)" placeholder="Recomendado por..., precio estimado..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <Input label="Enlace (opcional)" placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveItem} loading={loading} disabled={!form.title.trim()}>{editingItem ? 'Guardar' : 'Añadir'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
