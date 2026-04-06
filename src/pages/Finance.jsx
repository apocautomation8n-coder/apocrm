import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2, Filter, Archive } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const sections = ['b2b', 'wg', 'eleven', 'otro']
const currencies = [
  { code: 'ARS', symbol: '$', label: 'Pesos (ARS)' },
  { code: 'USD', symbol: '$', label: 'Dólares (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
]

export default function Finance() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  // Filters
  const [filterSection, setFilterSection] = useState('all')
  const [filterStatus, setFilterStatus] = useState('activo')
  const [filterMonth, setFilterMonth] = useState('all') // 'all' or 'YYYY-MM'
  const [filterCurrency, setFilterCurrency] = useState('all')
  
  const [form, setForm] = useState({
    type: 'ingreso', amount: 0, date: format(new Date(), 'yyyy-MM-dd'),
    section: 'b2b', client: '', responsible: '', 
    budget: 0, collected: 0, freelancer_fee: 0, 
    freelancer_paid: 0, pending_freelancer: 0, 
    remaining: 0, net_profit: 0, notes: '', status: 'activo',
    currency: 'ARS'
  })

  // Derive available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set()
    transactions.forEach(t => {
      if (t.date) {
        months.add(t.date.substring(0, 7)) // 'YYYY-MM'
      }
    })
    return Array.from(months).sort().reverse()
  }, [transactions])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .order('date', { ascending: false })
    if (error) toast.error('Error cargando transacciones')
    else setTransactions(data)
    setLoading(false)
  }

  useEffect(() => { fetchTransactions() }, [])

  const filtered = transactions.filter(t => {
    // 1. Filtrar por Sección
    if (filterSection !== 'all' && t.section !== filterSection) return false
    
    // 2. Filtrar por Estado (Activo / Cerrado / Historial Completo)
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    
    // 3. Filtrar por Mes
    if (filterMonth !== 'all' && t.date && !t.date.startsWith(filterMonth)) {
      return false
    }

    // 4. Filtrar por Moneda
    if (filterCurrency !== 'all' && t.currency !== filterCurrency) return false

    return true
  })

  const totals = useMemo(() => {
    const res = {}
    currencies.forEach(c => {
      const perCurr = filtered.filter(t => (t.currency || 'ARS') === c.code)
      res[c.code] = {
        totalBudget: perCurr.reduce((s, t) => s + Number(t.budget || 0), 0),
        totalCollected: perCurr.reduce((s, t) => s + Number(t.collected || 0), 0),
        totalNetProfit: perCurr.reduce((s, t) => s + (Number(t.budget || 0) - Number(t.freelancer_fee || 0)), 0),
        totalPending: perCurr.reduce((s, t) => s + Number(t.remaining || 0), 0),
        symbol: c.symbol
      }
    })
    return res
  }, [filtered])

  const handleSave = async () => {
    if (!form.client || !form.date) return toast.error('Cliente y fecha son obligatorios')
    
    // Auto-calculate net_profit from budget and freelancer_fee
    const budget = parseFloat(form.budget || 0)
    const freelancerFee = parseFloat(form.freelancer_fee || 0)

    const payload = { 
      ...form, 
      amount: parseFloat(form.collected || 0),
      budget: budget,
      collected: parseFloat(form.collected || 0),
      freelancer_fee: freelancerFee,
      freelancer_paid: parseFloat(form.freelancer_paid || 0),
      pending_freelancer: parseFloat(form.pending_freelancer || 0),
      remaining: parseFloat(form.remaining || 0),
      net_profit: budget - freelancerFee,
    }

    if (editing) {
      const { error } = await supabase.from('finance_transactions').update(payload).eq('id', editing.id)
      if (error) return toast.error('Error actualizando')
      toast.success('Transacción actualizada')
    } else {
      const { error } = await supabase.from('finance_transactions').insert(payload)
      if (error) return toast.error('Error creando transacción')
      toast.success('Transacción creada')
    }

    setShowModal(false)
    setEditing(null)
    fetchTransactions()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta transacción de forma permanente?')) return
    await supabase.from('finance_transactions').delete().eq('id', id)
    toast.success('Transacción eliminada')
    fetchTransactions()
  }
  
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'activo' ? 'cerrado' : 'activo'
    const { error } = await supabase
      .from('finance_transactions')
      .update({ status: newStatus })
      .eq('id', id)
      
    if (error) toast.error('Error cambiando el estado')
    else {
      toast.success(`Proyecto ${newStatus}`)
      fetchTransactions()
    }
  }

  const openNewModal = () => {
    setEditing(null)
    setForm({
      type: 'ingreso', amount: 0, date: format(new Date(), 'yyyy-MM-dd'),
      section: 'b2b', client: '', responsible: '', 
      budget: 0, collected: 0, freelancer_fee: 0, 
      freelancer_paid: 0, pending_freelancer: 0, 
      remaining: 0, net_profit: 0, notes: '', status: 'activo',
      currency: 'ARS'
    })
    setShowModal(true)
  }

  const openEditModal = (t) => {
    setEditing(t)
    setForm({
      type: t.type || 'ingreso', 
      amount: t.amount || 0, 
      date: t.date,
      section: t.section || 'otro', 
      client: t.client || '', 
      responsible: t.responsible || '', 
      budget: t.budget || 0, 
      collected: t.collected || 0, 
      freelancer_fee: t.freelancer_fee || 0, 
      freelancer_paid: t.freelancer_paid || 0, 
      pending_freelancer: t.pending_freelancer || 0, 
      remaining: t.remaining || 0, 
      net_profit: t.net_profit || 0, 
      notes: t.notes || '',
      status: t.status || 'activo',
      currency: t.currency || 'ARS'
    })
    setShowModal(true)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <DollarSign size={24} className="text-primary-400" />
            Finanzas (Proyectos)
          </h1>
          <p className="text-sm text-surface-400 mt-1">Control por sectores B2B, Eleven, WG</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus size={16} />
          Agregar nuevo
        </Button>
      </div>

      {/* KPI Cards (Breakdown by currency) */}
      <div className="space-y-4">
        {currencies.map(c => {
          const t = totals[c.code]
          if (filterCurrency !== 'all' && filterCurrency !== c.code) return null
          if (t.totalBudget === 0 && t.totalCollected === 0 && filterCurrency === 'all') return null
          
          return (
            <div key={c.code} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  c.code === 'USD' ? 'bg-emerald-500' : 
                  c.code === 'EUR' ? 'bg-amber-400' : 
                  'bg-primary-500'
                }`} />
                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Totales en {c.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-tighter ${
                  c.code === 'USD' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  c.code === 'EUR' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-primary-500/10 text-primary-400 border-primary-500/20'
                }`}>
                  {c.code === 'USD' ? 'Premium' : c.code === 'EUR' ? 'Global' : 'Local'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  label="Presupuestados" 
                  value={
                    <div className="flex items-baseline gap-1">
                       <span className={`text-[10px] font-bold ${
                         c.code === 'USD' ? 'text-emerald-500/70' : 
                         c.code === 'EUR' ? 'text-amber-500/70' : 
                         'text-primary-500/70'
                       }`}>{c.code}</span>
                       <span>{c.symbol}{t.totalBudget.toLocaleString()}</span>
                    </div>
                  } 
                  icon={TrendingUp} 
                  color="primary" 
                />
                <StatCard 
                  label="Cobrados" 
                  value={
                    <div className={`flex items-baseline gap-1 ${
                      c.code === 'USD' ? 'text-emerald-400' : 
                      c.code === 'EUR' ? 'text-amber-400' : 
                      'text-emerald-400'
                    }`}>
                       <span className="text-[10px] font-bold opacity-70">{c.code}</span>
                       <span>{c.symbol}{t.totalCollected.toLocaleString()}</span>
                    </div>
                  } 
                  icon={DollarSign} 
                  color="success" 
                />
                <StatCard 
                  label="Pendiente" 
                  value={
                    <div className="flex items-baseline gap-1">
                       <span className={`text-[10px] font-bold ${
                         c.code === 'USD' ? 'text-emerald-500/70' : 
                         c.code === 'EUR' ? 'text-amber-500/70' : 
                         'text-primary-500/70'
                       }`}>{c.code}</span>
                       <span>{c.symbol}{t.totalPending.toLocaleString()}</span>
                    </div>
                  } 
                  icon={TrendingDown} 
                  color="warning" 
                />
                <StatCard 
                  label="Ganancia Neta" 
                  value={
                    <div className={`flex items-baseline gap-1 font-bold ${
                      c.code === 'USD' ? 'text-emerald-400' : 
                      c.code === 'EUR' ? 'text-amber-400' : 
                      'text-emerald-400'
                    }`}>
                       <span className="text-[10px] opacity-70">{c.code}</span>
                       <span>{c.symbol}{t.totalNetProfit.toLocaleString()}</span>
                    </div>
                  } 
                  icon={DollarSign} 
                  color="accent" 
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-900/60 rounded-2xl border border-surface-800/60">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-surface-400" />
          <span className="text-sm text-surface-400 font-medium">Filtros:</span>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="activo">Proyectos Activos</option>
          <option value="cerrado">Proyectos Cerrados</option>
          <option value="all">Historial Completo</option>
        </select>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="all">Todos los meses</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="all">Todas las secciones</option>
          {sections.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>

        <select
          value={filterCurrency}
          onChange={(e) => setFilterCurrency(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="all">Todas las monedas</option>
          {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">Sección</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">Responsable</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Presupuesto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Cobrado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Fee FL</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Pendiente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Ganancia Neta</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className={`border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors ${t.status === 'cerrado' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <Badge color={t.status === 'activo' ? "primary" : "neutral"}>{t.section?.toUpperCase() || 'OTRO'}</Badge>
                        <span className="text-[10px] text-surface-500 font-bold ml-1">{t.currency || 'ARS'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-surface-200 font-medium">{t.client || t.description || '—'}</td>
                    <td className="px-4 py-3.5 text-surface-400">{t.responsible || '—'}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-surface-200">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`text-[10px] font-bold ${
                          t.currency === 'USD' ? 'text-emerald-500/80' : 
                          t.currency === 'EUR' ? 'text-amber-500/80' : 
                          'text-primary-500/80'
                        }`}>{t.currency || 'ARS'}</span>
                        <span>{currencies.find(c => c.code === (t.currency || 'ARS'))?.symbol}{Number(t.budget).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-400">
                      <div className="flex items-center justify-end gap-1 text-emerald-400">
                        <span className="text-[10px] opacity-70 font-bold">{t.currency || 'ARS'}</span>
                        <span>{currencies.find(c => c.code === (t.currency || 'ARS'))?.symbol}{Number(t.collected).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-surface-400">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70 font-bold">{t.currency || 'ARS'}</span>
                        <span>{currencies.find(c => c.code === (t.currency || 'ARS'))?.symbol}{Number(t.freelancer_fee).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3.5 text-right font-medium ${t.remaining > 0 ? 'text-amber-400' : 'text-surface-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70 font-bold">{t.currency || 'ARS'}</span>
                        <span>{currencies.find(c => c.code === (t.currency || 'ARS'))?.symbol}{Number(t.remaining).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                      <div className="flex items-center justify-end gap-1 text-emerald-400">
                        <span className="text-[10px] opacity-70 font-bold">{t.currency || 'ARS'}</span>
                        <span>{currencies.find(c => c.code === (t.currency || 'ARS'))?.symbol}{(Number(t.budget || 0) - Number(t.freelancer_fee || 0)).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          title={t.status === 'activo' ? "Cerrar Proyecto" : "Reabrir Proyecto"}
                          onClick={() => handleToggleStatus(t.id, t.status)} 
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${t.status === 'activo' ? 'text-surface-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'}`}
                        >
                          <Archive size={15} />
                        </button>
                        <button title="Editar" onClick={() => openEditModal(t)} className="p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer">
                          <Pencil size={15} />
                        </button>
                        <button title="Eliminar" onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-surface-400 font-medium">No hay proyectos que coincidan con los filtros.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar proyecto' : 'Agregar proyecto'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sección" value={form.section} onChange={(e) => setForm(f => ({ ...f, section: e.target.value }))}>
              {sections.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </Select>
            <Select label="Moneda" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <Input label="Fecha de inicio" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
             <Input label="Cliente" value={form.client} onChange={(e) => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Nombre del cliente" />
          </div>

          <div className="grid grid-cols-1 gap-4">
             <Input label="Responsable" value={form.responsible} onChange={(e) => setForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Eze, Gusti, Ale..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-surface-700/50 pt-4 mt-2">
            <Input label="Presupuesto" type="number" value={form.budget} onChange={(e) => setForm(f => ({ ...f, budget: e.target.value }))} />
            <Input label="Cobrado" type="number" value={form.collected} onChange={(e) => setForm(f => ({ ...f, collected: e.target.value }))} />
            <Input label="Pendiente de pago" type="number" value={form.remaining} onChange={(e) => setForm(f => ({ ...f, remaining: e.target.value }))} />
            <div className="space-y-1.5 opacity-60">
              <label className="block text-sm font-medium text-surface-300">Ganancia Neta (Automático)</label>
              <input
                type="number"
                value={Number(form.budget || 0) - Number(form.freelancer_fee || 0)}
                disabled
                className="w-full px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-surface-700/50 pt-4 mt-2">
            <Input label="Fee FL" type="number" value={form.freelancer_fee} onChange={(e) => setForm(f => ({ ...f, freelancer_fee: e.target.value }))} />
            <Input label="FL Pagado" type="number" value={form.freelancer_paid} onChange={(e) => setForm(f => ({ ...f, freelancer_paid: e.target.value }))} />
            <Input label="FL Pendiente" type="number" value={form.pending_freelancer} onChange={(e) => setForm(f => ({ ...f, pending_freelancer: e.target.value }))} />
          </div>

          <div className="border-t border-surface-700/50 pt-4 mt-2">
             <Select label="Estado del proyecto" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
               <option value="activo">Activo (Pendiente cobrar o en curso)</option>
               <option value="cerrado">Cerrado (Terminado y cobrado)</option>
             </Select>
          </div>

          <Input label="Notas" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anotaciones extra..." />
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
