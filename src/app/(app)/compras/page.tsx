'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { List, ListItem } from '@/lib/types'
import { ShoppingCart, Plus, CheckCircle2, Circle, Trash2, Pencil, Check, X } from 'lucide-react'
import { notifyPartner } from '@/lib/notify'

export default function ComprasPage() {
  const supabase = createClient()
  const [list, setList] = useState<List | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)

      let { data: shoppingList } = await supabase.from('lists').select('*').eq('couple_id', profile.couple_id).eq('type', 'shopping').single()
      if (!shoppingList) {
        const { data: newList } = await supabase.from('lists').insert({
          couple_id: profile.couple_id,
          name: 'Lista de compras',
          type: 'shopping',
          icon: '🛒',
          color: '#7AC4A0',
          created_by: user.id,
        }).select().single()
        shoppingList = newList
      }
      setList(shoppingList)

      if (shoppingList) {
        const { data: itemsData } = await supabase.from('list_items').select('*').eq('list_id', shoppingList.id).order('created_at', { ascending: false })
        setItems(itemsData || [])
      }
    }
    load()
  }, [])

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!list || !coupleId || !newItem.trim()) return
    setAdding(true)
    const { data } = await supabase.from('list_items').insert({
      list_id: list.id,
      couple_id: coupleId,
      title: newItem.trim(),
      added_by: userId,
    }).select().single()
    if (data) {
      setItems(i => [data, ...i])
      if (coupleId && userId) notifyPartner(coupleId, userId, 'Lista de compras', `Se añadió "${newItem.trim()}"`, '/compras')
    }
    setNewItem('')
    setAdding(false)
  }

  async function toggleItem(item: ListItem) {
    const status = item.status === 'done' ? 'pending' : 'done'
    await supabase.from('list_items').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', item.id)
    setItems(items.map(i => i.id === item.id ? { ...i, status, completed_at: status === 'done' ? new Date().toISOString() : null } : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('list_items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
  }

  async function clearDone() {
    const done = items.filter(i => i.status === 'done')
    if (done.length === 0) return
    await supabase.from('list_items').delete().in('id', done.map(i => i.id))
    setItems(i => i.filter(x => x.status !== 'done'))
  }

  function startEdit(item: ListItem) {
    setEditingId(item.id)
    setEditingTitle(item.title)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  async function commitEdit(id: string) {
    if (!editingTitle.trim()) { cancelEdit(); return }
    await supabase.from('list_items').update({ title: editingTitle.trim() }).eq('id', id)
    setItems(items.map(i => i.id === id ? { ...i, title: editingTitle.trim() } : i))
    cancelEdit()
  }

  const pending = items.filter(i => i.status === 'pending')
  const done = items.filter(i => i.status === 'done')

  function ItemRow({ item, isDone }: { item: ListItem; isDone: boolean }) {
    const isEditing = editingId === item.id
    return (
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 group hover:shadow-sm transition ${isDone ? 'bg-[var(--muted)] opacity-60 hover:opacity-80' : 'bg-white border border-[var(--border)]'}`}>
        <button onClick={() => toggleItem(item)} className={`flex-shrink-0 transition ${isDone ? 'text-green-500' : 'text-[var(--muted-foreground)] hover:text-green-500'}`}>
          {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>

        {isEditing ? (
          <input
            ref={editInputRef}
            value={editingTitle}
            onChange={e => setEditingTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(item.id); if (e.key === 'Escape') cancelEdit() }}
            className="flex-1 text-sm bg-transparent border-b border-[var(--primary)] outline-none text-[var(--foreground)] py-0.5"
          />
        ) : (
          <span className={`text-sm flex-1 ${isDone ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}`}>{item.title}</span>
        )}

        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition">
          {isEditing ? (
            <>
              <button onClick={() => commitEdit(item.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition">
                <Check size={14} />
              </button>
              <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition">
                <X size={14} />
              </button>
            </>
          ) : (
            <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition">
              <Pencil size={14} />
            </button>
          )}
          <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <ShoppingCart size={24} className="text-[var(--primary)]" />
            Lista de compras
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {pending.length} pendientes · {done.length} completados
          </p>
        </div>
        {done.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearDone}>
            Limpiar completados
          </Button>
        )}
      </div>

      {/* Add item */}
      <form onSubmit={addItem} className="flex gap-2 mb-8">
        <Input
          placeholder="Añadir producto..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          wrapperClassName="flex-1"
        />
        <Button type="submit" loading={adding} disabled={!newItem.trim()}>
          <Plus size={16} />
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-[var(--muted-foreground)]">La lista de compras está vacía</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map(item => <ItemRow key={item.id} item={item} isDone={false} />)}

          {done.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-4 mb-2">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted-foreground)] px-2">Completados</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
              {done.map(item => <ItemRow key={item.id} item={item} isDone={true} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
