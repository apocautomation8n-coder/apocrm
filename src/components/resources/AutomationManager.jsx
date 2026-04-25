import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, Zap, AlertCircle, Loader2, Kanban } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import toast from 'react-hot-toast'

export default function AutomationManager() {
  const [rules, setRules] = useState([])
  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newRule, setNewRule] = useState({ keyword: '', label_id: '' })

  const fetchData = async () => {
    setLoading(true)
    const [rulesRes, labelsRes] = await Promise.all([
      supabase.from('automation_rules').select('*, labels(name, color)').order('created_at'),
      supabase.from('labels').select('*').order('name')
    ])

    if (rulesRes.error) {
      // If table doesn't exist yet, we show a friendly message
      if (rulesRes.error.code === 'PGRST116' || rulesRes.error.message.includes('relation "automation_rules" does not exist')) {
        setRules([])
      } else {
        toast.error('Error cargando reglas')
      }
    } else {
      setRules(rulesRes.data || [])
    }

    if (labelsRes.error) {
      toast.error('Error cargando etiquetas')
    } else {
      setLabels(labelsRes.data || [])
      if (labelsRes.data?.length > 0) {
        setNewRule(prev => ({ ...prev, label_id: labelsRes.data[0].id }))
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddRule = async () => {
    if (!newRule.keyword.trim() || !newRule.label_id) {
      return toast.error('Completa todos los campos')
    }

    setAdding(true)
    const { error } = await supabase
      .from('automation_rules')
      .insert({
        keyword: newRule.keyword.trim().toLowerCase(),
        label_id: newRule.label_id
      })

    if (error) {
      toast.error('Error al crear la regla')
    } else {
      toast.success('Regla creada correctamente')
      setNewRule({ ...newRule, keyword: '' })
      fetchData()
    }
    setAdding(false)
  }

  const handleDeleteRule = async (id) => {
    if (!confirm('¿Eliminar esta regla de automatización?')) return

    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Regla eliminada')
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface-900/60 border border-surface-800/60 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-4">
          <Zap size={20} className="text-amber-400" />
          Nueva Regla de Automatización
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label="Si el mensaje contiene..."
            placeholder="ej: reunión, agendar, info..."
            value={newRule.keyword}
            onChange={e => setNewRule({ ...newRule, keyword: e.target.value })}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-300">Aplicar Etiqueta</label>
            <select
              value={newRule.label_id}
              onChange={e => setNewRule({ ...newRule, label_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
            >
              {labels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleAddRule} loading={adding} className="w-full">
            <Plus size={18} />
            Agregar Regla
          </Button>
        </div>
        <p className="text-[11px] text-surface-500 mt-3 flex items-center gap-1">
          <AlertCircle size={12} />
          Las reglas no distinguen entre mayúsculas y minúsculas.
        </p>
      </div>

      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-800/60 bg-surface-900/40">
          <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Reglas del Sistema (Automáticas)</h4>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-surface-800/40">
            <tr className="hover:bg-surface-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-surface-200 font-medium italic">Respuesta a Plantilla Inicial</span>
                  <span className="text-[11px] text-surface-500">Si el cliente responde después de enviar "¿cómo estás? ¿Tenés un minuto?"</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-surface-200 font-medium">Plantilla respondida</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-[10px] font-bold text-primary-500/60 uppercase">Sistema</span>
              </td>
            </tr>
            <tr className="hover:bg-surface-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-surface-200 font-medium italic">Intención de Reunión</span>
                  <span className="text-[11px] text-surface-500">Si el mensaje contiene "reunion" o "agendar"</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-surface-200 font-medium">Reunion Agendada</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-[10px] font-bold text-primary-500/60 uppercase">Sistema</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-800/60 bg-surface-900/40">
          <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Reglas de Pipeline (Auto-Flow)</h4>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-surface-800/40">
            <tr className="hover:bg-surface-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-surface-200 font-medium italic">Creación Automática: Nuevo Lead</span>
                  <span className="text-[11px] text-surface-500">Si el contacto responde más de 4 mensajes</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Kanban size={14} className="text-primary-400" />
                  <span className="text-surface-200 font-medium">Mover a: Nuevo Lead</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-[10px] font-bold text-primary-500/60 uppercase">Sistema</span>
              </td>
            </tr>
            <tr className="hover:bg-surface-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-surface-200 font-medium italic">Interés Detectado</span>
                  <span className="text-[11px] text-surface-500">Si menciona "interesa", "precio", "contame más"...</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Kanban size={14} className="text-warning-400" />
                  <span className="text-surface-200 font-medium">Mover a: Interesado</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-[10px] font-bold text-primary-500/60 uppercase">Sistema</span>
              </td>
            </tr>
            <tr className="hover:bg-surface-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-surface-200 font-medium italic">Cita / Visita Agendada</span>
                  <span className="text-[11px] text-surface-500">Si se confirma una reunión o visita</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Kanban size={14} className="text-violet-400" />
                  <span className="text-surface-200 font-medium">Mover a: Discovery Agendada</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-[10px] font-bold text-primary-500/60 uppercase">Sistema</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-800/60 bg-surface-900/40">
          <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Tus Reglas Personalizadas</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800/60 bg-surface-900/40">
              <th className="px-6 py-4 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Palabra Clave</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Acción (Etiqueta)</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/40">
            {rules.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-surface-500 italic">
                  No hay reglas personalizadas configuradas aún.
                </td>
              </tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-primary-400 bg-primary-500/10 px-2 py-1 rounded-md">
                      {rule.keyword}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: rule.labels?.color }} 
                      />
                      <span className="text-surface-200 font-medium">{rule.labels?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
