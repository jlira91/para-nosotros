'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Folder, Document } from '@/lib/types'
import {
  FolderOpen, Plus, Upload, File, FileImage, Trash2,
  Download, ChevronRight, Home, FolderPlus, X, Pencil
} from 'lucide-react'
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const FOLDER_COLORS = ['#C4737A', '#7A9BC4', '#7AC4A0', '#C4A87A', '#A87AC4', '#C4C47A']

export default function DocumentosPage() {
  const supabase = createClient()
  const [folders, setFolders] = useState<Folder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [editingDocName, setEditingDocName] = useState('')
  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; url: string } | null>(null)
  const [pdfNumPages, setPdfNumPages] = useState<number>(0)
  const [pdfWidth, setPdfWidth] = useState<number>(600)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newFolder, setNewFolder] = useState({ name: '', color: FOLDER_COLORS[0] })
  const [newDoc, setNewDoc] = useState({ name: '', description: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
      if (!profile?.couple_id) return
      setCoupleId(profile.couple_id)
      const { data: fols } = await supabase.from('folders').select('*').eq('couple_id', profile.couple_id).order('created_at')
      setFolders(fols || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!coupleId) return
    async function loadDocs() {
      let query = supabase.from('documents').select('*').eq('couple_id', coupleId!).order('created_at', { ascending: false })
      if (selectedFolder) query = query.eq('folder_id', selectedFolder.id)
      else query = query.is('folder_id', null)
      const { data } = await query
      setDocuments(data || [])
    }
    loadDocs()
  }, [coupleId, selectedFolder])

  function openCreateFolder() {
    setEditingFolder(null)
    setNewFolder({ name: '', color: FOLDER_COLORS[0] })
    setShowFolderDialog(true)
  }

  function openEditFolder(e: React.MouseEvent, folder: Folder) {
    e.stopPropagation()
    setEditingFolder(folder)
    setNewFolder({ name: folder.name, color: folder.color || FOLDER_COLORS[0] })
    setShowFolderDialog(true)
  }

  async function saveFolder() {
    if (!newFolder.name.trim()) return
    if (editingFolder) {
      await supabase.from('folders').update({ name: newFolder.name, color: newFolder.color }).eq('id', editingFolder.id)
      setFolders(f => f.map(x => x.id === editingFolder.id ? { ...x, name: newFolder.name, color: newFolder.color } : x))
      if (selectedFolder?.id === editingFolder.id) setSelectedFolder(s => s ? { ...s, name: newFolder.name, color: newFolder.color } : s)
    } else {
      if (!coupleId) return
      const { data } = await supabase.from('folders')
        .insert({ couple_id: coupleId, name: newFolder.name, color: newFolder.color, created_by: userId })
        .select().single()
      if (data) setFolders(f => [...f, data])
    }
    setNewFolder({ name: '', color: FOLDER_COLORS[0] })
    setShowFolderDialog(false)
  }

  async function deleteFolder(id: string) {
    if (!confirm('¿Eliminar esta carpeta y todos sus documentos?')) return
    await supabase.from('folders').delete().eq('id', id)
    setFolders(f => f.filter(x => x.id !== id))
    if (selectedFolder?.id === id) setSelectedFolder(null)
  }

  async function uploadDocument() {
    if (!coupleId || !selectedFile || !newDoc.name.trim()) return
    setUploading(true)
    const ext = selectedFile.name.split('.').pop()
    const path = `${coupleId}/${Date.now()}-${selectedFile.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, selectedFile)
    if (uploadError) { setUploading(false); return }

    const { data } = await supabase.from('documents').insert({
      couple_id: coupleId,
      folder_id: selectedFolder?.id || null,
      name: newDoc.name,
      description: newDoc.description,
      file_path: path,
      file_type: ext,
      file_size: selectedFile.size,
      uploaded_by: userId,
    }).select().single()

    if (data) setDocuments(d => [data, ...d])
    setNewDoc({ name: '', description: '' })
    setSelectedFile(null)
    setUploading(false)
    setShowUploadDialog(false)
  }

  async function deleteDocument(doc: Document) {
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(d => d.filter(x => x.id !== doc.id))
  }

  function openEditDoc(e: React.MouseEvent, doc: Document) {
    e.stopPropagation()
    setEditingDoc(doc)
    setEditingDocName(doc.name)
  }

  async function saveDocName() {
    if (!editingDoc || !editingDocName.trim()) return
    await supabase.from('documents').update({ name: editingDocName.trim() }).eq('id', editingDoc.id)
    setDocuments(d => d.map(x => x.id === editingDoc.id ? { ...x, name: editingDocName.trim() } : x))
    setEditingDoc(null)
  }

  async function downloadDocument(doc: Document) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60, { download: doc.name })
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  async function previewDocument(doc: Document) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 300)
    if (data?.signedUrl) {
      setPdfNumPages(0)
      setPdfWidth(Math.min(window.innerWidth - 32, 800))
      setPreviewDoc({ doc, url: data.signedUrl })
    }
  }

  function isImage(type: string | null) {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type?.toLowerCase() || '')
  }

  function isPDF(type: string | null) {
    return type?.toLowerCase() === 'pdf'
  }

  function canPreview(type: string | null) {
    return isImage(type) || isPDF(type)
  }

  function fileIcon(type: string | null) {
    if (!type) return <File size={20} />
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return <FileImage size={20} />
    return <File size={20} />
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <FolderOpen size={24} className="text-[var(--primary)]" />
            Documentos
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Guarda y organiza vuestros documentos importantes
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={openCreateFolder}>
            <FolderPlus size={16} /> Nueva carpeta
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload size={16} /> Subir documento
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button
          onClick={() => setSelectedFolder(null)}
          className={`flex items-center gap-1 transition ${!selectedFolder ? 'text-[var(--primary)] font-medium' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
        >
          <Home size={14} /> Inicio
        </button>
        {selectedFolder && (
          <>
            <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
            <span className="text-[var(--foreground)] font-medium">{selectedFolder.name}</span>
          </>
        )}
      </div>

      {/* Folders grid */}
      {!selectedFolder && folders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Carpetas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {folders.map(folder => (
              <div
                key={folder.id}
                className="group relative bg-white border border-[var(--border)] rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                onClick={() => setSelectedFolder(folder)}
              >
                <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 flex gap-1 transition">
                  <button
                    onClick={e => openEditFolder(e, folder)}
                    className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteFolder(folder.id) }}
                    className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: folder.color + '25', color: folder.color }}
                >
                  <FolderOpen size={20} />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{folder.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        {!selectedFolder && <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Documentos sin carpeta</h2>}
        {documents.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="mx-auto text-[var(--muted-foreground)] opacity-30 mb-3" />
            <p className="text-[var(--muted-foreground)]">No hay documentos aquí</p>
            <Button className="mt-4" onClick={() => setShowUploadDialog(true)}>
              <Upload size={16} /> Subir primero documento
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map(doc => (
              <Card
                key={doc.id}
                className={`flex items-center gap-4 px-5 py-4 hover:shadow-md transition ${canPreview(doc.file_type) ? 'cursor-pointer' : ''}`}
                onClick={() => canPreview(doc.file_type) && previewDocument(doc)}
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                  {fileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{doc.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {doc.file_type?.toUpperCase()} · {formatSize(doc.file_size)} · {formatDate(doc.created_at)}
                  </p>
                  {doc.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{doc.description}</p>}
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={e => openEditDoc(e, doc)} className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition" title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => downloadDocument(doc)} className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition" title="Descargar">
                    <Download size={16} />
                  </button>
                  <button onClick={() => deleteDocument(doc)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition" title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Folder dialog (create / edit) */}
      <Dialog open={showFolderDialog} onClose={() => setShowFolderDialog(false)} title={editingFolder ? 'Editar carpeta' : 'Nueva carpeta'}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" placeholder="Ej: DNI y pasaportes" value={newFolder.name} onChange={e => setNewFolder(f => ({ ...f, name: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Color</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewFolder(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition ${newFolder.color === c ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>Cancelar</Button>
            <Button onClick={saveFolder} disabled={!newFolder.name.trim()}>{editingFolder ? 'Guardar' : 'Crear carpeta'}</Button>
          </div>
        </div>
      </Dialog>

      {/* Preview overlay */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setPreviewDoc(null)}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <p className="text-white font-medium text-sm truncate flex-1 mr-4">{previewDoc.doc.name}</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(previewDoc.url, '_blank')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Descargar"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {isImage(previewDoc.doc.file_type) ? (
              <img
                src={previewDoc.url}
                alt={previewDoc.doc.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : isPDF(previewDoc.doc.file_type) ? (
              <div className="w-full flex flex-col items-center gap-3 pb-8">
                <PDFDocument
                  file={previewDoc.url}
                  onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                  loading={<p className="text-white/70 text-sm mt-8">Cargando PDF...</p>}
                  error={<p className="text-red-400 text-sm mt-8">No se pudo cargar el PDF</p>}
                >
                  {Array.from({ length: pdfNumPages }, (_, i) => (
                    <div key={i + 1} className="flex flex-col items-center gap-1">
                      {pdfNumPages > 1 && (
                        <p className="text-white/40 text-xs">{i + 1} / {pdfNumPages}</p>
                      )}
                      <PDFPage
                        pageNumber={i + 1}
                        width={pdfWidth}
                        className="rounded-lg overflow-hidden shadow-2xl"
                        renderAnnotationLayer
                        renderTextLayer
                      />
                    </div>
                  ))}
                </PDFDocument>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit document name dialog */}
      <Dialog open={!!editingDoc} onClose={() => setEditingDoc(null)} title="Editar documento">
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={editingDocName}
            onChange={e => setEditingDocName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveDocName()}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingDoc(null)}>Cancelar</Button>
            <Button onClick={saveDocName} disabled={!editingDocName.trim()}>Guardar</Button>
          </div>
        </div>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)} title="Subir documento">
        <div className="flex flex-col gap-4">
          <Input label="Nombre del documento" placeholder="Ej: DNI de Ana" value={newDoc.name} onChange={e => setNewDoc(d => ({ ...d, name: e.target.value }))} />
          <Textarea label="Descripción (opcional)" placeholder="Notas adicionales..." value={newDoc.description} onChange={e => setNewDoc(d => ({ ...d, description: e.target.value }))} rows={2} />
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-2">Archivo</label>
            <div
              className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--primary)] transition"
              onClick={() => fileRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <File size={18} className="text-[var(--primary)]" />
                  <span className="text-sm text-[var(--foreground)]">{selectedFile.name}</span>
                  <button onClick={e => { e.stopPropagation(); setSelectedFile(null) }}>
                    <X size={14} className="text-[var(--muted-foreground)]" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-[var(--muted-foreground)] mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">Haz clic para seleccionar un archivo</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">PDF, JPG, PNG, etc.</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
          </div>
          {selectedFolder && (
            <p className="text-xs text-[var(--muted-foreground)]">Se guardará en: <strong>{selectedFolder.name}</strong></p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancelar</Button>
            <Button onClick={uploadDocument} loading={uploading} disabled={!selectedFile || !newDoc.name.trim()}>
              Subir
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
