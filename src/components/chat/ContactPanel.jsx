import { User, Phone, X, Bot, Tag, Plus } from 'lucide-react'
import Toggle from '../ui/Toggle'
import { useLabels, addLabelToContact, removeLabelFromContact } from '../../hooks/useMessages'
import { useRef, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function ContactPanel({ contact, onClose, onToggleBot }) {
  const { labels: allLabels } = useLabels()
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAddingLabel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <p className="mt-3 text-base font-semibold text-surface-100 text-center px-2 line-clamp-2" title={contact.name}>
            {contact.name || 'Sin nombre'}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
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
              <Tag size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Etiquetas</span>
            </div>
            
            {/* Custom Label Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsAddingLabel(!isAddingLabel)}
                className={`
                  w-6 h-6 rounded-lg flex items-center justify-center transition-all border
                  ${isAddingLabel 
                    ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' 
                    : 'bg-surface-800 border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-700'}
                `}
              >
                <Plus size={14} className={`transition-transform duration-200 ${isAddingLabel ? 'rotate-45' : ''}`} />
              </button>

              {isAddingLabel && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-800 border border-surface-700 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {allLabels
                      .filter(l => !contact.labels?.some(cl => cl.id === l.id))
                      .map(label => (
                        <button
                          key={label.id}
                          onClick={async () => {
                            const { error } = await addLabelToContact(contact.id, label.id)
                            if (error) toast.error('Error al asignar')
                            setIsAddingLabel(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-700 text-left transition-colors group"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                          <span className="text-[11px] font-medium text-surface-300 group-hover:text-surface-100">{label.name}</span>
                        </button>
                      ))
                    }
                    {allLabels.filter(l => !contact.labels?.some(cl => cl.id === l.id)).length === 0 && (
                      <p className="p-3 text-[10px] text-surface-500 text-center italic">No hay más etiquetas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Tag Pills */}
          <div className="flex flex-wrap gap-2 min-h-[12px]">
            {contact.labels?.map(label => (
              <div
                key={label.id}
                className="group flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <button
                  onClick={async () => {
                    const { error } = await removeLabelFromContact(contact.id, label.id)
                    if (error) toast.error('Error al quitar')
                  }}
                  className="p-0.5 rounded-full hover:bg-black/20 transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
            {(!contact.labels || contact.labels.length === 0) && (
              <p className="text-[10px] text-surface-600 italic px-1 mt-1 font-medium">Sin etiquetas asignadas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
