import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/agents': 'Agentes Outbound',
  '/metrics': 'Métricas',
  '/contacts': 'Contactos',
  '/pipeline': 'Pipeline',
  '/calendar': 'Calendario',
  '/tasks': 'Tareas',
  '/followups': 'Seguimientos',
  '/finance': 'Finanzas',
  '/plans': 'Mensualidades',
  '/converter': 'Conversión de Capital',
  '/users': 'Usuarios'
}

export default function Layout({ children }) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'CRM'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <header className="h-16 border-b border-surface-800/60 bg-surface-900/30 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-sm font-bold text-surface-400 uppercase tracking-[0.2em]">{title}</h2>
          <NotificationBell />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-surface-950/50">
          {children}
        </main>
      </div>
    </div>
  )
}
