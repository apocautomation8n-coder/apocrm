import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

export function useTasks(memberId = 'all') {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    
    // Fetch tasks with their assignees via join table
    let query = supabase
      .from('tasks')
      .select('*, assignees:task_assignees(member:team_members(id, name, avatar_color))')
    
    const { data, error } = await query.order('position', { ascending: true })
    
    if (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Error cargando tareas')
    } else {
      // Flatten the join structure and filter by member if needed
      let formattedTasks = (data || []).map(task => ({
        ...task,
        assigned_members: task.assignees?.map(a => a.member).filter(Boolean) || []
      }))

      if (memberId && memberId !== 'all') {
        formattedTasks = formattedTasks.filter(t => 
          t.assigned_members.some(m => m.id === memberId)
        )
      }
      
      setTasks(formattedTasks)
    }
    setLoading(false)
  }, [memberId])

  useEffect(() => {
    fetchTasks()
    
    // Realtime subscription for tasks AND their assignments
    const taskChannel = supabase
      .channel('tasks-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => fetchTasks())
      .subscribe()

    return () => { supabase.removeChannel(taskChannel) }
  }, [fetchTasks])

  const addTask = async (taskData) => {
    const { assigned_to_ids, ...rest } = taskData
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(rest)
      .select()
      .single()
    
    if (taskError) {
      toast.error('Error creando tarea')
      return { error: taskError }
    }

    // Add multiple assignees
    if (assigned_to_ids && assigned_to_ids.length > 0) {
      const assignments = assigned_to_ids.map(mid => ({ task_id: task.id, member_id: mid }))
      await supabase.from('task_assignees').insert(assignments)
      
      // Notify all
      for (const mid of assigned_to_ids) {
        await supabase.from('notifications').insert({
          member_id: mid,
          task_id: task.id,
          type: 'asignada',
          message: `Te asignaron la tarea "${task.title}"`
        })
      }
    }

    return { data: task }
  }

  const updateTask = async (taskId, updates) => {
    const { assigned_to_ids, ...rest } = updates
    
    // 1. Update task basic info
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      toast.error('Error actualizando tarea')
      return { error }
    }

    // 2. Sync assignees if provided
    if (assigned_to_ids !== undefined) {
      // Simplest way: delete all and re-insert
      await supabase.from('task_assignees').delete().eq('task_id', taskId)
      
      if (assigned_to_ids.length > 0) {
        const assignments = assigned_to_ids.map(mid => ({ task_id: taskId, member_id: mid }))
        await supabase.from('task_assignees').insert(assignments)
      }
    }

    return { data: task }
  }

  const deleteTask = async (taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      toast.error('Error eliminando tarea')
      return { error }
    }
    return { success: true }
  }

  return { tasks, loading, refetch: fetchTasks, addTask, updateTask, deleteTask }
}

export function useTeamMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name')
    if (error) {
      console.error('Error fetching members:', error)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const addMember = async (name, color) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ name, avatar_color: color })
      .select()
      .single()
    if (!error) setMembers(prev => [...prev, data])
    return { data, error }
  }

  const updateMember = async (id, updates) => {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) setMembers(prev => prev.map(m => m.id === id ? data : m))
    return { data, error }
  }

  const deleteMember = async (id) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (!error) setMembers(prev => prev.filter(m => m.id !== id))
    return { error }
  }

  return { members, loading, refetch: fetchMembers, addMember, updateMember, deleteMember }
}

export function useNotifications(memberId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!memberId || memberId === 'all') {
      setNotifications([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching notifications:', error)
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }, [memberId])

  useEffect(() => {
    fetchNotifications()

    if (!memberId || memberId === 'all') return

    const channel = supabase
      .channel(`notifs-${memberId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `member_id=eq.${memberId}`
       }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        toast('Nueva notificación 🔔', { icon: '🔔' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications, memberId])

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    if (!memberId || memberId === 'all') return
    await supabase.from('notifications').update({ is_read: true }).eq('member_id', memberId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return { notifications, loading, markAsRead, markAllAsRead }
}
