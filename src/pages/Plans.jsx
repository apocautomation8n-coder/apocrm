import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { CreditCard, Users, TrendingUp, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const statusColors = { activo: 'green', pausado: 'yellow', cancelado: 'red' }
const statusLabels = { activo: 'Activo', pausado: 'Pausado', cancelado: 'Cancelado' }
const currencies = [
  { code: 'ARS', symbol: '$', label: 'Pesos (ARS)' },
  { code: 'USD', symbol: '$', label: 'Dólares (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
]

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    client_name: '', freelancer: '', monthly_fee: '', freelancer_fee: '0', expenses: '0', status: 'activo', notes: '', currency: 'USD'
  })

  const fetchPlans = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('monthly_plans').select('*').order('created_at')
    if (error) toast.error('Error cargando mantenimientos')
    else setPlans(data)
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [])

  const totalsByCurrency = useMemo(() => {
    return currencies.map(c => {
      const active = plans.filter(p => p.status === 'activo' && (p.currency || 'USD') === c.code)
      const allInCurrency = plans.filter(p => (p.currency || 'USD') === c.code)
      
      const mrr = active.reduce((s, p) => s + Number(p.monthly_fee), 0)
      const netProfitCurrent = active.reduce((s, p) => s + (Number(p.monthly_fee) - Number(p.freelancer_fee) - Number(p.expenses)), 0)
      
      const colMonthly = allInCurrency.reduce((s, p) => s + Number(p.monthly_fee), 0)
      const colFreelancer = allInCurrency.reduce((s, p) => s + Number(p.freelancer_fee), 0)
      const colExpenses = allInCurrency.reduce((s, p) => s + Number(p.expenses), 0)
      const colNetProfit = allInCurrency.reduce((s, p) => s + (Number(p.monthly_fee) - Number(p.freelancer_fee) - Number(p.expenses)), 0)

      return {
        ...c,
        mrr,
        netProfit: netProfitCurrent,
        activeCount: active.length,
        colTotals: {
          monthly_fee: colMonthly,
          freelancer_fee: colFreelancer,
          expenses: colExpenses,
          net_profit: colNetProfit
        }
      }
    }).filter(t => t.activeCount > 0 || t.colTotals.monthly_fee > 0)
  }, [plans])

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.monthly_fee) return toast.error('Nombre y cobro mensual son obligatorios')

    const payload = {
      client_name: form.client_name,
      freelancer: form.freelancer || null,
      monthly_fee: parseFloat(form.monthly_fee),
      freelancer_fee: parseFloat(form.freelancer_fee) || 0,
      expenses: parseFloat(form.expenses) || 0,
      status: form.status,
      currency: form.currency || 'USD',
      notes: form.notes || null,
    }

    if (editing) {
      const { error } = await supabase.from('monthly_plans').update(payload).eq('id', editing.id)
      if (error) return toast.error('Error actualizando')
      toast.success('Mantenimiento actualizado')
    } else {
      const { error } = await supabase.from('monthly_plans').insert(payload)
      if (error) return toast.error('Error creando')
      toast.success('Mantenimiento creado')
    }

    closeModal()
    fetchPlans()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este mantenimiento?')) return
    await supabase.from('monthly_plans').delete().eq('id', id)
    toast.success('Mantenimiento eliminado')
    fetchPlans()
  }

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase.from('monthly_plans').update({ status }).eq('id', id)
    if (error) return toast.error('Error actualizando estado')
    setPlans(p => p.map(plan => plan.id === id ? { ...plan, status } : plan))
    toast.success(`Estado cambiado a ${statusLabels[status]}`)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm({ client_name: '', freelancer: '', monthly_fee: '', freelancer_fee: '0', expenses: '0', status: 'activo', notes: '', currency: 'USD' })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <CreditCard size={24} className="text-primary-400" />
            Mensualidades
          </h1>
          <p className="text-sm text-surface-400 mt-1">Gestión de mantenimientos recurrentes</p>
        </div>
        <Button onClick={() => { closeModal(); setShowModal(true) }}>
          <Plus size={16} />
          Agregar mantenimiento
        </Button>
      </div>

      {/* KPI Cards (per currency) */}
      <div className="space-y-6">
        {totalsByCurrency.map(t => (
          <div key={t.code} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                t.code === 'USD' ? 'bg-emerald-500' : t.code === 'EUR' ? 'bg-amber-400' : 'bg-primary-500'
              }`} />
              <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Totales en {t.label}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                label="MRR Total" 
                value={
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-bold opacity-70">{t.code}</span>
                    <span>{t.symbol}{t.mrr.toLocaleString()}</span>
                  </div>
                } 
                icon={DollarSign} 
                color="primary" 
              />
              <StatCard 
                label="Ganancia Neta" 
                value={
                  <div className="flex items-baseline gap-1 text-emerald-400 font-bold">
                    <span className="text-[10px] opacity-70">{t.code}</span>
                    <span>{t.symbol}{t.netProfit.toLocaleString()}</span>
                  </div>
                } 
                icon={TrendingUp} 
                color="success" 
              />
              <StatCard label="Clientes Activos" value={t.activeCount} icon={Users} color="accent" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Freelancer</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Cobro Mensual</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Freelancer</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Gastos</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Ganancia</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-surface-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => {
                  const netProfit = Number(plan.monthly_fee) - Number(plan.freelancer_fee) - Number(plan.expenses)
                  return (
                    <tr key={plan.id} className="border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors">
                      <td className="px-5 py-3.5 text-surface-200 font-medium">{plan.client_name}</td>
                      <td className="px-5 py-3.5 text-surface-400">{plan.freelancer || '—'}</td>
                      <td className="px-5 py-3.5 text-right text-surface-200">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-bold opacity-70">{plan.currency || 'USD'}</span>
                          <span>{currencies.find(c => c.code === (plan.currency || 'USD'))?.symbol}{Number(plan.monthly_fee).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-surface-400">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-bold opacity-70">{plan.currency || 'USD'}</span>
                          <span>{currencies.find(c => c.code === (plan.currency || 'USD'))?.symbol}{Number(plan.freelancer_fee).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-surface-400">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-bold opacity-70">{plan.currency || 'USD'}</span>
                          <span>{currencies.find(c => c.code === (plan.currency || 'USD'))?.symbol}{Number(plan.expenses).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-bold opacity-70">{plan.currency || 'USD'}</span>
                          <span>{currencies.find(c => c.code === (plan.currency || 'USD'))?.symbol}{netProfit.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <select
                          value={plan.status}
                          onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                          className={`
                            text-xs font-medium px-2 py-1 rounded-full border cursor-pointer
                            bg-transparent focus:outline-none
                            ${plan.status === 'activo' ? 'text-emerald-400 border-emerald-500/30' :
                              plan.status === 'pausado' ? 'text-amber-400 border-amber-500/30' :
                              'text-red-400 border-red-500/30'}
                          `}
                        >
                          <option value="activo">Activo</option>
                          <option value="pausado">Pausado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditing(plan)
                              setForm({
                                client_name: plan.client_name,
                                freelancer: plan.freelancer || '',
                                monthly_fee: String(plan.monthly_fee),
                                freelancer_fee: String(plan.freelancer_fee),
                                expenses: String(plan.expenses),
                                status: plan.status,
                                currency: plan.currency || 'USD',
                                notes: plan.notes || '',
                              })
                              setShowModal(true)
                            }}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Currency Table Totals */}
                {totalsByCurrency.map(t => (
                  <tr key={t.code} className="bg-surface-800/20 border-t border-surface-700/50">
                    <td className="px-5 py-3 text-surface-400 font-bold" colSpan={2}>SUBTOTAL ({t.label})</td>
                    <td className="px-5 py-3 text-right text-surface-200 font-bold">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70">{t.code}</span>
                        <span>{t.symbol}{t.colTotals.monthly_fee.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-surface-400 font-bold">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70">{t.code}</span>
                        <span>{t.symbol}{t.colTotals.freelancer_fee.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-surface-400 font-bold">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70">{t.code}</span>
                        <span>{t.symbol}{t.colTotals.expenses.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${t.colTotals.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70">{t.code}</span>
                        <span>{t.symbol}{t.colTotals.net_profit.toLocaleString()}</span>
                      </div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Editar mantenimiento' : 'Agregar mantenimiento'}>
        <div className="space-y-4">
          <Input label="Cliente" value={form.client_name} onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nombre del cliente" />
          <Input label="Freelancer" value={form.freelancer} onChange={(e) => setForm(f => ({ ...f, freelancer: e.target.value }))} placeholder="Nombre (opcional)" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Moneda" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
            <Select label="Estado" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Cobro Mensual" type="number" value={form.monthly_fee} onChange={(e) => setForm(f => ({ ...f, monthly_fee: e.target.value }))} placeholder="0" />
            <Input label="Freelancer" type="number" value={form.freelancer_fee} onChange={(e) => setForm(f => ({ ...f, freelancer_fee: e.target.value }))} placeholder="0" />
            <Input label="Gastos" type="number" value={form.expenses} onChange={(e) => setForm(f => ({ ...f, expenses: e.target.value }))} placeholder="0" />
          </div>
          <Input label="Notas" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas opcionales..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
