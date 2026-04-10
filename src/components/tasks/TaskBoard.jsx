import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { 
  format, 
  addDays, 
  isSameDay, 
  isWithinInterval, 
  parseISO, 
  isBefore, 
  startOfToday,
  startOfTomorrow,
  endOfDay
} from 'date-fns'
import TaskCard from './TaskCard'
import TaskColumn from './TaskColumn'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'

const DROP_ANIMATION = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.5' },
    },
  }),
}

export default function TaskBoard({ tasks, view, activeMemberId, onUpdateTask, onDeleteTask, onEditTask }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const today = startOfToday()
  const tomorrow = startOfTomorrow()
  const nextWeek = addDays(today, 7)

  // Define columns based on view
  const columns = useMemo(() => {
    if (view === 'day') {
      return [
        { id: 'hoy', title: 'Hoy', icon: '📅' },
        { id: 'manana', title: 'Mañana', icon: '📅' },
        { id: 'semana', title: 'Esta Semana', icon: '📅' },
        { id: 'backlog', title: 'Backlog', icon: '🗂' }
      ]
    } else {
      return [
        { id: 'todo', title: 'To Do', icon: '🔵' },
        { id: 'in_progress', title: 'En Progreso', icon: '🟡' },
        { id: 'blocked', title: 'Bloqueado', icon: '🔴' },
        { id: 'done', title: 'Hecho', icon: '✅' }
      ]
    }
  }, [view])

  // Map tasks to columns
  const columnTasks = useMemo(() => {
    const mapping = {}
    columns.forEach(col => mapping[col.id] = [])

    tasks.forEach(task => {
      let colId = 'backlog' // default
      
      if (view === 'day') {
        if (!task.due_date) {
          colId = 'backlog'
        } else {
          const d = parseISO(task.due_date)
          if (isSameDay(d, today) || isBefore(d, today)) colId = 'hoy'
          else if (isSameDay(d, tomorrow)) colId = 'manana'
          else if (isWithinInterval(d, { start: addDays(tomorrow, 1), end: nextWeek })) colId = 'semana'
          else colId = 'backlog'
        }
      } else {
        colId = task.status || 'todo'
      }

      if (mapping[colId]) mapping[colId].push(task)
    })

    // Sort by position
    Object.keys(mapping).forEach(key => {
      mapping[key].sort((a, b) => (a.position || 0) - (b.position || 0))
    })

    return mapping
  }, [tasks, view, columns, today, tomorrow, nextWeek])

  const findColumnOfTask = (taskId) => {
    for (const colId in columnTasks) {
      if (columnTasks[colId].some(t => t.id === taskId)) return colId
    }
    return null
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeColId = findColumnOfTask(active.id)
    let overColId = over.id

    // If over a task card, get its column
    if (!columns.some(col => col.id === overColId)) {
      overColId = findColumnOfTask(over.id)
    }

    if (!activeColId || !overColId || activeColId === overColId) return

    // In @dnd-kit, moving across containers is usually handled by updating state
    // But since our columns are derived from 'tasks' data (due_date or status),
    // moving a task to a different column means updating its metadata immediately.
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = active.id
    const activeColId = findColumnOfTask(active.id)
    let overColId = over.id
    let newIndex = -1

    // If dropped over another card
    if (!columns.some(col => col.id === overColId)) {
      overColId = findColumnOfTask(over.id)
      const overItems = columnTasks[overColId]
      newIndex = overItems.findIndex(t => t.id === over.id)
    }

    if (!activeColId || !overColId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const updates = {}
    let movedMessage = ''

    if (view === 'status') {
      if (task.status !== overColId) {
        updates.status = overColId
        movedMessage = `Tarea movida a ${overColId.replace('_', ' ')}`
      }
    } else {
      // view === 'day'
      if (activeColId !== overColId) {
        if (overColId === 'hoy') updates.due_date = format(today, 'yyyy-MM-dd')
        else if (overColId === 'manana') updates.due_date = format(tomorrow, 'yyyy-MM-dd')
        else if (overColId === 'semana') updates.due_date = format(addDays(today, 2), 'yyyy-MM-dd')
        else if (overColId === 'backlog') updates.due_date = null
        movedMessage = `Fecha actualizada a ${overColId}`
      }
    }

    // Always update position if moved within or between columns
    // For simplicity, we'll just update the status/date for now, position handling needs more logic
    
    if (Object.keys(updates).length > 0) {
      onUpdateTask(taskId, updates)
      
      // Trigger notification if status moved
      if (updates.status && task.assigned_to) {
        await supabase.from('notifications').insert({
          member_id: task.assigned_to.id,
          task_id: task.id,
          type: 'movida',
          message: `La tarea "${task.title}" fue movida a ${overColId.replace('_', ' ')}`
        })
      }
    }
  }

  const activeTask = tasks.find(t => t.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-full min-w-max pb-4 px-2">
        {columns.map(column => (
          <TaskColumn
            key={column.id}
            id={column.id}
            title={column.title}
            icon={column.icon}
            tasks={columnTasks[column.id]}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeTask ? (
          <TaskCard task={activeTask} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
