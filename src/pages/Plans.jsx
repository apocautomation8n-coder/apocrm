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

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    client_name: '', freelancer: '', monthly_fee: '', freelancer_fee: '0', expenses: '0', status: 'activo', notes: '',
  })

  const fetchPlans = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('monthly_plans').select('*').order('created_at')
    if (error) toast.error('Error cargando mantenimientos')
    else setPlans(data)
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [])

  const totals = useMemo(() => {
    const active = plans.filter(p => p.status === 'activo')
    const mrr = active.reduce((s, p) => s + Number(p.monthly_fee), 0)
    const netProfit = active.reduce((s, p) => s + (Number(p.monthly_fee) - Number(p.freelancer_fee) - Number(p.expenses)), 0)
    return { mrr, netProfit, activeCount: active.length }
  }, [plans])

  const colTotals = useMemo(() => ({
    monthly_fee: plans.reduce((s, p) => s + Number(p.monthly_fee), 0),
    freelancer_fee: plans.reduce((s, p) => s + Number(p.freelancer_fee), 0),
    expenses: plans.reduce((s, p) => s + Number(p.expenses), 0),
    net_profit: plans.reduce((s, p) => s + (Number(p.monthly_fee) - Number(p.freelancer_fee) - Number(p.expenses)), 0),
  }), [plans])

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.monthly_fee) return toast.error('Nombre y cobro mensual son obligatorios')

    const payload = {
      client_name: form.client_name,
      freelancer: form.freelancer || null,
      monthly_fee: parseFloat(form.monthly_fee),
      freelancer_fee: parseFloat(form.freelancer_fee) || 0,
      expenses: parseFloat(form.expenses) || 0,
      status: form.status,
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
    setForm({ client_name: '', freelancer: '', monthly_fee: '', freelancer_fee: '0', expenses: '0', status: 'activo', notes: '' })
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="MRR Total" value={`$${totals.mrr.toLocaleString()}`} icon={DollarSign} color="primary" />
        <StatCard label="Ganancia Limpia" value={`$${totals.netProfit.toLocaleString()}`} icon={TrendingUp} color="success" />
        <StatCard label="Clientes Activos" value={totals.activeCount} icon={Users} color="accent" />
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
                      <td className="px-5 py-3.5 text-right text-surface-200">${Number(plan.monthly_fee).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-surface-400">${Number(plan.freelancer_fee).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-surface-400">${Number(plan.expenses).toLocaleString()}</td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${netProfit.toLocaleString()}
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

                {/* Totals row */}
                <tr className="bg-surface-800/40 border-t-2 border-surface-700/50">
                  <td className="px-5 py-3.5 text-surface-200 font-bold" colSpan={2}>TOTAL</td>
                  <td className="px-5 py-3.5 text-right text-surface-100 font-bold">${colTotals.monthly_fee.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right text-surface-300 font-bold">${colTotals.freelancer_fee.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right text-surface-300 font-bold">${colTotals.expenses.toLocaleString()}</td>
                  <td className={`px-5 py-3.5 text-right font-bold ${colTotals.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${colTotals.net_profit.toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
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
          <div className="grid grid-cols-3 gap-3">
            <Input label="Cobro Mensual (USD)" type="number" value={form.monthly_fee} onChange={(e) => setForm(f => ({ ...f, monthly_fee: e.target.value }))} placeholder="0" />
            <Input label="Freelancer (USD)" type="number" value={form.freelancer_fee} onChange={(e) => setForm(f => ({ ...f, freelancer_fee: e.target.value }))} placeholder="0" />
            <Input label="Gastos (USD)" type="number" value={form.expenses} onChange={(e) => setForm(f => ({ ...f, expenses: e.target.value }))} placeholder="0" />
          </div>
          <Select label="Estado" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </Select>
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
