import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Users, 
  Clock, 
  Send, 
  XCircle, 
  CheckCircle2, 
  History,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, followed_up, responded, canceled

  const fetchFollowUps = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('follow_ups')
      .select(`
        *,
        contacts (name, phone),
        agents (name, slug)
      `)
      .eq('status', filter)
      .order('scheduled_at', { ascending: filter === 'pending' })
    
    if (error) {
      toast.error('Error cargando seguimientos')
    } else {
      setFollowUps(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFollowUps()
  }, [filter])

  const handleManualTrigger = async (fu) => {
    if (!confirm('¿Quieres disparar el seguimiento ahora mismo?')) return
    
    try {
      const response = await fetch('https://automation8n.fluxia.site/webhook/f6cc20e3-267d-4e80-af86-da9bfe0d3608', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fu.contacts?.phone,
          name: fu.contacts?.name,
          agent_slug: fu.agents?.slug,
          follow_up_id: fu.id,
          manual: true
        })
      })

      if (response.ok) {
        await supabase
          .from('follow_ups')
          .update({ status: 'followed_up', updated_at: new Date().toISOString() })
          .eq('id', fu.id)
        
        toast.success('Seguimiento enviado correctamente')
        fetchFollowUps()
      } else {
        throw new Error('Fallback hook failed')
      }
    } catch (err) {
      toast.error('Error al disparar seguimiento')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar este seguimiento?')) return
    const { error } = await supabase
      .from('follow_ups')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (!error) {
      toast.success('Seguimiento cancelado')
      fetchFollowUps()
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="text-amber-400" size={18} />
      case 'followed_up': return <Send className="text-primary-400" size={18} />
      case 'responded': return <CheckCircle2 className="text-emerald-400" size={18} />
      case 'canceled': return <XCircle className="text-surface-500" size={18} />
      default: return null
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente (Esperando 23h)'
      case 'followed_up': return 'Seguimiento Enviado'
      case 'responded': return 'Respondido (Cancelado)'
      case 'canceled': return 'Cancelado Manual'
      default: return status
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <History size={24} className="text-primary-400" />
            Seguimientos Automáticos
          </h1>
          <p className="text-sm text-surface-400 mt-1">Gestión de prospectos que no han respondido tras el primer contacto</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchFollowUps}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </Button>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 bg-surface-900/50 p-1 rounded-xl w-max border border-surface-800/60">
        {[
          { id: 'pending', label: 'Pendientes' },
          { id: 'followed_up', label: 'Enviados' },
          { id: 'responded', label: 'Han Respondido' },
          { id: 'canceled', label: 'Cancelados' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`
              px-4 py-2 text-xs font-semibold rounded-lg transition-all
              ${filter === t.id 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : (followUps || []).length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <AlertCircle size={40} className="text-surface-700" />
            <p className="text-surface-500">No hay seguimientos en esta categoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Prospecto</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Agente</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Programado para</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map(fu => (
                  <tr key={fu.id} className="border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-primary-400 border border-primary-500/20">
                          <Users size={14} />
                        </div>
                        <div>
                          <p className="text-surface-200 font-medium">{fu.contacts?.name || 'Sin nombre'}</p>
                          <p className="text-[10px] text-surface-500 font-mono">{fu.contacts?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 rounded-lg bg-surface-800 text-surface-400 text-[10px] font-bold uppercase tracking-wider border border-surface-700/50">
                        {fu.agents?.name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(fu.status)}
                        <span className="text-xs text-surface-300">{getStatusLabel(fu.status)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-surface-300">
                          {new Date(fu.scheduled_at).toLocaleDateString()} {new Date(fu.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-primary-400/70 font-medium">
                          {fu.status === 'pending' ? `En ${formatDistanceToNow(new Date(fu.scheduled_at), { locale: es })}` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {fu.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleManualTrigger(fu)}
                              className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer"
                              title="Enviar seguimiento ahora"
                            >
                              <Send size={15} />
                            </button>
                            <button
                              onClick={() => handleCancel(fu.id)}
                              className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Cancelar seguimiento"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-primary-500/5 border border-primary-500/10 flex items-start gap-3">
        <AlertCircle className="text-primary-400 shrink-0 mt-0.5" size={18} />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary-300">¿Cómo funcionan los seguimientos?</p>
          <p className="text-[11px] text-surface-400 leading-relaxed">
            Cuando envías el mensaje de invitación inicial, el sistema agenda automáticamente un seguimiento para las 23 horas posteriores. 
            Si el cliente responde en cualquier momento antes de ese plazo, el seguimiento se marca como <b>"Respondido"</b> y no se dispara. 
            Si se cumple el plazo sin respuesta, el sistema llama al webhook de n8n para enviar el recordatorio.
          </p>
        </div>
      </div>
    </div>
  )
}
