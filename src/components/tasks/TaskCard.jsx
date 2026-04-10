import { format, isPast, isToday as isDateToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, Tag, User, Pencil, Trash2, AlertCircle } from 'lucide-react'

const PRIORITY_COLORS = {
  baja: '#8a8a8a',
  normal: '#3b82f6',
  alta: '#f59e0b',
  urgente: '#ef4444'
}

export default function TaskCard({ task, isDragging, onEdit, onDelete }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isDateToday(parseISO(task.due_date)) && task.status !== 'done'
  
  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = parseISO(dateStr)
    if (isDateToday(date)) return 'Hoy'
    return format(date, 'd MMM', { locale: es })
  }

  return (
    <div
      className={`
        group relative flex flex-col gap-3 p-4 rounded-2xl bg-surface-900 border transition-all
        ${isDragging ? 'opacity-50 ring-2 ring-primary-500 shadow-2xl' : 'hover:border-surface-700/50 shadow-md'}
        ${isOverdue ? 'border-red-500/50 bg-red-500/5' : 'border-surface-800/60'}
      `}
    >
      {/* Header: Priority & Due Date */}
      <div className="flex items-center justify-between">
        <span 
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-white shadow-sm"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal }}
        >
          {task.priority}
        </span>
        
        {task.due_date && (
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${isOverdue ? 'text-red-400' : 'text-surface-400'}`}>
            <Calendar size={12} />
            <span>{formatDate(task.due_date)}</span>
            {task.due_time && (
              <>
                <Clock size={12} className="ml-1" />
                <span>{task.due_time.substring(0, 5)}hs</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body: Title & Description */}
      <div className="space-y-1">
        <h4 className={`text-sm font-semibold leading-snug ${task.status === 'done' ? 'text-surface-500 line-through' : 'text-surface-100'}`}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-800 text-[9px] font-bold uppercase tracking-wider text-surface-400 border border-surface-700/50">
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: User & Actions */}
      <div className="flex items-center justify-between mt-1 pt-3 border-t border-surface-800/40">
        <div className="flex items-center gap-2">
          {task.assigned_to ? (
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: task.assigned_to.avatar_color }}
              title={`Asignado a ${task.assigned_to.name}`}
            >
              {task.assigned_to.name[0].toUpperCase()}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center text-surface-600">
              <User size={12} />
            </div>
          )}
          <span className="text-[10px] font-medium text-surface-500 ml-1">
            {task.assigned_to?.name || 'Sin asignar'}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1.5 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 transition-all cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isOverdue && (
        <div className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 rounded-full text-white shadow-lg pointer-events-none">
          <AlertCircle size={12} />
        </div>
      )}
    </div>
  )
}
