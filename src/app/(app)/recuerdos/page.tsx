'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { Memory } from '@/lib/types'
import { BookHeart, Plus, Trash2, Image, X } from 'lucide-react'

const MOODS = ['💝', '😍', '🥰', '😊', '🎉', '✈️', '🍽️', '🌅', '🏖️', '🎭', '🎬', '🌿']

export default function RecuerdosPage() {
  const supabase = createClient()
  const [memories, setMemories] = useState<Memory[]>([])
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', mood: '💝' })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data } = await supabase.from('memories').select('*').eq('couple_id', profile.couple_id).order('created_at', { ascending: false })
      setMemories(data || [])

      // Load image URLs
      const withImages = (data || []).filter(m => m.image_path)
      const urls: Record<string, string> = {}
      await Promise.all(withImages.map(async m => {
        const { data: urlData } = await supabase.storage.from('memories').createSignedUrl(m.image_path!, 3600)
        if (urlData?.signedUrl) urls[m.id] = urlData.signedUrl
      }))
      setImageUrls(urls)
    }
    load()
  }, [])

  async function addMemory() {
    if (!coupleId || !form.title.trim()) return
    setLoading(true)
    let imagePath: string | null = null

    if (selectedImage) {
      const path = `${coupleId}/${Date.now()}-${selectedImage.name}`
      const { error } = await supabase.storage.from('memories').upload(path, selectedImage)
      if (!error) imagePath = path
    }

    const { data } = await supabase.from('memories').insert({
      couple_id: coupleId,
      title: form.title,
      content: form.content || null,
      mood: form.mood,
      image_path: imagePath,
      created_by: userId,
    }).select().single()

    if (data) {
      if (imagePath) {
        const { data: urlData } = await supabase.storage.from('memories').createSignedUrl(imagePath, 3600)
        if (urlData?.signedUrl) setImageUrls(u => ({ ...u, [data.id]: urlData.signedUrl }))
      }
      setMemories(m => [data, ...m])
    }
    setForm({ title: '', content: '', mood: '💝' })
    setSelectedImage(null)
    setLoading(false)
    setShowDialog(false)
  }

  async function deleteMemory(memory: Memory) {
    if (!confirm('¿Eliminar este recuerdo?')) return
    if (memory.image_path) await supabase.storage.from('memories').remove([memory.image_path])
    await supabase.from('memories').delete().eq('id', memory.id)
    setMemories(m => m.filter(x => x.id !== memory.id))
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <BookHeart size={24} className="text-[var(--primary)]" />
            Recuerdos
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Vuestro diario compartido
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus size={16} /> Nuevo recuerdo
        </Button>
      </div>

      {memories.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💝</div>
          <p className="text-[var(--muted-foreground)] mb-4">Guarda vuestros momentos especiales</p>
          <Button onClick={() => setShowDialog(true)}><Plus size={16} /> Crear primero recuerdo</Button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-4 space-y-4">
          {memories.map(memory => (
            <div key={memory.id} className="break-inside-avoid bg-white border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-md transition group">
              {imageUrls[memory.id] && (
                <div className="w-full h-48 overflow-hidden">
                  <img src={imageUrls[memory.id]} alt={memory.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{memory.mood}</span>
                    <h3 className="font-semibold text-[var(--foreground)]">{memory.title}</h3>
                  </div>
                  <button
                    onClick={() => deleteMemory(memory)}
                    className="md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {memory.content && (
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{memory.content}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-3">{formatDate(memory.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} title="Nuevo recuerdo" className="max-w-lg">
        <div className="flex flex-col gap-4">
          <Input label="Título" placeholder="¿Qué momento especial fue este?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Descripción (opcional)" placeholder="Cuéntanos qué pasó, cómo os sentisteis..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Emoji del momento</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, mood: m }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${form.mood === m ? 'bg-[var(--primary-light)] ring-2 ring-[var(--primary)]' : 'hover:bg-[var(--muted)]'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Foto (opcional)</label>
            <div
              className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center cursor-pointer hover:border-[var(--primary)] transition"
              onClick={() => fileRef.current?.click()}
            >
              {selectedImage ? (
                <div className="flex items-center justify-center gap-2">
                  <Image size={16} className="text-[var(--primary)]" />
                  <span className="text-sm">{selectedImage.name}</span>
                  <button onClick={e => { e.stopPropagation(); setSelectedImage(null) }}>
                    <X size={14} className="text-[var(--muted-foreground)]" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Añadir foto del recuerdo</p>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={e => setSelectedImage(e.target.files?.[0] || null)} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={addMemory} loading={loading} disabled={!form.title.trim()}>Guardar recuerdo</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
