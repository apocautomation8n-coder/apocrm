import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { TrendingDown, Plus, Pencil, Trash2, Filter } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const currencies = [
  { code: 'ARS', symbol: '$', label: 'Pesos (ARS)' },
  { code: 'USD', symbol: '$', label: 'Dólares (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
]

export default function FinanceExpenses({ hideHeader = false }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  // Filters
  const [filterMonth, setFilterMonth] = useState('all') // 'all' or 'YYYY-MM'
  const [filterCurrency, setFilterCurrency] = useState('all')
  
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
  })

  // Derive available months from dates
  const availableMonths = useMemo(() => {
    const months = new Set()
    expenses.forEach(e => {
      if (e.date) months.add(e.date.substring(0, 7)) // 'YYYY-MM'
    })
    return Array.from(months).sort().reverse()
  }, [expenses])

  const fetchExpenses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    if (error) toast.error('Error cargando egresos')
    else setExpenses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchExpenses() }, [])

  const filtered = expenses.filter(e => {
    if (filterMonth !== 'all' && e.date && !e.date.startsWith(filterMonth)) return false
    if (filterCurrency !== 'all' && e.currency !== filterCurrency) return false
    return true
  })

  const totalsByCurrency = useMemo(() => {
    return currencies.map(c => {
      const perCurr = filtered.filter(e => (e.currency || 'USD') === c.code)
      return {
        code: c.code,
        label: c.label,
        symbol: c.symbol,
        total: perCurr.reduce((sum, e) => sum + Number(e.amount || 0), 0)
      }
    })
  }, [filtered])

  const handleSave = async () => {
    if (!form.description || !form.date || !form.amount) return toast.error('Descripción, monto y fecha son obligatorios')
    
    const payload = { 
      amount: parseFloat(form.amount || 0),
      currency: form.currency,
      category: form.category,
      description: form.description,
      date: form.date
    }

    if (editing) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', editing.id)
      if (error) return toast.error('Error actualizando egreso')
      toast.success('Egreso actualizado')
    } else {
      const { error } = await supabase.from('expenses').insert(payload)
      if (error) return toast.error('Error creando egreso')
      toast.success('Egreso registrado')
    }

    setShowModal(false)
    setEditing(null)
    fetchExpenses()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de egreso permanentemente?')) return
    await supabase.from('expenses').delete().eq('id', id)
    toast.success('Egreso eliminado')
    fetchExpenses()
  }

  const openNewModal = () => {
    setEditing(null)
    setForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      currency: 'USD',
      category: '',
      description: '',
    })
    setShowModal(true)
  }

  const openEditModal = (t) => {
    setEditing(t)
    setForm({
      date: t.date,
      amount: t.amount,
      currency: t.currency || 'USD',
      category: t.category || '',
      description: t.description || '',
    })
    setShowModal(true)
  }

  return (
    <div className={`space-y-6 animate-fade-in ${!hideHeader ? 'p-6' : 'py-2'}`}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
              <TrendingDown size={24} className="text-red-400" />
              Egresos
            </h1>
            <p className="text-sm text-surface-400 mt-1">Registro de gastos y salidas de caja</p>
          </div>
          <Button onClick={openNewModal}>
            <Plus size={16} />
            Agregar Egreso
          </Button>
        </div>
      )}

      {/* KPI Cards (Breakdown by currency) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {totalsByCurrency.map(t => {
          if (filterCurrency !== 'all' && filterCurrency !== t.code) return null
          if (t.total === 0 && filterCurrency === 'all') return null
          
          return (
            <StatCard 
              key={t.code}
              label={`Egresos en ${t.code}`}
              value={
                <div className="flex items-baseline gap-1 text-red-400">
                  <span className="text-[10px] opacity-70">{t.code}</span>
                  <span>{t.symbol}{t.total.toLocaleString()}</span>
                </div>
              } 
              icon={TrendingDown} 
              color="danger" 
            />
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
          value={filterCurrency}
          onChange={(e) => setFilterCurrency(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="all">Todas las monedas</option>
          {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        
        {/* We can place the add button here if header is hidden to mimic other pages */}
        {hideHeader && (
           <div className="ml-auto">
              <Button onClick={openNewModal}>
                <Plus size={16} />
                Registrar Gasto
              </Button>
           </div>
        )}
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Descripción</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Categoría</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Monto</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-surface-400">{e.date}</td>
                    <td className="px-5 py-3.5 text-surface-200 font-medium">{e.description}</td>
                    <td className="px-5 py-3.5 text-surface-400">{e.category || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-400">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70 font-bold">{e.currency || 'USD'}</span>
                        <span>{currencies.find(c => c.code === (e.currency || 'USD'))?.symbol}{Number(e.amount).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Editar" onClick={() => openEditModal(e)} className="p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer">
                          <Pencil size={15} />
                        </button>
                        <button title="Eliminar" onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
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
                 <TrendingDown size={32} className="text-surface-700 mx-auto mb-3" />
                <p className="text-surface-400 font-medium">No hay egresos en este periodo.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Egreso' : 'Agregar Egreso'}>
        <div className="space-y-4">
          <Input label="Descripción / Concepto" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Suscripción Vercel, Pago Diseño..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monto" type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
            <Select label="Moneda" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <Input label="Fecha" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
             <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300">
                  Categoría (Opcional)
                </label>
                <input
                  type="text"
                  list="categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Sueldo, Software..."
                  className="w-full px-4 py-2 rounded-xl bg-surface-900/50 border border-surface-700/50 text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                />
                <datalist id="categories">
                  <option value="Sueldos"></option>
                  <option value="Software/Suscripciones"></option>
                  <option value="Impuestos"></option>
                  <option value="Servicios Diarios"></option>
                  <option value="Infraestructura"></option>
                  <option value="Devoluciones"></option>
                </datalist>
             </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-700/50">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
