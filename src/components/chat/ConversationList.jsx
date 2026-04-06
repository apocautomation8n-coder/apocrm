import { Trash2, Plus } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ConversationList({ 
  conversations, 
  selectedContactId, 
  onSelect, 
  onDelete, 
  onAdd,
  loading 
}) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return 'Ayer'
    return format(date, 'dd/MM', { locale: es })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-800/50 flex items-center justify-center text-surface-600">
          <Plus size={24} />
        </div>
        <div>
          <p className="text-surface-400 text-sm font-medium">No hay conversaciones aún</p>
          <p className="text-surface-600 text-xs mt-1">Hacé clic abajo para iniciar una</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-all text-sm font-medium cursor-pointer"
        >
          <Plus size={16} />
          Nueva conversación
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <div key={conv.contact?.id} className="relative group">
          <button
            onClick={() => onSelect(conv.contact)}
            className={`
              w-full flex items-center gap-3 px-4 py-3.5
              border-b border-surface-800/40 cursor-pointer
              transition-all duration-150 text-left
              ${selectedContactId === conv.contact?.id
                ? 'bg-primary-600/10 border-l-2 border-l-primary-500'
                : 'hover:bg-surface-800/40 border-l-2 border-l-transparent'
              }
            `}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {(conv.contact?.name || conv.contact?.phone || '?')[0].toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-surface-100 truncate">
                  {conv.contact?.name || conv.contact?.phone}
                </p>
                <span className="text-[11px] text-surface-500 ml-2 shrink-0">
                  {formatTime(conv.lastTimestamp)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-surface-400 truncate">
                  {conv.lastDirection === 'outbound' && (
                    <span className="text-surface-500">Tú: </span>
                  )}
                  {conv.lastMessage}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 shrink-0 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full bg-primary-500 text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
          
          {/* Delete button (visible on hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(conv.contact?.id)
            }}
            className="absolute right-2 top-8 p-2 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
            title="Borrar conversación"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
