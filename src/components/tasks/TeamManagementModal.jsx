import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import { useTeamMembers } from '../../hooks/useTasks'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  '#7a9e82', '#6b7db3', '#b36b7d', '#b3a36b', 
  '#7d6bb3', '#6bb3a3', '#b38a6b', '#8a8a8a',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444'
]

export default function TeamManagementModal({ isOpen, onClose }) {
  const { members, addMember, updateMember, deleteMember, loading } = useTeamMembers()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    const { error } = await addMember(name.trim(), color)
    if (!error) {
      toast.success('Miembro añadido')
      resetForm()
    }
  }

  const handleUpdate = async (id) => {
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    const { error } = await updateMember(id, { name: name.trim(), avatar_color: color })
    if (!error) {
      toast.success('Miembro actualizado')
      resetForm()
    }
  }

  const handleDelete = async (id, mName) => {
    if (confirm(`¿Eliminar a ${mName}? Se quitará de todas las tareas.`)) {
      const { error } = await deleteMember(id)
      if (!error) toast.success('Miembro eliminado')
    }
  }

  const startEdit = (member) => {
    setEditingId(member.id)
    setName(member.name)
    setColor(member.avatar_color)
    setIsAdding(true)
  }

  const resetForm = () => {
    setName('')
    setColor(AVATAR_COLORS[0])
    setIsAdding(false)
    setEditingId(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Equipo">
      <div className="space-y-6">
        {/* Add/Edit Form */}
        {isAdding ? (
          <div className="p-4 rounded-2xl bg-surface-950/40 border border-surface-800/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider">
              {editingId ? 'Editar Miembro' : 'Nuevo Miembro'}
            </h4>
            <Input 
              label="Nombre" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="ej: María Pérez"
              autoFocus
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-300">Color de Perfil</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
              <Button size="sm" onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}>
                {editingId ? 'Guardar Cambios' : 'Crear Miembro'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Añadir Miembro
          </Button>
        )}

        {/* Members List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-surface-500 uppercase tracking-widest px-1">Miembros Actuales</h4>
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 border border-surface-700/20 group hover:border-surface-600/40 transition-all">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg"
                    style={{ backgroundColor: member.avatar_color }}
                  >
                    {member.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-100">{member.name}</p>
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider">ID: {member.id.substring(0, 8)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(member)}
                    className="p-2 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => handleDelete(member.id, member.name)}
                    className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {members.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-sm text-surface-600 italic">No hay miembros en el equipo todavía</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
