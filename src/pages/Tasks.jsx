import { useState } from 'react'
import { Plus, Calendar, Zap, Users, Filter, ChevronRight, Settings } from 'lucide-react'
import { useTasks, useTeamMembers } from '../hooks/useTasks'
import TaskBoard from '../components/tasks/TaskBoard'
import TaskModal from '../components/tasks/TaskModal'
import TeamManagementModal from '../components/tasks/TeamManagementModal'
import Button from '../components/ui/Button'
import NotificationBell from '../components/layout/NotificationBell'

export default function Tasks() {
  const [view, setView] = useState('day') // 'day' | 'status'
  const [memberId, setMemberId] = useState(localStorage.getItem('task_member_id') || 'all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks(memberId)
  const { members } = useTeamMembers()

  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData)
    } else {
      await addTask(taskData)
    }
    setEditingTask(null)
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleNewTask = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  return (
    <div className="h-full flex flex-col min-w-0 bg-surface-950/20">
      {/* Sub-Header / Toolbar */}
      <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between gap-4 border-b border-surface-800/40 bg-surface-950/90 backdrop-blur-xl overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 shrink-0">
          {/* View Toggle */}
          <div className="flex p-1 rounded-xl bg-surface-800/40 border border-surface-700/30">
            <button
              onClick={() => setView('day')}
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                ${view === 'day' 
                  ? 'bg-primary-600/20 text-primary-400 shadow-sm shadow-primary-500/10' 
                  : 'text-surface-500 hover:text-surface-300'}
              `}
            >
              <Calendar size={14} />
              Por Día
            </button>
            <button
              onClick={() => setView('status')}
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                ${view === 'status' 
                  ? 'bg-primary-600/20 text-primary-400 shadow-sm shadow-primary-500/10' 
                  : 'text-surface-500 hover:text-surface-300'}
              `}
            >
              <Zap size={14} />
              Por Estado
            </button>
          </div>

          {/* Member Filter */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-800/40 border border-surface-700/30 text-surface-500">
              <Users size={16} />
            </div>
            <div className="flex gap-1 overflow-x-auto max-w-[400px] no-scrollbar">
              <button
                onClick={() => { setMemberId('all'); localStorage.setItem('task_member_id', 'all'); }}
                className={`
                  px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap
                  ${memberId === 'all' 
                    ? 'bg-primary-600/10 text-primary-400 border-primary-500/30' 
                    : 'bg-transparent text-surface-500 border-transparent hover:text-surface-300'}
                `}
              >
                Todos
              </button>
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMemberId(m.id); localStorage.setItem('task_member_id', m.id); }}
                  className={`
                    px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap
                    ${memberId === m.id 
                      ? 'bg-primary-600/10 text-primary-400 border-primary-500/30' 
                      : 'bg-transparent text-surface-500 border-transparent hover:text-surface-300'}
                  `}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell />
          <div className="w-[1px] h-6 bg-surface-800 mx-1" />
          <button 
            onClick={() => setIsTeamModalOpen(true)}
            className="p-2 rounded-xl bg-surface-800/60 border border-surface-700/30 text-surface-400 hover:text-primary-400 hover:border-primary-500/30 transition-all flex items-center gap-2 group"
            title="Gestionar Equipo"
          >
            <Users size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase hidden sm:inline">Equipo</span>
          </button>
          <Button onClick={handleNewTask} className="shadow-lg shadow-primary-600/20">
            <Plus size={18} className="mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-950/20 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              <p className="text-surface-500 text-sm font-medium animate-pulse">Cargando tablero...</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
            <TaskBoard
              tasks={tasks}
              view={view}
              activeMemberId={memberId}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onEditTask={handleEditTask}
            />
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        task={editingTask}
      />

      <TeamManagementModal 
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
      />
    </div>
  )
}
