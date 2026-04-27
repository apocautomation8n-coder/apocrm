import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import {
  MessageSquare,
  Users,
  Kanban,
  CalendarDays,
  DollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ShieldCheck,
  FolderOpen,
  Bell
} from 'lucide-react'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/agents',    icon: MessageSquare, label: 'Agentes', badgeKey: 'unread' },
  { to: '/contacts',  icon: Users,         label: 'Contactos' },
  { to: '/pipeline',  icon: Kanban,        label: 'Pipeline' },
  { to: '/tasks',     icon: CheckSquare,   label: 'Tareas', badgeKey: 'tasks' },
  { to: '/calendar',  icon: CalendarDays,  label: 'Calendario' },
  { to: '/finance',   icon: DollarSign,    label: 'Finanzas' },
  { to: '/resources', icon: FolderOpen,    label: 'Recursos' },
  { to: '/security',  icon: ShieldCheck,   label: 'Seguridad' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [tasksCount, setTasksCount] = useState(0)
  const { signOut, user } = useAuth()
  const location = useLocation()

  // Filter items based on user permissions
  const filteredItems = navItems.filter(item => 
    user?.allowed_views?.includes(item.to)
  )

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .eq('is_read', false)
      setUnreadCount(count || 0)
    }
    fetchUnread()

    const fetchTasksCount = async () => {
      // For the sidebar badge, we could count ALL tasks due today, 
      // but usually users want to see THEIR tasks. 
      // For now, let's count all pending tasks due today/overdue.
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lte('due_date', today)
        .neq('status', 'done')
      setTasksCount(count || 0)
    }
    fetchTasksCount()

    const msgChannel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnread()
      })
      .subscribe()

    const taskChannel = supabase
      .channel('tasks-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasksCount()
      })
      .subscribe()

    const handleUnreadUpdate = () => fetchUnread()
    window.addEventListener('unread-updated', handleUnreadUpdate)

    return () => { 
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(taskChannel)
      window.removeEventListener('unread-updated', handleUnreadUpdate)
    }
  }, [])

  return (
    <aside
      className={`
        relative flex flex-col h-screen z-50
        bg-surface-950/95 backdrop-blur-xl border-r border-surface-800/50 shadow-2xl
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0
        ${collapsed ? 'w-[80px]' : 'w-[280px]'}
      `}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-surface-800/40 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-900 shadow-inner border border-surface-800/60 shrink-0 overflow-hidden relative group">
          <div className="absolute inset-0 bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors" />
          <img src="/Logo_apoc_new.png" alt="Apoc Logo" className="w-6 h-6 object-contain relative z-10" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in flex flex-col justify-center">
            <h1 className="text-[17px] font-bold text-surface-50 tracking-tight leading-tight">APOC</h1>
            <p className="text-[10px] text-primary-400/90 font-bold tracking-[0.2em] leading-none uppercase">AUTOMATION</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <NotificationBell isSidebar={true} collapsed={collapsed} />
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-3 py-3 rounded-xl
              transition-all duration-200 group relative
              ${isActive
                ? 'bg-gradient-to-r from-primary-500/15 to-transparent text-primary-400 shadow-[inset_2px_0_0_0_theme(colors.primary.500)]'
                : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/40'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-surface-300'}`} 
                />
                {!collapsed && (
                  <span className={`text-[14px] truncate animate-fade-in ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
                
                {/* Badges */}
                {item.badgeKey === 'unread' && unreadCount > 0 && (
                  <span className={`
                    ${collapsed ? 'absolute top-1 right-1.5' : 'ml-auto'}
                    flex items-center justify-center min-w-[20px] h-5
                    px-1.5 text-[10px] font-bold rounded-full
                    bg-red-500/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]
                    animate-pulse-slow
                  `}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {item.badgeKey === 'tasks' && tasksCount > 0 && (
                  <span className={`
                    ${collapsed ? 'absolute top-1 right-1.5' : 'ml-auto'}
                    flex items-center justify-center min-w-[20px] h-5
                    px-1.5 text-[10px] font-bold rounded-full
                    bg-amber-500/90 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]
                  `}>
                    {tasksCount > 99 ? '99+' : tasksCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-surface-800/50 bg-surface-900/30">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-semibold text-surface-100 truncate">
                {user?.full_name || 'Usuario Apoc'}
              </p>
              <p className="text-xs text-surface-400 truncate">
                {user?.email || 'admin@apoc.com'}
              </p>
            </div>
          )}

          <button
            onClick={signOut}
            title="Cerrar sesión"
            className={`
              flex items-center justify-center rounded-xl text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200
              ${collapsed ? 'absolute inset-0 w-full h-full opacity-0 hover:opacity-100 bg-surface-950/80 backdrop-blur-sm z-10' : 'w-9 h-9'}
            `}
          >
            <LogOut size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-24 w-7 h-7 rounded-full bg-surface-900 border border-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 hover:border-surface-600 hover:scale-110 shadow-lg transition-all cursor-pointer z-50 group"
      >
        {collapsed ? (
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        ) : (
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        )}
      </button>
    </aside>
  )
}
