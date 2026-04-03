import { useDraggable } from '@dnd-kit/core'
import { Phone, StickyNote } from 'lucide-react'

export default function KanbanCard({ card, onClick, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id,
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        p-3 rounded-xl bg-surface-800/70 border border-surface-700/40
        hover:border-surface-600/60 hover:bg-surface-800
        transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-60 rotate-2 shadow-2xl scale-105' : 'shadow-sm'}
      `}
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 text-xs font-semibold shrink-0">
          {(card.contacts?.name || card.contacts?.phone || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-surface-200 truncate">
            {card.contacts?.name || 'Sin nombre'}
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-surface-500">
            <Phone size={10} />
            <span className="text-xs truncate">{card.contacts?.phone}</span>
          </div>
        </div>
      </div>
      {card.notes && (
        <div className="mt-2 flex items-start gap-1.5 text-surface-400">
          <StickyNote size={11} className="mt-0.5 shrink-0" />
          <p className="text-xs line-clamp-2">{card.notes}</p>
        </div>
      )}
    </div>
  )
}
