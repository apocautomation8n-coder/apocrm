import KanbanBoard from '../components/kanban/KanbanBoard'
import { Kanban } from 'lucide-react'

export default function Pipeline() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-800/60 shrink-0">
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
          <Kanban size={24} className="text-primary-400" />
          Pipeline
        </h1>
        <p className="text-sm text-surface-400 mt-1">Gestión de leads con tablero Kanban</p>
      </div>

      {/* Board */}
      <div className="flex-1 p-4 overflow-x-auto overflow-y-hidden">
        <KanbanBoard />
      </div>
    </div>
  )
}
