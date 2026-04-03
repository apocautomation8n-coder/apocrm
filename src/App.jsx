import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import OutboundAgents from './pages/OutboundAgents'
import Metrics from './pages/Metrics'
import Contacts from './pages/Contacts'
import Pipeline from './pages/Pipeline'
import Calendar from './pages/Calendar'
import Finance from './pages/Finance'
import Plans from './pages/Plans'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

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

  return <Layout>{children}</Layout>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user && !loading ? <Navigate to="/agents" replace /> : <Login />}
      />
      <Route path="/agents" element={<ProtectedRoute><OutboundAgents /></ProtectedRoute>} />
      <Route path="/metrics" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/agents" replace />} />
    </Routes>
  )
}
