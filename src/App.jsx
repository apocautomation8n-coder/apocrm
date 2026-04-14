import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import OutboundAgents from './pages/OutboundAgents'
import Metrics from './pages/Metrics'
import Contacts from './pages/Contacts'
import Pipeline from './pages/Pipeline'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Finance from './pages/Finance'
import Plans from './pages/Plans'
import Users from './pages/Users'
import FollowUps from './pages/FollowUps'
import CurrencyConverter from './pages/CurrencyConverter'
import Invoices from './pages/Invoices'
import InvoiceForm from './pages/InvoiceForm'
import { useLocation } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-surface-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Permission check
  const isAllowed = user.allowed_views?.includes(location.pathname)
  if (!isAllowed && user.allowed_views?.length > 0) {
    // Redirect to the first allowed view if the current one is not allowed
    return <Navigate to={user.allowed_views[0]} replace />
  }

  return <Layout>{children}</Layout>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user && !loading ? <Navigate to={user.allowed_views?.[0] || "/agents"} replace /> : <Login />}
      />
      <Route path="/agents" element={<ProtectedRoute><OutboundAgents /></ProtectedRoute>} />
      <Route path="/metrics" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
      <Route path="/followups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} />
      <Route path="/converter" element={<ProtectedRoute><CurrencyConverter /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/new" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user?.allowed_views?.[0] || "/agents"} replace />} />
    </Routes>
  )
}
