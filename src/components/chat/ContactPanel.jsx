import { User, Phone, X, Bot, Tag, Plus } from 'lucide-react'
import Toggle from '../ui/Toggle'
import { useLabels, addLabelToContact, removeLabelFromContact } from '../../hooks/useMessages'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ContactPanel({ contact, onClose, onToggleBot }) {
  const { labels: allLabels } = useLabels()
  if (!contact) return null

  return (
    <div className="w-72 border-l border-surface-800/60 bg-surface-900/80 shrink-0 animate-slide-right">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/60">
        <h3 className="text-sm font-semibold text-surface-200">Info del contacto</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-primary-600/20">
            {(contact.name || contact.phone || '?')[0].toUpperCase()}
          </div>
          <p className="mt-3 text-base font-semibold text-surface-100">
            {contact.name || 'Sin nombre'}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
            <User size={16} className="text-surface-500 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">Nombre</p>
              <p className="text-sm text-surface-200">{contact.name || 'Sin nombre'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
            <Phone size={16} className="text-surface-500 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">Teléfono</p>
              <p className="text-sm text-surface-200">{contact.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
            <Bot size={16} className="text-surface-500 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">Estado del Bot</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${contact.bot_enabled ? 'text-emerald-400' : 'text-surface-500'}`}>
                  {contact.bot_enabled ? 'Activado' : 'Desactivado'}
                </span>
                <Toggle
                  enabled={contact.bot_enabled ?? true}
                  onChange={(val) => onToggleBot?.(contact.id, val)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Labels Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-surface-400">
              <Tag size={14} />
              <span className="text-xs font-bold uppercase tracking-wider text-[10px]">Etiquetas</span>
            </div>
            
            {/* Add Label Dropdown (Compact) */}
            <div className="relative group/add shrink-0">
              <select
                defaultValue=""
                onChange={async (e) => {
                  const labelId = e.target.value
                  if (!labelId) return
                  if (contact.labels?.some(l => l.id === labelId)) {
                    toast.error('Ya tiene esta etiqueta')
                    e.target.value = ""
                    return
                  }
                  const { error } = await addLabelToContact(contact.id, labelId)
                  if (error) toast.error('Error al asignar etiqueta')
                  e.target.value = ""
                }}
                className="w-8 h-8 opacity-0 absolute inset-0 cursor-pointer z-10"
              >
                <option value="" disabled>+</option>
                {allLabels
                  .filter(l => !contact.labels?.some(cl => cl.id === l.id))
                  .map(label => (
                    <option key={label.id} value={label.id}>{label.name}</option>
                  ))
                }
              </select>
              <button className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center text-surface-500 group-hover/add:text-primary-400 group-hover/add:bg-primary-400/10 transition-all border border-transparent group-hover/add:border-primary-500/30">
                <Plus size={14} />
              </button>
            </div>
          </div>
          
          {/* Current Labels */}
          <div className="flex flex-wrap gap-1.5 min-h-[12px]">
            {contact.labels?.map(label => (
              <div
                key={label.id}
                className="group flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-all"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <button
                  onClick={async () => {
                    const { error } = await removeLabelFromContact(contact.id, label.id)
                    if (error) toast.error('Error al quitar etiqueta')
                  }}
                  className="p-0.5 rounded hover:bg-black/20 transition-colors cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {(!contact.labels || contact.labels.length === 0) && (
              <p className="text-[10px] text-surface-600 italic px-1">Sin etiquetas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
