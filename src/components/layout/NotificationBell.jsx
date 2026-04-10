import { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, BellOff } from 'lucide-react'
import { useNotifications, useTeamMembers } from '../../hooks/useTasks'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NotificationBell({ collapsed }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  // For this demo/impl, we use a "current member" from localStorage or default to first one
  const [currentMemberId, setCurrentMemberId] = useState(localStorage.getItem('task_member_id') || 'all')
  const { notifications, markAsRead, markAllAsRead, loading } = useNotifications(currentMemberId)
  const { members } = useTeamMembers()
  
  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    localStorage.setItem('task_member_id', currentMemberId)
  }, [currentMemberId])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        {/* Member Selector (simplified for now) */}
        {!collapsed && (
          <select 
            value={currentMemberId}
            onChange={(e) => setCurrentMemberId(e.target.value)}
            className="flex-1 min-w-0 bg-surface-800/40 border border-surface-700/30 text-surface-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all cursor-pointer truncate"
          >
            <option value="all">Todos</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}

        {/* Bell Button */}
        <button
          disabled={currentMemberId === 'all' && !collapsed}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            relative p-2 rounded-xl transition-all cursor-pointer shrink-0
            ${isOpen ? 'bg-primary-600/20 text-primary-400' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'}
            ${currentMemberId === 'all' && !collapsed ? 'opacity-30 grayscale cursor-not-allowed' : ''}
          `}
          title={currentMemberId === 'all' && !collapsed ? 'Selecciona un perfil para ver notificaciones' : 'Notificaciones'}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-surface-950">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className={`
          absolute z-[100] mt-2 w-80 max-h-[480px] bg-surface-900 border border-surface-800 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150
          ${collapsed ? 'left-full bottom-0 ml-4 mb-0' : 'bottom-full mb-2 left-0'}
        `}>
          {/* Header */}
          <div className="p-4 border-b border-surface-800/60 bg-surface-900/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <Bell size={16} className="text-primary-400" />
              Notificaciones
              {unreadCount > 0 && <span className="text-[10px] bg-primary-600/20 text-primary-400 px-1.5 py-0.5 rounded-full">{unreadCount} nuevas</span>}
            </h3>
            <button
              onClick={markAllAsRead}
              className="text-[10px] font-bold uppercase tracking-wider text-primary-400 hover:text-primary-300 transition-colors"
            >
              Marcar todo leído
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-surface-800/40 custom-scrollbar">
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-surface-800/50 flex items-center justify-center mx-auto text-surface-600">
                  <BellOff size={24} />
                </div>
                <p className="text-sm text-surface-500">No tienes notificaciones aún</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`
                    p-4 cursor-pointer transition-all hover:bg-surface-800/40 group relative
                    ${!notif.is_read ? 'bg-primary-600/5' : ''}
                  `}
                >
                  {!notif.is_read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500" />
                  )}
                  <div className="flex flex-col gap-1 ml-1">
                    <p className={`text-sm leading-snug ${!notif.is_read ? 'text-surface-100 font-medium' : 'text-surface-400'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-surface-500">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  {!notif.is_read && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check size={14} className="text-primary-400" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-surface-800/60 bg-surface-900/50 text-center">
            <button className="text-[10px] font-bold uppercase tracking-wider text-surface-500 hover:text-surface-300 transition-colors">
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
