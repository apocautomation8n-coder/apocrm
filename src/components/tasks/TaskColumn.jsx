import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { SortAsc } from 'lucide-react'

export default function TaskColumn({ id, title, icon, tasks, onEditTask, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div 
      ref={setNodeRef}
      className={`
        flex flex-col w-80 h-full rounded-2xl bg-surface-900/50 border transition-all
        ${isOver ? 'border-primary-500/50 bg-primary-600/5' : 'border-surface-800/40'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-surface-800/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-bold text-surface-200 uppercase tracking-wider">{title}</h3>
          <span className="px-2 py-0.5 rounded-full bg-surface-800 text-[10px] font-bold text-surface-500 border border-surface-700/50">
            {tasks.length}
          </span>
        </div>
        
        {id === 'done' && tasks.filter(t => {
          if (!t.updated_at) return false
          const diff = new Date() - new Date(t.updated_at)
          return diff > 7 * 24 * 60 * 60 * 1000 // 7 days
        }).length > 0 && (
          <button className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase cursor-pointer">
            Limpiar
          </button>
        )}
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={onEditTask} 
              onDelete={onDeleteTask} 
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-surface-800 rounded-2xl text-[10px] font-bold text-surface-600 uppercase tracking-widest">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}
