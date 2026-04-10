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
  { code: 'USD', symbol: '$', label: 'Dólares (USD)' },
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
    setForm({ name: '', currency: 'USD', balance: '', card_number: '', card_holder: '', notes: '' })
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
                    group.code === 'USD' ? 'bg-emerald-500' : 
                    group.code === 'EUR' ? 'bg-amber-400' : 
                    'bg-primary-500'
                  }`} />
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">{group.label}</span>
                </div>
                <span className={`text-sm font-bold ${
                  group.code === 'USD' ? 'text-emerald-400' : 
                  group.code === 'EUR' ? 'text-amber-400' : 
                  'text-primary-400'
                }`}>
                  Total: {group.symbol}{group.total.toLocaleString()}
                </span>
              </div>

              {/* Account cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.accounts.map(account => (
                  <div key={account.id} className="bg-surface-900/80 border border-surface-800/60 rounded-2xl p-5 hover:border-surface-700/60 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          group.code === 'USD' ? 'bg-emerald-500/10 text-emerald-400' : 
                          group.code === 'EUR' ? 'bg-amber-500/10 text-amber-400' : 
                          'bg-primary-500/10 text-primary-400'
                        }`}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-surface-200">{account.name}</h3>
                          {account.notes && (
                            <p className="text-[10px] text-surface-500 mt-0.5">{account.notes}</p>
                          )}
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
                    <div className={`text-2xl font-bold mb-3 ${
                      group.code === 'USD' ? 'text-emerald-400' : 
                      group.code === 'EUR' ? 'text-amber-400' : 
                      'text-primary-400'
                    }`}>
                      <span className="text-xs opacity-60 mr-1">{group.code}</span>
                      {group.symbol}{Number(account.balance).toLocaleString()}
                    </div>

                    {/* Card info */}
                    {account.card_number && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800/50 border border-surface-700/30">
                        <CreditCard size={14} className="text-surface-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-surface-400 font-mono tracking-wider truncate">
                            •••• •••• •••• {account.card_number.slice(-4)}
                          </p>
                          {account.card_holder && (
                            <p className="text-[10px] text-surface-500 uppercase tracking-wider truncate">{account.card_holder}</p>
                          )}
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
        <div className="space-y-4">
          <Input label="Nombre de la cuenta" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Banco Galicia, Binance, Efectivo..." />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Moneda" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
            <Input label="Saldo actual" type="number" value={form.balance} onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} />
          </div>
          
          <div className="border-t border-surface-700/50 pt-4 mt-2">
            <p className="text-xs text-surface-500 mb-3 flex items-center gap-1.5">
              <CreditCard size={12} />
              Datos de tarjeta de débito (opcional)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Número de tarjeta" value={form.card_number} onChange={(e) => setForm(f => ({ ...f, card_number: e.target.value }))} placeholder="XXXX XXXX XXXX XXXX" />
              <Input label="Titular" value={form.card_holder} onChange={(e) => setForm(f => ({ ...f, card_holder: e.target.value }))} placeholder="Nombre como aparece en la tarjeta" />
            </div>
          </div>

          <Input label="Notas (opcional)" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Cuenta principal, caja chica..." />
          
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-700/50">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
