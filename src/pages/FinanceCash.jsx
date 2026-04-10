import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { Wallet, Plus, Pencil, Trash2, CreditCard, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

const currencies = [
  { code: 'ARS', symbol: '$', label: 'Pesos (ARS)' },
  { code: 'USD', symbol: '$', label: 'Dólares Blue (USD)' },
  { code: 'USD_ARS', symbol: '$', label: 'Dólares (USD ARS)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
]

export default function FinanceCash({ hideHeader = false }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    name: '',
    currency: 'USD',
    balance: '',
    card_number: '',
    card_holder: '',
    card_expiry: '',
    card_type: 'Débito',
    cbu: '',
    alias: '',
    notes: '',
  })

  const fetchAccounts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) toast.error('Error cargando cuentas')
    else setAccounts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const handleSave = async () => {
    if (!form.name) return toast.error('El nombre de la cuenta es obligatorio')

    const payload = {
      name: form.name,
      currency: form.currency,
      balance: parseFloat(form.balance || 0),
      card_number: form.card_number || null,
      card_holder: form.card_holder || null,
      card_expiry: form.card_expiry || null,
      card_type: form.card_type || null,
      cbu: form.cbu || null,
      alias: form.alias || null,
      notes: form.notes || null,
    }

    if (editing) {
      const { error } = await supabase.from('bank_accounts').update(payload).eq('id', editing.id)
      if (error) return toast.error('Error actualizando')
      toast.success('Cuenta actualizada')
    } else {
      const { error } = await supabase.from('bank_accounts').insert(payload)
      if (error) return toast.error('Error creando cuenta')
      toast.success('Cuenta creada')
    }

    setShowModal(false)
    setEditing(null)
    fetchAccounts()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cuenta permanentemente?')) return
    await supabase.from('bank_accounts').delete().eq('id', id)
    toast.success('Cuenta eliminada')
    fetchAccounts()
  }

  const openNewModal = () => {
    setEditing(null)
    setForm({ 
      name: '', 
      currency: 'USD', 
      balance: '', 
      card_number: '', 
      card_holder: '', 
      card_expiry: '',
      card_type: 'Débito',
      cbu: '',
      alias: '',
      notes: '' 
    })
    setShowModal(true)
  }

  const openEditModal = (a) => {
    setEditing(a)
    setForm({
      name: a.name,
      currency: a.currency || 'USD',
      balance: a.balance,
      card_number: a.card_number || '',
      card_holder: a.card_holder || '',
      card_expiry: a.card_expiry || '',
      card_type: a.card_type || 'Débito',
      cbu: a.cbu || '',
      alias: a.alias || '',
      notes: a.notes || '',
    })
    setShowModal(true)
  }

  // Group by currency
  const grouped = currencies.map(c => ({
    ...c,
    accounts: accounts.filter(a => (a.currency || 'USD') === c.code),
    total: accounts.filter(a => (a.currency || 'USD') === c.code).reduce((s, a) => s + Number(a.balance || 0), 0)
  })).filter(g => g.accounts.length > 0)

  return (
    <div className={`space-y-6 animate-fade-in ${!hideHeader ? 'p-6' : 'py-2'}`}>
      {/* Button row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-amber-400" />
          <span className="text-sm font-semibold text-surface-300">Dinero en Caja & Cuentas Bancarias</span>
        </div>
        <Button onClick={openNewModal}>
          <Plus size={16} />
          Agregar Cuenta
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-12 text-center bg-surface-900/80 border border-surface-800/60 rounded-2xl">
          <Wallet size={40} className="text-surface-700 mx-auto mb-3" />
          <p className="text-surface-400 font-medium">No hay cuentas registradas todavía.</p>
          <p className="text-surface-500 text-xs mt-1">Agrega tus cuentas bancarias, billeteras o efectivo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.code} className="space-y-3">
              {/* Currency header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    group.code === 'USD' || group.code === 'USD_ARS' ? 'bg-emerald-500' : 
                    group.code === 'EUR' ? 'bg-amber-400' : 
                    'bg-primary-500'
                  }`} />
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">{group.label}</span>
                </div>
                <span className={`text-sm font-bold ${
                  group.code === 'USD' || group.code === 'USD_ARS' ? 'text-emerald-400' : 
                  group.code === 'EUR' ? 'text-amber-400' : 
                  'text-primary-400'
                }`}>
                  Total: {group.symbol}{group.total.toLocaleString()}
                </span>
              </div>

              {/* Account cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.accounts.map(account => (
                  <div key={account.id} className="bg-surface-900/80 border border-surface-800/60 rounded-2xl p-5 hover:border-surface-700/60 transition-all group relative overflow-hidden">
                    {/* Background decoration */}
                    <Building2 className="absolute -right-4 -bottom-4 w-24 h-24 text-surface-800/30 -rotate-12 pointer-events-none" />
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          group.code === 'USD' || group.code === 'USD_ARS' ? 'bg-emerald-500/10 text-emerald-400' : 
                          group.code === 'EUR' ? 'bg-amber-500/10 text-amber-400' : 
                          'bg-primary-500/10 text-primary-400'
                        }`}>
                          <Building2 size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-surface-200 truncate">{account.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {account.alias && (
                              <span className="text-[9px] bg-primary-500/10 text-primary-400 px-1.5 rounded uppercase font-bold tracking-tighter">
                                Alias: {account.alias}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(account)} className="p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(account.id)} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className={`text-2xl font-bold mb-3 relative z-10 ${
                      group.code === 'USD' || group.code === 'USD_ARS' ? 'text-emerald-400' : 
                      group.code === 'EUR' ? 'text-amber-400' : 
                      'text-primary-400'
                    }`}>
                      <span className="text-xs opacity-60 mr-1">{group.code === 'USD_ARS' ? 'USD (ARS)' : group.code}</span>
                      {group.symbol}{Number(account.balance).toLocaleString()}
                    </div>

                    {/* Banking identifiers */}
                    {account.cbu && (
                      <div className="mb-3 relative z-10">
                        <p className="text-[10px] text-surface-500 uppercase font-bold tracking-widest mb-1 ml-1">CBU / CVU</p>
                        <div className="px-3 py-1.5 rounded-lg bg-surface-950/50 border border-surface-800/60 font-mono text-[11px] text-surface-400 select-all">
                          {account.cbu}
                        </div>
                      </div>
                    )}

                    {/* Card info */}
                    {account.card_number && (
                      <div className="relative z-10 mt-auto">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700/50 shadow-lg group-hover:border-primary-500/30 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <CreditCard size={14} className="text-surface-400" />
                            <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest">{account.card_type || 'Débito'}</span>
                          </div>
                          <p className="text-sm font-mono tracking-widest text-surface-200 mb-1">
                            •••• •••• •••• {account.card_number.slice(-4)}
                          </p>
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] text-surface-500 uppercase truncate max-w-[120px]">{account.card_holder || 'Titular'}</p>
                            {account.card_expiry && (
                              <div className="text-right">
                                <p className="text-[8px] text-surface-600 uppercase font-bold tracking-tighter">vence</p>
                                <p className="text-[10px] text-surface-300 font-mono">{account.card_expiry}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Cuenta' : 'Agregar Cuenta'}>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
          <section className="space-y-4">
            <Input label="Nombre de la cuenta" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Banco Galicia, Mercado Pago, Binance..." />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Moneda" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
                {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </Select>
              <Input label="Saldo actual" type="number" value={form.balance} onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} />
            </div>
          </section>

          <section className="p-4 rounded-2xl bg-surface-900/50 border border-surface-800/60 space-y-4">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 size={13} className="text-primary-500" />
              Identificadores Bancarios
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Input label="CBU / CVU" value={form.cbu} onChange={(e) => setForm(f => ({ ...f, cbu: e.target.value }))} placeholder="22 dígitos..." />
              <Input label="Alias" value={form.alias} onChange={(e) => setForm(f => ({ ...f, alias: e.target.value }))} placeholder="mi.alias.banco" />
            </div>
          </section>
          
          <section className="p-4 rounded-2xl bg-surface-900/50 border border-surface-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={13} className="text-emerald-500" />
                Datos de Tarjeta
              </p>
              <Select className="!w-fit text-[10px] h-7" value={form.card_type} onChange={(e) => setForm(f => ({ ...f, card_type: e.target.value }))}>
                <option value="Débito">Débito</option>
                <option value="Crédito Visa">Crédito Visa</option>
                <option value="Crédito Master">Crédito Master</option>
                <option value="Crédito Amex">Crédito Amex</option>
                <option value="Prepaga">Prepaga</option>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <Input label="Número de tarjeta (opcional)" value={form.card_number} onChange={(e) => setForm(f => ({ ...f, card_number: e.target.value }))} placeholder="XXXX XXXX XXXX XXXX" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Titular" value={form.card_holder} onChange={(e) => setForm(f => ({ ...f, card_holder: e.target.value }))} placeholder="TITULAR NOMBRE" />
                <Input label="Vencimiento" value={form.card_expiry} onChange={(e) => setForm(f => ({ ...f, card_expiry: e.target.value }))} placeholder="MM/YY" />
              </div>
            </div>
          </section>

          <Input label="Notas adicionales" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: Cuenta para sueldos, caja chica..." />
          
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-700/50">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar Cambios' : 'Crear Cuenta'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
