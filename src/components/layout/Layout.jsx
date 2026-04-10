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
  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-surface-950/50">
          {children}
        </main>
      </div>
    </div>
  )
}
