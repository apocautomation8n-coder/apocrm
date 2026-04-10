import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

export function useTasks(memberId = 'all') {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('tasks').select('*, assigned_to(id, name, avatar_color)')
    
    if (memberId && memberId !== 'all') {
      query = query.eq('assigned_to', memberId)
    }

    const { data, error } = await query.order('position', { ascending: true })
    
    if (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Error cargando tareas')
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }, [memberId])

  useEffect(() => {
    fetchTasks()
    
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks])

  const addTask = async (taskData) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select('*, assigned_to(id, name, avatar_color)')
      .single()
    
    if (error) {
      toast.error('Error creando tarea')
      return { error }
    }

    // Trigger notification if assigned
    if (taskData.assigned_to) {
      await supabase.from('notifications').insert({
        member_id: taskData.assigned_to,
        task_id: data.id,
        type: 'asignada',
        message: `Te asignaron la tarea "${data.title}"`
      })
    }

    return { data }
  }

  const updateTask = async (taskId, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      toast.error('Error actualizando tarea')
      return { error }
    }
    return { data }
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

  return { members, loading, addMember }
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
