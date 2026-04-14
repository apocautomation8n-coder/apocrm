import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import {
  MessageSquare,
  BarChart3,
  Users,
  Kanban,
  CalendarDays,
  DollarSign,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Calculator,
  History,
  CheckSquare,
  FileText,
} from 'lucide-react'

const navItems = [
  { to: '/agents',    icon: MessageSquare, label: 'Agentes Outbound', badgeKey: 'unread' },
  { to: '/metrics',   icon: BarChart3,     label: 'Métricas' },
  { to: '/contacts',  icon: Users,         label: 'Contactos' },
  { to: '/pipeline',  icon: Kanban,        label: 'Pipeline' },
  { to: '/tasks',     icon: CheckSquare,   label: 'Tareas', badgeKey: 'tasks' },
  { to: '/calendar',  icon: CalendarDays,  label: 'Calendario' },
  { to: '/finance',   icon: DollarSign,    label: 'Finanzas' },
  { to: '/invoices',  icon: FileText,      label: 'Facturas' },
  { to: '/users',     icon: Zap,           label: 'Usuarios' },
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

    return () => { 
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(taskChannel)
    }
  }, [])

  return (
    <aside
      className={`
        relative flex flex-col h-screen
        bg-surface-900/95 border-r border-surface-800/60
        transition-all duration-300 ease-out shrink-0
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-800/60">
        <div className="flex items-center justify-center w-8 shrink-0">
          <img src="/Logo_apoc_new.png" alt="Apoc Logo" className="w-full object-contain" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in -ml-1">
            <h1 className="text-base font-bold text-surface-100 tracking-tight leading-none">APOC</h1>
            <p className="text-[10px] text-primary-400 font-medium tracking-wider">AUTOMATION</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl
              transition-all duration-200 group relative
              ${isActive
                ? 'bg-primary-600/15 text-primary-400'
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary-500" />
                )}
                <item.icon size={20} className="shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium truncate animate-fade-in">
                    {item.label}
                  </span>
                )}
                {item.badgeKey === 'unread' && unreadCount > 0 && (
                  <span className={`
                    ${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
                    flex items-center justify-center min-w-[20px] h-5
                    px-1.5 text-[10px] font-bold rounded-full
                    bg-red-500 text-white
                  `}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {item.badgeKey === 'tasks' && tasksCount > 0 && (
                  <span className={`
                    ${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
                    flex items-center justify-center min-w-[20px] h-5
                    px-1.5 text-[10px] font-bold rounded-full
                    bg-amber-500 text-white
                  `}>
                    {tasksCount > 99 ? '99+' : tasksCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-surface-800/60 space-y-1">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-all cursor-pointer z-10"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
