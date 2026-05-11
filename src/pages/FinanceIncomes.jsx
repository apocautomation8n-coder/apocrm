import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { StatCard } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { TrendingUp, Plus, Pencil, Trash2, Filter, Wallet, Building2, DollarSign, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { executeFinanceAutomations } from '../lib/financeAutomations'

const currencies = [
  { code: 'ARS', symbol: '$', label: 'Pesos (ARS)' },
  { code: 'USD', symbol: '$', label: 'Dólares (USD)' },
  { code: 'USD_ARS', symbol: '$', label: 'Dólares (USD ARS)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
]

export default function FinanceIncomes({ hideHeader = false }) {
  const [incomes, setIncomes] = useState([])
  const [projects, setProjects] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  // Filters
  const [filterProject, setFilterProject] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    currency: 'USD',
    project_id: '',
    bank_account_id: '',
    description: '',
    notes: '',
  })

  // Derive available months from data
  const availableMonths = useMemo(() => {
    const months = new Set()
    incomes.forEach(i => {
      if (i.date) months.add(i.date.substring(0, 7)) // 'YYYY-MM'
    })
    return Array.from(months).sort().reverse()
  }, [incomes])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch project payments (type = 'ingreso' and bank_account_id is not null implies a recorded payment)
    const { data: incomeData } = await supabase
      .from('finance_transactions')
      .select('*, project:project_id(id, client, budget, remaining, collected, status), account:bank_account_id(id, name)')
      .eq('type', 'ingreso')
      .not('bank_account_id', 'is', null)
      .order('date', { ascending: false })
    
    // Fetch projects to link to (all transactions with budget)
    const { data: projectData } = await supabase
      .from('finance_transactions')
      .select('*')
      .not('budget', 'is', null)
      .eq('status', 'activo')
      .order('client', { ascending: true })

    // Fetch bank accounts
    const { data: accountData } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('name', { ascending: true })

    setIncomes(incomeData || [])
    setProjects(projectData || [])
    setAccounts(accountData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = incomes.filter(i => {
    if (filterProject !== 'all' && i.project_id !== filterProject) return false
    if (filterAccount !== 'all' && i.bank_account_id !== filterAccount) return false
    if (filterMonth !== 'all' && i.date && !i.date.startsWith(filterMonth)) return false
    return true
  })

  const handleSave = async () => {
    if (!form.amount || !form.date || !form.bank_account_id) {
      return toast.error('Monto, fecha y cuenta bancaria son obligatorios')
    }
    
    const amount = parseFloat(form.amount)
    
    const payload = { 
      type: 'ingreso',
      amount: amount,
      currency: form.currency,
      description: form.description || `Cobro: ${projects.find(p => p.id === form.project_id)?.client || 'General'}`,
      date: form.date,
      project_id: form.project_id || null,
      bank_account_id: form.bank_account_id,
      notes: form.notes,
    }

    try {
      if (editing) {
        const { error } = await supabase.from('finance_transactions').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Ingreso actualizado')
      } else {
        // Create new income
        const { error: insError } = await supabase.from('finance_transactions').insert(payload)
        if (insError) throw insError

        // 1. Update bank account balance
        const targetAccount = accounts.find(a => a.id === form.bank_account_id)
        if (targetAccount) {
          const newBalance = Number(targetAccount.balance || 0) + amount
          await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', targetAccount.id)
        }

        // 2. Update project collected/remaining
        if (form.project_id) {
          const targetProject = projects.find(p => p.id === form.project_id)
          if (targetProject) {
            const newCollected = Number(targetProject.collected || 0) + amount
            const newRemaining = Math.max(0, Number(targetProject.remaining || 0) - amount)
            
            await supabase.from('finance_transactions').update({ 
               collected: newCollected,
               remaining: newRemaining 
            }).eq('id', targetProject.id)

            // Confirmation to close
            if (newRemaining <= 0) {
              if (confirm('¡El proyecto ha sido pagado por completo! ¿Deseas cerrarlo automáticamente ahora?')) {
                await supabase.from('finance_transactions').update({ status: 'cerrado' }).eq('id', targetProject.id)
              }
            }
          }
        }
        
        // 3. Execute Automations
        await executeFinanceAutomations({ ...payload, id: insError ? null : 'new' }) // ID is handled by hook
        
        toast.success('Ingreso registrado y saldos actualizados')
      }
    } catch (err) {
      toast.error('Error al procesar el ingreso')
      console.error(err)
    }

    setShowModal(false)
    setEditing(null)
    fetchData()
  }

  const handleDelete = async (i) => {
    if (!confirm('¿Eliminar este registro de ingreso?')) return
    await supabase.from('finance_transactions').delete().eq('id', i.id)
    toast.success('Registro eliminado')
    fetchData()
  }

  const openNewModal = () => {
    setEditing(null)
    setForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      currency: 'USD',
      project_id: '',
      bank_account_id: '',
      description: '',
      notes: '',
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
              <TrendingUp size={24} className="text-emerald-400" />
              Ingresos y Cobros
            </h1>
            <p className="text-sm text-surface-400 mt-1">Registro de pagos vinculados a proyectos y cuentas</p>
          </div>
          <Button onClick={openNewModal}>
            <Plus size={16} />
            Registrar Ingreso
          </Button>
        </div>
      )}

      {/* KPI Cards (Breakdown by currency) */}
      <div className="space-y-4">
        {currencies.map(c => {
          const perCurr = filtered.filter(i => (i.currency || 'USD') === c.code)
          const totalCobrado = perCurr.reduce((s, i) => s + Number(i.amount || 0), 0)
          const count = perCurr.length

          // Skip currencies with no data unless there's a active filter
          if (totalCobrado === 0 && count === 0) return null

          return (
            <div key={c.code} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  c.code === 'USD' ? 'bg-emerald-500' : 
                  c.code === 'USD_ARS' ? 'bg-teal-500' :
                  c.code === 'EUR' ? 'bg-amber-400' : 
                  'bg-primary-500'
                }`} />
                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Ingresos en {c.label}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard 
                  label="Total Cobrado" 
                  value={
                    <div className={`flex items-baseline gap-1 ${
                      c.code === 'USD' || c.code === 'USD_ARS' ? 'text-emerald-400' : 
                      c.code === 'EUR' ? 'text-amber-400' : 
                      'text-primary-400'
                    }`}>
                       <span className="text-[10px] font-bold opacity-70">{c.code}</span>
                       <span>{c.symbol}{totalCobrado.toLocaleString()}</span>
                    </div>
                  } 
                  icon={TrendingUp} 
                  color="success" 
                />
                <StatCard 
                  label="Cantidad de Cobros" 
                  value={count} 
                  icon={DollarSign} 
                  color="primary" 
                />
                <StatCard 
                  label="Cuentas con Saldo" 
                  value={accounts.filter(a => a.balance > 0).length} 
                  icon={Wallet} 
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
          <span className="text-sm text-surface-400 font-medium">Filtrar por:</span>
        </div>
        
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="all">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.client}</option>
          ))}
        </select>

        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-200 text-sm focus:outline-none cursor-pointer hover:border-surface-600 transition-colors"
        >
          <option value="all">Todas las cuentas</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
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

        {hideHeader && (
           <div className="ml-auto">
              <Button onClick={openNewModal}>
                <Plus size={16} />
                Registrar Cobro
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
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-surface-800/60">
                  <th className="px-5 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">Proyecto / Cliente</th>
                  <th className="px-5 py-3 text-xs font-medium text-surface-400 uppercase tracking-wider">Cuenta Destino</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Monto</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} className="border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-surface-400">{i.date}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-surface-200 font-medium">{i.project?.client || 'Venta / Otros'}</span>
                        <span className="text-[10px] text-surface-500">{i.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-surface-400">
                        <Building2 size={14} className="text-primary-400" />
                        {i.account?.name || 'Caja'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-400">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] opacity-70 font-bold">{i.currency}</span>
                        <span>{currencies.find(c => c.code === i.currency)?.symbol}{Number(i.amount).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleDelete(i)} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-surface-500">
                No hay registros de ingresos vinculados.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Cobro / Ingreso">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha de Cobro" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            <Select label="Moneda" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Select label="Vincular a Proyecto" value={form.project_id} onChange={(e) => setForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">Ingreso Independiente</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.client} (Pendiente: {p.remaining})</option>
              ))}
            </Select>
            <Select label="Cuenta Destino (Donde entra el dinero)" value={form.bank_account_id} onChange={(e) => setForm(f => ({ ...f, bank_account_id: e.target.value }))}>
              <option value="">Seleccionar cuenta bancaria...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} (Saldo: {a.balance})</option>
              ))}
            </Select>
          </div>

          <Input label="Monto Recibido" type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          <Input label="Descripción / Concepto" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Pago cuota, Entrega, etc." />
          <Input label="Notas Internas" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-800">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="px-8">Registrar Cobro</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
