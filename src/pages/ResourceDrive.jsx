import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Folder, File, FileText, Image as ImageIcon, Plus, Trash2, ChevronRight, Upload, X, Save, ArrowLeft, Download, FileArchive, ExternalLink } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'

export default function ResourceDrive() {
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [path, setPath] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showNote, setShowNote] = useState(false)
  
  // Forms state
  const [folderName, setFolderName] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // Viewer state
  const [viewingFile, setViewingFile] = useState(null)
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchContent(currentFolderId)
    buildPath(currentFolderId)
  }, [currentFolderId])

  const fetchContent = async (folderId) => {
    setLoading(true)
    
    // Fetch folders
    let foldersQuery = supabase.from('resource_folders').select('*').order('name')
    if (folderId) foldersQuery = foldersQuery.eq('parent_id', folderId)
    else foldersQuery = foldersQuery.is('parent_id', null)
    
    const { data: fData, error: fErr } = await foldersQuery
    if (!fErr) setFolders(fData || [])

    // Fetch files
    let filesQuery = supabase.from('resource_files').select('*').order('created_at', { ascending: false })
    if (folderId) filesQuery = filesQuery.eq('folder_id', folderId)
    else filesQuery = filesQuery.is('folder_id', null)
    
    const { data: fiData, error: fiErr } = await filesQuery
    if (!fiErr) setFiles(fiData || [])

    setLoading(false)
  }

  const buildPath = async (folderId) => {
    if (!folderId) {
      setPath([])
      return
    }
    
    // Simplistic approach: fetch all folders to build tree, or recursive query
    // Since it's a small app, fetching all folders is fine
    const { data } = await supabase.from('resource_folders').select('id, name, parent_id')
    if (!data) return
    
    const newPath = []
    let curr = data.find(f => f.id === folderId)
    while (curr) {
      newPath.unshift(curr)
      curr = data.find(f => f.id === curr.parent_id)
    }
    setPath(newPath)
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    if (!folderName.trim()) return
    
    const { error } = await supabase
      .from('resource_folders')
      .insert({ name: folderName.trim(), parent_id: currentFolderId })
      
    if (error) {
      toast.error('Error creando carpeta')
    } else {
      toast.success('Carpeta creada')
      setFolderName('')
      setShowNewFolder(false)
      fetchContent(currentFolderId)
    }
  }

  const handleCreateNote = async (e) => {
    e.preventDefault()
    if (!noteTitle.trim()) return
    setIsUploading(true)
    
    const { error } = await supabase
      .from('resource_files')
      .insert({ 
        name: noteTitle.trim(), 
        type: 'note',
        content: noteContent,
        folder_id: currentFolderId 
      })
      
    if (error) {
      toast.error('Error guardando nota')
    } else {
      toast.success('Nota guardada')
      setNoteTitle('')
      setNoteContent('')
      setShowNote(false)
      fetchContent(currentFolderId)
    }
    setIsUploading(false)
  }

  const handleUploadFile = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    setIsUploading(true)
    
    const fileExt = selectedFile.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(fileName, selectedFile)
      
    if (uploadError) {
      toast.error('Error subiendo archivo. ¿Está creado el bucket "resources"?')
      setIsUploading(false)
      return
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(fileName)
      
    let type = 'document'
    if (selectedFile.type.startsWith('image/')) type = 'image'
    
    const { error: dbError } = await supabase
      .from('resource_files')
      .insert({
        name: selectedFile.name,
        type,
        url: publicUrl,
        size: selectedFile.size,
        folder_id: currentFolderId
      })
      
    if (dbError) {
      toast.error('Error guardando registro del archivo')
    } else {
      toast.success('Archivo subido')
      setSelectedFile(null)
      setShowUpload(false)
      fetchContent(currentFolderId)
    }
    setIsUploading(false)
  }

  const handleDeleteFolder = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('¿Seguro que deseas eliminar esta carpeta y todo su contenido?')) return
    await supabase.from('resource_folders').delete().eq('id', id)
    fetchContent(currentFolderId)
  }

  const handleDeleteFile = async (file, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`¿Seguro que deseas eliminar ${file.name}?`)) return
    
    if (file.url) {
      // Extract filename from URL
      const fileName = file.url.split('/').pop()
      await supabase.storage.from('resources').remove([fileName])
    }
    
    await supabase.from('resource_files').delete().eq('id', file.id)
    if (viewingFile?.id === file.id) setViewingFile(null)
    fetchContent(currentFolderId)
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type) => {
    switch(type) {
      case 'image': return <ImageIcon size={24} className="text-emerald-400" />
      case 'note': return <FileText size={24} className="text-amber-400" />
      default: return <FileArchive size={24} className="text-blue-400" />
    }
  }

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto space-y-6 animate-fade-in relative">
      {/* Toolbar & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`p-2 rounded-lg hover:bg-surface-800 transition-colors ${!currentFolderId ? 'text-primary-400 font-bold bg-primary-500/10' : 'text-surface-300'}`}
          >
            Inicio
          </button>
          
          {path.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2 shrink-0">
              <ChevronRight size={16} className="text-surface-600" />
              <button 
                onClick={() => setCurrentFolderId(folder.id)}
                className={`p-2 rounded-lg hover:bg-surface-800 transition-colors ${currentFolderId === folder.id ? 'text-primary-400 font-bold bg-primary-500/10' : 'text-surface-300'}`}
                title={folder.name}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setShowNewFolder(true)} className="flex items-center gap-2">
            <Folder size={16} /> Nueva Carpeta
          </Button>
          <Button variant="secondary" onClick={() => setShowNote(true)} className="flex items-center gap-2">
            <FileText size={16} /> Nueva Nota
          </Button>
          <Button variant="primary" onClick={() => setShowUpload(true)} className="flex items-center gap-2">
            <Upload size={16} /> Subir Archivo
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="text-center py-20 bg-surface-900/50 rounded-2xl border border-surface-800/60">
            <Folder size={48} className="mx-auto text-surface-600 mb-4" />
            <h3 className="text-lg font-medium text-surface-200">Carpeta vacía</h3>
            <p className="text-surface-400 mt-1">Crea una nueva carpeta, nota o sube un archivo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Folders */}
            {folders.map(folder => (
              <Card 
                key={folder.id} 
                className="p-4 flex items-center justify-between cursor-pointer hover:border-primary-500/50 hover:bg-surface-800/50 transition-colors group"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="flex items-center gap-3 overflow-visible relative group/tip min-w-0">
                  <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400 shrink-0">
                    <Folder size={20} />
                  </div>
                  <span className="font-medium text-surface-100 truncate min-w-0 flex-1">{folder.name}</span>
                  
                  {/* Instant Tooltip */}
                  <div className="absolute left-0 bottom-full mb-2 w-max max-w-[300px] bg-surface-950 text-white text-[11px] px-3 py-1.5 rounded-lg border border-surface-700 opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all duration-100 z-50 shadow-2xl whitespace-normal break-words">
                    {folder.name}
                  </div>
                </div>
                <button 
                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                  className="text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            ))}
            
            {/* Files */}
            {files.map(file => (
              <Card 
                key={file.id} 
                className="p-4 flex items-start justify-between cursor-pointer hover:border-surface-600 hover:bg-surface-800/50 transition-colors group relative overflow-hidden"
                onClick={() => setViewingFile(file)}
              >
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-surface-800 rounded-lg shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                    <button 
                      onClick={(e) => handleDeleteFile(file, e)}
                      className="text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 relative z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="relative group/tip overflow-visible min-w-0">
                    <h4 className="font-medium text-surface-100 truncate text-sm flex-1 min-w-0">{file.name}</h4>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {file.type === 'note' ? 'Nota' : formatSize(file.size)}
                    </p>
                    
                    {/* Instant Tooltip */}
                    <div className="absolute left-0 bottom-full mb-2 w-max max-w-[300px] bg-surface-950 text-white text-[11px] px-3 py-1.5 rounded-lg border border-surface-700 opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-all duration-100 z-50 shadow-2xl whitespace-normal break-words">
                      {file.name}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nueva Carpeta">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Nombre de la carpeta"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            placeholder="Ej: Documentos Legales"
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowNewFolder(false)} type="button">Cancelar</Button>
            <Button type="submit">Crear</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNote} onClose={() => setShowNote(false)} title="Nueva Nota">
        <form onSubmit={handleCreateNote} className="space-y-4">
          <Input
            label="Título de la nota"
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
            placeholder="Ej: Ideas de campaña"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-300">Contenido</label>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none h-48"
              placeholder="Escribe aquí tu nota..."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowNote(false)} type="button" disabled={isUploading}>Cancelar</Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Subir Archivo">
        <form onSubmit={handleUploadFile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-300">Seleccionar archivo</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => setSelectedFile(e.target.files[0])}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2 text-surface-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20 cursor-pointer"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowUpload(false)} type="button" disabled={isUploading}>Cancelar</Button>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? 'Subiendo...' : 'Subir'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* File Viewer Modal */}
      <Modal isOpen={!!viewingFile} onClose={() => setViewingFile(null)} title={viewingFile?.name} size="lg">
        {viewingFile && (
          <div className="space-y-4">
            {viewingFile.type === 'image' && (
              <div className="bg-surface-900 rounded-lg p-2 flex justify-center items-center overflow-hidden">
                <img src={viewingFile.url} alt={viewingFile.name} className="max-h-[60vh] object-contain rounded" />
              </div>
            )}
            
            {viewingFile.type === 'note' && (
              <div className="bg-surface-900 border border-surface-700 rounded-lg p-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-surface-200">
                {viewingFile.content || 'Nota vacía.'}
              </div>
            )}
            
            {viewingFile.type === 'document' && (
              <div className="bg-surface-900 border border-surface-700 rounded-lg p-12 flex flex-col items-center justify-center text-center gap-4">
                <FileArchive size={64} className="text-surface-500" />
                <div>
                  <h4 className="text-lg font-medium text-surface-200">{viewingFile.name}</h4>
                  <p className="text-surface-400 text-sm mt-1">{formatSize(viewingFile.size)}</p>
                </div>
                <a href={viewingFile.url} target="_blank" rel="noopener noreferrer">
                  <Button className="mt-2 flex items-center gap-2">
                    <Download size={16} /> Descargar Archivo
                  </Button>
                </a>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-surface-800">
              <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 flex items-center gap-2" onClick={() => handleDeleteFile(viewingFile)}>
                <Trash2 size={16} /> Eliminar
              </Button>
              
              <div className="flex gap-2">
                {viewingFile.url && viewingFile.type !== 'document' && (
                  <a href={viewingFile.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className="flex items-center gap-2">
                      <ExternalLink size={16} /> Abrir Original
                    </Button>
                  </a>
                )}
                <Button variant="primary" onClick={() => setViewingFile(null)}>Cerrar</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
