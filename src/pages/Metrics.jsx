import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import { Send, UserCheck, MessageSquareX, RefreshCw, BarChart3, Edit2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

const agentTabs = [
  { value: 'talleres', label: 'Talleres' },
  { value: 'clinicas', label: 'Clínicas' },
  { value: 'gym', label: 'Gym' },
]

export default function Metrics() {
  const [activeAgent, setActiveAgent] = useState('talleres')
  const [isEditing, setIsEditing] = useState(false)
  const [dbAgent, setDbAgent] = useState(null)

  const [editForm, setEditForm] = useState({
    override_metrics: false,
    manual_sent: 0,
    manual_replied: 0,
    manual_followups: 0,
    manual_unanswered: 0
  })

  // 1. Fetch from Google Sheets
  const { data: sheetData, isLoading: isSheetLoading, refetch, isFetching } = useQuery({
    queryKey: ['metrics', activeAgent],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/metrics?agent=${activeAgent}`)
      if (!res.ok) throw new Error('Error fetching metrics')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Fetch overrides from Supabase
  const fetchDbMetrics = async () => {
    const { data: agentData, error } = await supabase
      .from('agents')
      .select('id, override_metrics, manual_sent, manual_replied, manual_followups, manual_unanswered')
      .eq('slug', activeAgent)
      .single()

    if (!error && agentData) {
      setDbAgent(agentData)
      setEditForm({
        override_metrics: agentData.override_metrics || false,
        manual_sent: agentData.manual_sent || 0,
        manual_replied: agentData.manual_replied || 0,
        manual_followups: agentData.manual_followups || 0,
        manual_unanswered: agentData.manual_unanswered || 0
      })
    }
  }

  useEffect(() => {
    fetchDbMetrics()
    setIsEditing(false)
  }, [activeAgent])

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
  const displaySent = isOverridden ? dbAgent.manual_sent : (sheetData?.sentCount ?? 0)
  const displayReplied = isOverridden ? dbAgent.manual_replied : ((sheetData?.sentCount ?? 0) - (sheetData?.unanswered ?? 0))
  const displayFollowups = isOverridden ? dbAgent.manual_followups : (sheetData?.followUps ?? 0)
  const displayUnanswered = isOverridden ? dbAgent.manual_unanswered : (sheetData?.unanswered ?? 0)

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
              <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
                <RefreshCw size={14} />
                Actualizar Google Sheet
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
      <Tabs tabs={agentTabs} activeTab={activeAgent} onChange={setActiveAgent} className="max-w-md" />

      {/* KPI Cards */}
      {isSheetLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-surface-800/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-full">
            {isEditing && (
              <label className="flex items-center gap-2 bg-surface-800/60 p-3 rounded-xl border border-surface-700/50 cursor-pointer w-max mb-2">
                <input type="checkbox" checked={editForm.override_metrics} onChange={e => setEditForm(f => ({...f, override_metrics: e.target.checked}))} className="rounded text-primary-500 bg-surface-900 border-surface-700" />
                <span className="text-sm text-surface-200">Sobreescribir automáticamente los datos de Google Sheets para este agente</span>
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
               <span className="text-sm font-medium text-surface-400">Respondidos</span>
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

          <div className={`p-4 rounded-2xl border ${isEditing ? 'border-accent-500/50 bg-surface-800/60' : 'bg-surface-900/60 border-surface-800/60'}`}>
             <div className="flex items-center justify-between mb-3">
               <span className="text-sm font-medium text-surface-400">Seguimientos</span>
               <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-500/10">
                 <RefreshCw size={16} className="text-accent-400" />
               </div>
             </div>
             {isEditing ? (
               <input type="number" disabled={!editForm.override_metrics} value={editForm.manual_followups} onChange={e => setEditForm({ ...editForm, manual_followups: parseInt(e.target.value) || 0 })} className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-3 py-1 text-2xl font-bold text-surface-100 disabled:opacity-50" />
             ) : (
               <div className="text-3xl font-bold text-surface-100">{displayFollowups}</div>
             )}
          </div>

          <div className={`p-4 rounded-2xl border ${isEditing ? 'border-warning-500/50 bg-surface-800/60' : 'bg-surface-900/60 border-surface-800/60'}`}>
             <div className="flex items-center justify-between mb-3">
               <span className="text-sm font-medium text-surface-400">No Respondidos</span>
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

      {/* Data table */}
      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-surface-800/60 flex items-center gap-2">
          <BarChart3 size={18} className="text-surface-400" />
          <h2 className="text-base font-semibold text-surface-200">Detalle del Sheet</h2>
        </div>

        {isSheetLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : sheetData?.rows && sheetData.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60">
                  {sheetData.headers?.map((header, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-surface-300 whitespace-nowrap">
                        {cell || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-surface-500">
            No hay datos disponibles para este agente en Googe Sheets.
          </div>
        )}
      </div>
    </div>
  )
}
