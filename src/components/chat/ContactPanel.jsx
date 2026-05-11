import { User, Phone, X, Bot, Tag, Plus, ExternalLink, Kanban, Users as UsersIcon, ChevronRight, ArrowRightLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Toggle from '../ui/Toggle'
import { useLabels, addLabelToContact, removeLabelFromContact, useAgents } from '../../hooks/useMessages'
import { useRef, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'

export default function ContactPanel({ contact, onClose, onToggleBot, agentId }) {
  const navigate = useNavigate()
  const { labels: allLabels } = useLabels()
  const { agents: agentsList } = useAgents()
  
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [inPipeline, setInPipeline] = useState(false)
  const [pipelineCard, setPipelineCard] = useState(null)
  const [loadingPipeline, setLoadingPipeline] = useState(false)
  
  const dropdownRef = useRef(null)
  const transferRef = useRef(null)

  const checkPipeline = async () => {
    if (!contact?.id) return
    const { data } = await supabase
      .from('pipeline_cards')
      .select('*, pipeline_stages(name)')
      .eq('contact_id', contact.id)
      .maybeSingle()
    
    setInPipeline(!!data)
    setPipelineCard(data)
  }

  useEffect(() => {
    checkPipeline()
  }, [contact?.id])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAddingLabel(false)
      }
      if (transferRef.current && !transferRef.current.contains(event.target)) {
        setIsTransferring(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-72 border-l border-surface-800/60 bg-surface-900/80 shrink-0 animate-slide-right flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/60 shrink-0">
        <h3 className="text-sm font-semibold text-surface-200">Info del contacto</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-primary-600/20">
            {(contact.name || contact.phone || '?')[0].toUpperCase()}
          </div>
          <p className="mt-3 text-base font-semibold text-surface-100 text-center px-2 line-clamp-2" title={contact.name}>
            {contact.name || 'Sin nombre'}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
            <Phone size={16} className="text-surface-500 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">Teléfono</p>
              <p className="text-sm text-surface-200">{contact.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
            <Bot size={16} className="text-surface-500 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">Estado del Bot</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${contact.bot_enabled ? 'text-emerald-400' : 'text-surface-500'}`}>
                  {contact.bot_enabled ? 'Activado' : 'Desactivado'}
                </span>
                <Toggle
                  enabled={contact.bot_enabled ?? true}
                  onChange={(val) => onToggleBot?.(contact.id, val)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Labels Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-surface-400">
              <Tag size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Etiquetas</span>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsAddingLabel(!isAddingLabel)}
                className={`
                  w-6 h-6 rounded-lg flex items-center justify-center transition-all border
                  ${isAddingLabel 
                    ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' 
                    : 'bg-surface-800 border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-700'}
                `}
              >
                <Plus size={14} className={`transition-transform duration-200 ${isAddingLabel ? 'rotate-45' : ''}`} />
              </button>

              {isAddingLabel && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-800 border border-surface-700 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {allLabels
                      .filter(l => !contact.labels?.some(cl => cl.id === l.id))
                      .map(label => (
                        <button
                          key={label.id}
                          onClick={async () => {
                            const { error } = await addLabelToContact(contact.id, label.id, agentId)
                            if (error) toast.error('Error al asignar')
                            setIsAddingLabel(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-700 text-left transition-colors group"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                          <span className="text-[11px] font-medium text-surface-300 group-hover:text-surface-100">{label.name}</span>
                        </button>
                      ))
                    }
                    {allLabels.filter(l => !contact.labels?.some(cl => cl.id === l.id)).length === 0 && (
                      <p className="p-3 text-[10px] text-surface-500 text-center italic">No hay más etiquetas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[12px]">
            {contact.labels?.map(label => (
              <div
                key={label.id}
                className="group flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <button
                  onClick={async () => {
                    const { error } = await removeLabelFromContact(contact.id, label.id, agentId)
                    if (error) toast.error('Error al quitar')
                  }}
                  className="p-0.5 rounded-full hover:bg-black/20 transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
            {(!contact.labels || contact.labels.length === 0) && (
              <p className="text-[10px] text-surface-600 italic px-1 mt-1 font-medium">Sin etiquetas asignadas</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 pt-4 border-t border-surface-800/40">
          <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold px-1">Acciones rápidas</p>
          
          <button
            onClick={() => navigate(`/contacts?search=${encodeURIComponent(contact.phone)}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800 border border-surface-700/30 hover:border-surface-600 transition-all group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <UsersIcon size={16} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-surface-200">Ver en Clientes</p>
              <p className="text-[10px] text-surface-500">Gestionar ficha completa</p>
            </div>
            <ExternalLink size={14} className="text-surface-600 group-hover:text-surface-400" />
          </button>

          {inPipeline ? (
            <button
              onClick={() => navigate('/pipeline')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/15 transition-all group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400">
                <Kanban size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary-400">En Pipeline</p>
                <p className="text-[10px] text-primary-400/60 truncate">Etapa: {pipelineCard?.pipeline_stages?.name}</p>
              </div>
              <ChevronRight size={14} className="text-primary-500/60" />
            </button>
          ) : (
            <button
              disabled={loadingPipeline}
              onClick={async () => {
                setLoadingPipeline(true)
                try {
                  const { data: stages } = await supabase
                    .from('pipeline_stages')
                    .select('id')
                    .order('position')
                    .limit(1)
                  
                  if (!stages?.length) throw new Error('No hay etapas en el pipeline')

                  const { error } = await supabase
                    .from('pipeline_cards')
                    .insert({ 
                      contact_id: contact.id, 
                      stage_id: stages[0].id,
                      notes: 'Añadido desde chat de agentes'
                    })
                  
                  if (error) throw error
                  
                  toast.success('Movido al Pipeline')
                  checkPipeline()
                  navigate('/pipeline')
                } catch (err) {
                  toast.error('Error al mover a pipeline')
                  console.error(err)
                } finally {
                  setLoadingPipeline(false)
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800 border border-surface-700/30 hover:border-surface-600 transition-all group text-left cursor-pointer disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                <Kanban size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-surface-200">Mover a Pipeline</p>
                <p className="text-[10px] text-surface-500">Crear oportunidad de venta</p>
              </div>
              {loadingPipeline ? (
                <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={14} className="text-surface-600 group-hover:text-surface-400" />
              )}
            </button>
          )}
        </div>

        {/* Transfer Agent Section */}
        <div className="space-y-3 pt-4 border-t border-surface-800/40 pb-4">
          <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold px-1">Gestión de Agente</p>
          
          <div className="relative" ref={transferRef}>
            <button
              onClick={() => setIsTransferring(!isTransferring)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800 border border-surface-700/30 hover:border-surface-600 transition-all group text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <ArrowRightLeft size={16} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-surface-200">Cambiar de Agente</p>
                <p className="text-[10px] text-surface-500">Mover chat a otra área</p>
              </div>
              <ChevronRight size={14} className={`text-surface-600 transition-transform duration-200 ${isTransferring ? 'rotate-90' : ''}`} />
            </button>

            {isTransferring && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-800 border border-surface-700 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="px-3 py-2 text-[10px] text-surface-500 font-bold uppercase tracking-wider border-b border-surface-700/50 mb-1">Área de destino</p>
                  {agentsList
                    ?.filter(a => a.id !== agentId)
                    .map(targetAgent => (
                      <button
                        key={targetAgent.id}
                        onClick={async () => {
                          if (!confirm(`¿Mover esta conversación a ${targetAgent.name}?`)) return
                          
                          try {
                            const { error: msgErr } = await supabase
                              .from('messages')
                              .update({ agent_id: targetAgent.id })
                              .eq('contact_id', contact.id)
                              .eq('agent_id', agentId)
                            
                            if (msgErr) throw msgErr

                            await supabase
                              .from('follow_ups')
                              .update({ agent_id: targetAgent.id })
                              .eq('contact_id', contact.id)
                              .eq('agent_id', agentId)

                            await supabase.from('messages').insert({
                              agent_id: targetAgent.id,
                              contact_id: contact.id,
                              direction: 'outbound',
                              content: `[SISTEMA] Conversación movida desde otro agente`,
                              is_read: true
                            })

                            toast.success(`Movido a ${targetAgent.name}`)
                            setIsTransferring(false)
                            onClose?.() 
                            window.location.reload() 
                          } catch (err) {
                            console.error(err)
                            toast.error('Error al mover')
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-primary-500/10 text-left transition-colors group"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary-500" />
                        <span className="text-xs font-medium text-surface-300 group-hover:text-primary-400">{targetAgent.name}</span>
                      </button>
                    ))
                  }
                  {agentsList?.filter(a => a.id !== agentId).length === 0 && (
                    <p className="p-3 text-[10px] text-surface-500 text-center italic">No hay otras áreas</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
