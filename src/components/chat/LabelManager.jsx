import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Plus, Trash2, X, Tag } from 'lucide-react'
import { useLabels } from '../../hooks/useMessages'

const PRESET_COLORS = [
  '#7a9e82', // Original accent
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
]

export default function LabelManager({ isOpen, onClose }) {
  const { labels, addLabel, deleteLabel, loading } = useLabels()
  const [newName, setNewName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await addLabel(newName.trim(), selectedColor)
    setNewName('')
  }

  const handleDelete = async (id) => {
    if (confirm('¿Borrar esta etiqueta? Se quitará de todos los contactos.')) {
      await deleteLabel(id)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Etiquetas">
      <div className="space-y-6">
        {/* Create new */}
        <div className="space-y-4 p-4 rounded-2xl bg-surface-800/40 border border-surface-700/30">
          <div className="flex items-center gap-2 text-primary-400 mb-2">
            <Plus size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Nueva Etiqueta</span>
          </div>
          
          <Input
            placeholder="Nombre de la etiqueta..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <div className="space-y-2">
            <p className="text-[10px] text-surface-500 font-medium uppercase tracking-wider ml-1">Color</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`
                    w-8 h-8 rounded-lg transition-all border-2
                    ${selectedColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button 
            fullWidth 
            onClick={handleCreate} 
            disabled={!newName.trim()}
          >
            Crear etiqueta
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-surface-400 mb-2 ml-1">
            <Tag size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Etiquetas existentes</span>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
          ) : labels.length === 0 ? (
            <p className="text-center py-6 text-sm text-surface-500">No hay etiquetas creadas.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {labels.map(label => (
                <div 
                  key={label.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-800/60 border border-surface-700/20 group hover:border-surface-600/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: label.color }} 
                    />
                    <span className="text-sm font-medium text-surface-200">{label.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(label.id)}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}
