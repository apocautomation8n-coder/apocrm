import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import { Send, UserCheck, MessageSquareX, RefreshCw, BarChart3, Edit2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

// Dynamic agents will be fetched from the database

export default function Metrics() {
  const [agents, setAgents] = useState([])
  const [activeAgent, setActiveAgent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [dbAgent, setDbAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  const [crmMetrics, setCrmMetrics] = useState({
    sent: 0,
    replied: 0,
    unanswered: 0
  })

  const [editForm, setEditForm] = useState({
    override_metrics: false,
    manual_sent: 0,
    manual_replied: 0,
    manual_unanswered: 0
  })

  // 1. Fetch Agents List
  const fetchAgents = async () => {
    const { data, error } = await supabase.from('agents').select('*').order('name')
    if (!error && data) {
      setAgents(data)
      if (data.length > 0 && !activeAgent) {
        setActiveAgent(data[0].slug)
      }
    }
  }

  // 2. Fetch CRM Metrics
  const fetchCrmMetrics = async (agentSlug) => {
    if (!agentSlug) return
    setLoading(true)
    try {
      const agent = agents.find(a => a.slug === agentSlug)
      if (!agent) return

      // Responded (contacts with inbound messages)
      const { data: repliedData } = await supabase
        .from('messages')
        .select('contact_id')
        .eq('agent_id', agent.id)
        .eq('direction', 'inbound')
      
      const repliedSet = new Set(repliedData?.map(m => m.contact_id) || [])
      const repliedCount = repliedSet.size

      // All contacts messaged (outbound)
      const { data: messagedData } = await supabase
        .from('messages')
        .select('contact_id')
        .eq('agent_id', agent.id)
        .eq('direction', 'outbound')
      
      const messagedSet = new Set(messagedData?.map(m => m.contact_id) || [])
      
      // Unanswered = Messaged contacts who NEVER replied to this agent
      // We calculate this as: contacts in messagedSet that ARE NOT in repliedSet
      let unansweredCount = 0
      messagedSet.forEach(cid => {
        if (!repliedSet.has(cid)) unansweredCount++
      })

      setCrmMetrics({
        sent: messagedSet.size || 0,
        replied: repliedCount || 0,
        unanswered: unansweredCount || 0
      })

    } catch (err) {
      console.error(err)
      toast.error('Error al calcular métricas del CRM')
    } finally {
      setLoading(false)
    }
  }

  // 3. Fetch overrides from Supabase
  const fetchDbMetrics = async () => {
    if (!activeAgent) return
    const { data: agentData, error } = await supabase
      .from('agents')
      .select('id, override_metrics, manual_sent, manual_replied, manual_unanswered')
      .eq('slug', activeAgent)
      .single()

    if (!error && agentData) {
      setDbAgent(agentData)
      setEditForm({
        override_metrics: agentData.override_metrics || false,
        manual_sent: agentData.manual_sent || 0,
        manual_replied: agentData.manual_replied || 0,
        manual_unanswered: agentData.manual_unanswered || 0
      })
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    if (activeAgent) {
      fetchDbMetrics()
      fetchCrmMetrics(activeAgent)
      setIsEditing(false)
    }
  }, [activeAgent, agents])

  const handleSave = async () => {
    if (!dbAgent?.id) return
    const { error } = await supabase
      .from('agents')
      .update(editForm)
      .eq('id', dbAgent.id)

    if (error) {
      toast.error('Error al guardar métricas')
    } else {
      toast.success('Métricas actualizadas')
      setDbAgent({ ...dbAgent, ...editForm })
      setIsEditing(false)
    }
  }

  // Display computation
  const isOverridden = dbAgent?.override_metrics
  const displaySent = isOverridden ? dbAgent.manual_sent : crmMetrics.sent
  const displayReplied = isOverridden ? dbAgent.manual_replied : crmMetrics.replied
  const displayUnanswered = isOverridden ? dbAgent.manual_unanswered : crmMetrics.unanswered

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Métricas</h1>
          <p className="text-sm text-surface-400 mt-1">Estadísticas de prospección por agente</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
               <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                <X size={14} />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save size={14} />
                Guardar
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => fetchCrmMetrics(activeAgent)} loading={loading}>
                <RefreshCw size={14} />
                Refrescar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 size={14} />
                Forzar Métricas (Override)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Agent selector */}
      <Tabs 
        tabs={agents.map(a => ({ value: a.slug, label: a.name }))} 
        activeTab={activeAgent} 
        onChange={setActiveAgent} 
        className="max-w-md" 
      />

      {/* KPI Cards */}
      {loading && !isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-surface-800/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-full">
            {isEditing && (
              <label className="flex items-center gap-2 bg-surface-800/60 p-3 rounded-xl border border-surface-700/50 cursor-pointer w-max mb-2">
                <input type="checkbox" checked={editForm.override_metrics} onChange={e => setEditForm(f => ({...f, override_metrics: e.target.checked}))} className="rounded text-primary-500 bg-surface-900 border-surface-700" />
                <span className="text-sm text-surface-200">Sobreescribir automáticamente los datos del CRM para este agente</span>
              </label>
            )}
            {isOverridden && !isEditing && (
              <div className="text-xs font-semibold text-warning-400 bg-warning-500/10 px-3 py-1 rounded-full w-max mb-3 border border-warning-500/20">
                Aviso: Estás visualizando métricas forzadas manualmente (Override activado)
              </div>
            )}
          </div>
          
          <div className={`p-4 rounded-2xl border ${isEditing ? 'border-primary-500/50 bg-surface-800/60' : 'bg-surface-900/60 border-surface-800/60'}`}>
             <div className="flex items-center justify-between mb-3">
               <span className="text-sm font-medium text-surface-400">Mensajes Enviados</span>
               <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-500/10">
                 <Send size={16} className="text-primary-400" />
               </div>
             </div>
             {isEditing ? (
               <input type="number" disabled={!editForm.override_metrics} value={editForm.manual_sent} onChange={e => setEditForm({ ...editForm, manual_sent: parseInt(e.target.value) || 0 })} className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-1 text-2xl font-bold text-surface-100 disabled:opacity-50" />
             ) : (
               <div className="text-3xl font-bold text-surface-100">{displaySent}</div>
             )}
          </div>
          
          <div className={`p-4 rounded-2xl border ${isEditing ? 'border-success-500/50 bg-surface-800/60' : 'bg-surface-900/60 border-surface-800/60'}`}>
             <div className="flex items-center justify-between mb-3">
               <span className="text-sm font-medium text-surface-400">Respondieron</span>
               <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                 <UserCheck size={16} className="text-emerald-400" />
               </div>
             </div>
             {isEditing ? (
               <input type="number" disabled={!editForm.override_metrics} value={editForm.manual_replied} onChange={e => setEditForm({ ...editForm, manual_replied: parseInt(e.target.value) || 0 })} className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-1 text-2xl font-bold text-surface-100 disabled:opacity-50" />
             ) : (
               <div className="text-3xl font-bold text-surface-100">{displayReplied}</div>
             )}
          </div>

          <div className={`p-4 rounded-2xl border ${isEditing ? 'border-warning-500/50 bg-surface-800/60' : 'bg-surface-900/60 border-surface-800/60'}`}>
             <div className="flex items-center justify-between mb-3">
               <span className="text-sm font-medium text-surface-400">No Respondieron</span>
               <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
                 <MessageSquareX size={16} className="text-amber-400" />
               </div>
             </div>
             {isEditing ? (
               <input type="number" disabled={!editForm.override_metrics} value={editForm.manual_unanswered} onChange={e => setEditForm({ ...editForm, manual_unanswered: parseInt(e.target.value) || 0 })} className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-1 text-2xl font-bold text-surface-100 disabled:opacity-50" />
             ) : (
               <div className="text-3xl font-bold text-surface-100">{displayUnanswered}</div>
             )}
          </div>
        </div>
      )}

      {/* Data table placeholder - User wants to focus on cards now */}
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
        <BarChart3 size={48} className="text-surface-600" />
        <div>
          <h3 className="text-surface-300 font-medium">Métricas configuradas vía CRM</h3>
          <p className="text-xs text-surface-500">Los datos se extraen en tiempo real de las conversaciones activas</p>
        </div>
      </div>
    </div>
  )
}
