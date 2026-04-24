import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Plus, Search, FileText, Settings, Users, Eye, Pencil, Trash2, Download, Banknote, Clock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import InvoiceSettingsModal from '../components/invoices/InvoiceSettingsModal'
import InvoiceClientsModal from '../components/invoices/InvoiceClientsModal'

// This dynamic import is inside if we want to download PDF silently, but we can do that in InvoiceForm
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from '../components/invoices/InvoicePDF'

export default function Invoices({ hideHeader = false }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [showSettings, setShowSettings] = useState(false)
  const [showClients, setShowClients] = useState(false)
  
  const [metrics, setMetrics] = useState({ total_issued: 0, pending: 0, paid: 0 })
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_clients (name)
      `)
      .order('created_at', { ascending: false })
      
    if (error) {
      toast.error('Error cargando facturas')
    } else {
      setInvoices(data || [])
      calculateMetrics(data || [])
    }
    setLoading(false)
  }

  const calculateMetrics = (data) => {
    let issued = 0
    let pending = 0
    let paid = 0
    
    data.forEach(inv => {
      // Normalizing to USD if we want, or just summing. Let's assume the user metric sums USD or we just sum raw values for simplicity.
      // Better way: convert to USD using exchange_rate if currency != USD, but for now we just sum totals
      let value = Number(inv.total)
      if (inv.currency !== 'USD' && inv.exchange_rate) {
        value = value / Number(inv.exchange_rate)
      }
      
      if (inv.status === 'emitida' || inv.status === 'pagada') issued += value
      if (inv.status === 'emitida') pending += value
      if (inv.status === 'pagada') paid += value
    })

    setMetrics({ total_issued: issued, pending, paid })
  }

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (!search) return true
    
    const s = search.toLowerCase()
    return (
      inv.number.toLowerCase().includes(s) ||
      inv.invoice_clients?.name?.toLowerCase().includes(s)
    )
  })

  const handleDelete = async (id) => {
    if(!confirm('¿Eliminar esta factura permanentemente?')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if(error) toast.error('Error al eliminar')
    else {
      toast.success('Factura eliminada')
      fetchInvoices()
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'borrador': return 'bg-surface-800 text-surface-300 border-surface-700'
      case 'emitida': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'pagada': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'cancelada': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-surface-800 text-surface-300 border-surface-700'
    }
  }

  const formatCurrency = (val, cur) => {
    const symbol = cur === 'ARS' ? '$' : cur === 'EUR' ? '€' : '$'
    return `${symbol}${Number(val).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
  }

  return (
    <div className={`${hideHeader ? '' : 'p-6'} space-y-6 animate-fade-in relative max-w-[1400px] mx-auto`}>
      
      {/* Header */}
      {!hideHeader && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <FileText size={24} className="text-[#7a9e82]" />
            Facturación
          </h1>
          <p className="text-sm text-surface-400 mt-1">Gestión de comprobantes y PDF</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowClients(true)}>
            <Users size={16} /> Clientes
          </Button>
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Emisor
          </Button>
          <Button className="bg-[#7a9e82] hover:bg-[#6b8c72] text-white ml-2" onClick={() => navigate('/invoices/new')}>
            <Plus size={16} /> Nueva Factura
          </Button>
        </div>
      </div>
      )}
      {hideHeader && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowClients(true)}>
            <Users size={16} /> Clientes
          </Button>
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Emisor
          </Button>
          <Button className="bg-[#7a9e82] hover:bg-[#6b8c72] text-white ml-2" onClick={() => navigate('/invoices/new')}>
            <Plus size={16} /> Nueva Factura
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface-900/60 border border-surface-800/60 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#7a9e82]/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-sm text-surface-400 font-medium mb-2">
            <Banknote size={16} className="text-[#7a9e82]" />
            Total emitido (USD eq)
          </div>
          <div className="text-2xl font-bold text-surface-100">${metrics.total_issued.toLocaleString('es-AR', {maximumFractionDigits:0})}</div>
        </div>
        <div className="p-5 rounded-2xl bg-surface-900/60 border border-amber-500/10 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-sm text-amber-500/80 font-medium mb-2">
            <Clock size={16} />
            Pendiente de cobro
          </div>
          <div className="text-2xl font-bold text-amber-500">${metrics.pending.toLocaleString('es-AR', {maximumFractionDigits:0})}</div>
        </div>
        <div className="p-5 rounded-2xl bg-surface-900/60 border border-emerald-500/10 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-sm text-emerald-500/80 font-medium mb-2">
            <CheckCircle2 size={16} />
            Cobrado
          </div>
          <div className="text-2xl font-bold text-emerald-500">${metrics.paid.toLocaleString('es-AR', {maximumFractionDigits:0})}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o número..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:ring-2 focus:ring-[#7a9e82]/40 text-sm"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-800/80 border border-surface-700/50 text-surface-100 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#7a9e82]/40 outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="emitida">Emitida</option>
          <option value="pagada">Pagada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-10 text-center"><div className="w-6 h-6 border-2 border-[#7a9e82] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-surface-500">No se encontraron facturas matching con la búsqueda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60 bg-surface-800/30">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400">Número</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400">Vence</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400">Total</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-surface-400">Estado</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-surface-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-surface-800/30 hover:bg-surface-800/40 transition-colors group">
                    <td className="px-6 py-4 font-mono text-[#7a9e82] font-semibold">{inv.number}</td>
                    <td className="px-6 py-4 text-surface-200 font-medium">{inv.invoice_clients?.name || '-'}</td>
                    <td className="px-6 py-4 text-surface-400">{inv.issue_date ? format(parseISO(inv.issue_date), 'dd/MM/yyyy') : '-'}</td>
                    <td className="px-6 py-4 text-surface-400">{inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '-'}</td>
                    <td className="px-6 py-4 font-bold text-surface-100">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/invoices/new?id=${inv.id}`)} className="p-1.5 rounded-lg text-surface-400 hover:text-amber-400 hover:bg-surface-700" title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-700" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <InvoiceClientsModal isOpen={showClients} onClose={() => setShowClients(false)} />
    </div>
  )
}
