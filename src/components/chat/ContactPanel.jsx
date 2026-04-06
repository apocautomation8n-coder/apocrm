import { User, Phone, X, Bot } from 'lucide-react'
import Toggle from '../ui/Toggle'

export default function ContactPanel({ contact, onClose, onToggleBot }) {
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
      </div>
    </div>
  )
}
