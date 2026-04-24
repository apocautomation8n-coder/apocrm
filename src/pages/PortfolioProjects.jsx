import { useState, useEffect } from 'react'
import { Plus, Link as LinkIcon, ExternalLink, Copy, Check, Trash2, KeyRound, User, Image as ImageIcon, Eye, EyeOff, Edit2, MoreVertical } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function PortfolioProjects({ hideHeader = false }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    image_url: '',
    demo_username: '',
    demo_password: ''
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching projects:', error)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsUploading(true)

    let finalImageUrl = formData.image_url

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('portfolio_images')
        .upload(filePath, imageFile)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        alert('Error al subir la imagen. Asegúrate de haber creado el bucket "portfolio_images" y configurado los permisos.')
        setIsUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio_images')
        .getPublicUrl(filePath)

      finalImageUrl = publicUrl
    }

    const projectData = { ...formData, image_url: finalImageUrl }

    if (editingId) {
      // Update existing project
      const { data, error } = await supabase
        .from('portfolio_projects')
        .update(projectData)
        .eq('id', editingId)
        .select()

      if (!error && data) {
        setProjects(projects.map(p => p.id === editingId ? data[0] : p))
        closeModal()
      } else if (error) {
        console.error('Error updating project:', error)
        alert('Error al actualizar el proyecto')
      }
    } else {
      // Create new project
      const { data, error } = await supabase
        .from('portfolio_projects')
        .insert([projectData])
        .select()

      if (!error && data) {
        setProjects([data[0], ...projects])
        closeModal()
      } else if (error) {
        console.error('Error saving project:', error)
        alert('Error al guardar el proyecto')
      }
    }
    
    setIsUploading(false)
  }

  const openEditModal = (project) => {
    setEditingId(project.id)
    setFormData({
      name: project.name || '',
      description: project.description || '',
      url: project.url || '',
      image_url: project.image_url || '',
      demo_username: project.demo_username || '',
      demo_password: project.demo_password || ''
    })
    setImageFile(null)
    setIsModalOpen(true)
    setMenuOpenId(null)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({
      name: '', description: '', url: '', image_url: '', demo_username: '', demo_password: ''
    })
    setImageFile(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este proyecto?')) return
    
    const { error } = await supabase.from('portfolio_projects').delete().eq('id', id)
    if (!error) {
      setProjects(projects.filter(p => p.id !== id))
    }
  }

  const handleCopy = (text, fieldId) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className={`${hideHeader ? '' : 'p-8'} max-w-7xl mx-auto space-y-6`}>
      {!hideHeader && (
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Portafolio de Proyectos</h1>
          <p className="text-surface-400 mt-1">Proyectos reales y accesos para mostrar a clientes.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="flex items-center gap-2">
          <Plus size={18} />
          Nuevo Proyecto
        </Button>
      </div>
      )}
      
      {hideHeader && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="flex items-center gap-2">
            <Plus size={18} />
            Nuevo Proyecto
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-surface-900/50 rounded-2xl border border-surface-800/60">
          <ImageIcon size={48} className="mx-auto text-surface-500 mb-4" />
          <h3 className="text-lg font-medium text-surface-200">No hay proyectos todavía</h3>
          <p className="text-surface-400 mt-1 mb-6">Agrega tu primer proyecto para mostrar a los clientes.</p>
          <Button onClick={() => setIsModalOpen(true)}>Agregar Proyecto</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Card key={project.id} className="overflow-hidden flex flex-col group border-surface-800/60 hover:border-surface-700 transition-colors">
              {/* Image Header */}
              <div className="h-48 bg-surface-900/50 p-2 relative overflow-hidden flex items-center justify-center">
                {project.image_url ? (
                  <img 
                    src={project.image_url} 
                    alt={project.name} 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 rounded-lg"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400/1e1e2e/6b7280?text=Error+Cargando+Imagen' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-800/50">
                    <ImageIcon size={40} className="text-surface-600" />
                  </div>
                )}
                
                {project.url && (
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute top-3 right-3 bg-surface-900/80 backdrop-blur-sm p-2 rounded-lg text-surface-300 hover:text-primary-400 hover:bg-surface-800 transition-colors"
                    title="Visitar proyecto"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col relative">
                <div className="flex justify-between items-start mb-2 pr-6">
                  <h3 className="text-lg font-bold text-surface-100 line-clamp-1" title={project.name}>{project.name}</h3>
                </div>

                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                    className="text-surface-500 hover:text-surface-200 p-1 rounded-md hover:bg-surface-800 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {menuOpenId === project.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 mt-1 w-36 bg-surface-800 border border-surface-700 rounded-lg shadow-lg z-20 overflow-hidden">
                        <button 
                          onClick={() => openEditModal(project)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-primary-400 transition-colors"
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button 
                          onClick={() => { handleDelete(project.id); setMenuOpenId(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <p className="text-sm text-surface-400 line-clamp-2 mb-4 flex-1">
                  {project.description || 'Sin descripción'}
                </p>

                {/* Credentials */}
                {(project.demo_username || project.demo_password) && (
                  <div className="space-y-2 mt-auto pt-4 border-t border-surface-800/60">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Accesos al Sistema</p>
                    
                    {project.demo_username && (
                      <div className="flex items-center justify-between bg-surface-800/50 rounded-lg p-2 px-3 border border-surface-700/50">
                        <div className="flex items-center gap-2 text-sm text-surface-300 overflow-hidden">
                          <User size={14} className="text-surface-500 shrink-0" />
                          <span className="truncate">{project.demo_username}</span>
                        </div>
                        <button 
                          onClick={() => handleCopy(project.demo_username, `${project.id}-user`)}
                          className="text-surface-500 hover:text-primary-400 shrink-0 ml-2"
                        >
                          {copiedField === `${project.id}-user` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                    
                    {project.demo_password && (
                      <div className="flex items-center justify-between bg-surface-800/50 rounded-lg p-2 px-3 border border-surface-700/50">
                        <div className="flex items-center gap-2 text-sm text-surface-300 overflow-hidden">
                          <KeyRound size={14} className="text-surface-500 shrink-0" />
                          <span className="truncate">
                            {visiblePasswords.has(project.id) 
                              ? project.demo_password 
                              : '•'.repeat(Math.min(project.demo_password.length, 12))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => {
                              const newSet = new Set(visiblePasswords)
                              if (newSet.has(project.id)) newSet.delete(project.id)
                              else newSet.add(project.id)
                              setVisiblePasswords(newSet)
                            }}
                            className="text-surface-500 hover:text-primary-400 p-1"
                            title={visiblePasswords.has(project.id) ? "Ocultar contraseña" : "Ver contraseña"}
                          >
                            {visiblePasswords.has(project.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button 
                            onClick={() => handleCopy(project.demo_password, `${project.id}-pass`)}
                            className="text-surface-500 hover:text-primary-400 p-1"
                            title="Copiar contraseña"
                          >
                            {copiedField === `${project.id}-pass` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Editar Proyecto" : "Agregar Proyecto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Proyecto *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: E-commerce Zapatería"
          />
          
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              Descripción
            </label>
            <textarea
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 resize-none h-24"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descripción de las funcionalidades..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="URL del Proyecto"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
            />
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                Imagen del Proyecto
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-1.5 text-surface-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20 cursor-pointer"
              />
              <p className="text-xs text-surface-500 mt-1">Sube una imagen para mostrar en la tarjeta</p>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-800">
            <h4 className="text-sm font-medium text-surface-300 mb-3">Accesos (Opcional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Usuario"
                value={formData.demo_username}
                onChange={(e) => setFormData({ ...formData, demo_username: e.target.value })}
                placeholder="admin@proyecto.com"
              />
              <Input
                label="Contraseña"
                value={formData.demo_password}
                onChange={(e) => setFormData({ ...formData, demo_password: e.target.value })}
                placeholder="********"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Guardando...' : 'Guardar Proyecto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
