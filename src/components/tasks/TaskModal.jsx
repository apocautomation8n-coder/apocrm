import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Tag, X, Plus } from 'lucide-react'
import { useTeamMembers } from '../../hooks/useTasks'

const PRIORITIES = [
  { id: 'baja', label: 'Baja', color: '#8a8a8a' },
  { id: 'normal', label: 'Normal', color: '#3b82f6' },
  { id: 'alta', label: 'Alta', color: '#f59e0b' },
  { id: 'urgente', label: 'Urgente', color: '#ef4444' }
]

const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'En Progreso' },
  { id: 'blocked', label: 'Bloqueado' },
  { id: 'done', label: 'Hecho' }
]

export default function TaskModal({ isOpen, onClose, onSave, task = null }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState('todo')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState('')
  
  const { members } = useTeamMembers()

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setAssignedTo(task.assigned_to?.id || '')
      setPriority(task.priority || 'normal')
      setStatus(task.status || 'todo')
      setDueDate(task.due_date || '')
      setDueTime(task.due_time || '')
      setTags(task.tags || [])
    } else {
      setTitle('')
      setDescription('')
      setAssignedTo('')
      setPriority('normal')
      setStatus('todo')
      setDueDate('')
      setDueTime('')
      setTags([])
    }
  }, [task, isOpen])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    
    onSave({
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo || null,
      priority,
      status,
      due_date: dueDate || null,
      due_time: dueTime || null,
      tags
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Editar Tarea' : 'Nueva Tarea'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título *"
          placeholder="ej: Llamar a cliente X"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all min-h-[100px] resize-none"
            placeholder="Detalles sobre la tarea..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Asignado a</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
            >
              <option value="">Sin asignar</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Prioridad</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
            >
              {PRIORITIES.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Fecha límite</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Hora</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
          >
            {STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-surface-300">Etiquetas</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva etiqueta..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1 px-4 py-2 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all text-sm"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 rounded-xl bg-surface-800 border border-surface-700/30 text-surface-400 hover:text-primary-400 hover:border-primary-500/40 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[24px]">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-600/10 text-primary-400 text-[10px] font-bold uppercase tracking-wider border border-primary-500/20">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit">Guardar Tarea</Button>
        </div>
      </form>
    </Modal>
  )
}
