import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, User, Mail, Save, X, Pencil, Check } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { supabase } from '../lib/supabaseClient'

const VIEW_LABELS = {
  '/agents': 'Agentes Outbound',
  '/metrics': 'Métricas',
  '/contacts': 'Contactos',
  '/pipeline': 'Pipeline',
  '/tasks': 'Tareas',
  '/calendar': 'Calendario',
  '/followups': 'Seguimientos',
  '/finance': 'Finanzas',
  '/invoices': 'Facturas',
  '/plans': 'Mensualidades',
  '/converter': 'Conversión de Capital',
  '/security': 'Seguridad',
  '/users': 'Usuarios'
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    allowed_views: ['/agents', '/contacts']
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error creating user')
      }
      setIsModalOpen(false)
      setNewUser({ email: '', password: '', full_name: '', allowed_views: ['/agents', '/contacts'] })
      fetchUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleView = (userId, viewPath) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const newViews = user.allowed_views.includes(viewPath)
      ? user.allowed_views.filter(v => v !== viewPath)
      : [...user.allowed_views, viewPath]
    
    updateUserViews(userId, newViews)
  }

  const updateUserViews = async (id, allowed_views) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ allowed_views, updated_at: new Date() })
        .eq('id', id)
      
      if (error) throw error
      setUsers(users.map(u => u.id === id ? { ...u, allowed_views } : u))
    } catch (err) {
      console.error('Error updating views:', err)
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id))
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Error deleting user')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateName = async (id) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editName, updated_at: new Date() })
        .eq('id', id)
      
      if (error) throw error
      setUsers(users.map(u => u.id === id ? { ...u, full_name: editName } : u))
      setEditingId(null)
    } catch (err) {
      console.error('Error updating name:', err)
      alert('Error al actualizar nombre')
    }
  }

  const toggleNewUserView = (viewPath) => {
    setNewUser(prev => ({
      ...prev,
      allowed_views: prev.allowed_views.includes(viewPath)
        ? prev.allowed_views.filter(v => v !== viewPath)
        : [...prev.allowed_views, viewPath]
    }))
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Gestión de Usuarios</h1>
          <p className="text-surface-400 text-sm">Administra los accesos y permisos de tu equipo</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Usuario
        </Button>
      </div>

      <Card className="overflow-hidden border-surface-800/60 bg-surface-900/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800/40 border-b border-surface-800/60">
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Vistas Permitidas</th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-surface-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Cargando usuarios...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-surface-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-800/20 transition-colors">
                   <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400">
                        <User size={20} />
                      </div>
                      <div>
                        {editingId === user.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-surface-800 border border-surface-700 rounded text-sm text-surface-100 outline-none focus:ring-1 focus:ring-primary-500"
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(user.id)}
                              autoFocus
                            />
                            <button onClick={() => handleUpdateName(user.id)} className="text-emerald-400 hover:text-emerald-300">
                              <Check size={16} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="font-medium text-surface-100">{user.full_name || 'Sin nombre'}</div>
                        )}
                        <div className="text-sm text-surface-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {Object.entries(VIEW_LABELS).map(([path, label]) => {
                        const isAllowed = user.allowed_views?.includes(path)
                        return (
                          <button
                            key={path}
                            onClick={() => toggleView(user.id, path)}
                            className={`
                              px-2 py-1 text-[10px] font-medium rounded-md transition-all
                              ${isAllowed 
                                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' 
                                : 'bg-surface-800 text-surface-500 border border-surface-700/50 hover:border-surface-600'
                              }
                            `}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingId(user.id); setEditName(user.full_name || ''); }}
                        className="p-2 text-surface-400 hover:text-primary-400 transition-colors rounded-lg hover:bg-primary-500/10"
                        title="Editar nombre"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-surface-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <form onSubmit={handleCreateUser} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Nombre Completo"
              placeholder="Ej: Juan Pérez"
              value={newUser.full_name}
              onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
              required
              icon={User}
            />
            <Input
              label="Email"
              type="email"
              placeholder="juan@empresa.com"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
              icon={Mail}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
              icon={Shield}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-300">Vistas Permitidas</label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-surface-950/50 rounded-xl border border-surface-800/60 text-xs">
              {Object.entries(VIEW_LABELS).map(([path, label]) => (
                <label key={path} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={newUser.allowed_views.includes(path)}
                    onChange={() => toggleNewUserView(path)}
                    className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-primary-500 focus:ring-primary-500/20 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <span className="text-surface-400 group-hover:text-surface-200 transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              type="button"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
