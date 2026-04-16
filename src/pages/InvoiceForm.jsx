import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { ArrowLeft, Save, Download, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import InvoicePDF from '../components/invoices/InvoicePDF'
import InvoiceClientsModal from '../components/invoices/InvoiceClientsModal'

export default function InvoiceForm() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState(null)
  const [clients, setClients] = useState([])
  const [showClientsModal, setShowClientsModal] = useState(false)

  const [form, setForm] = useState({
    client_id: '',
    number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    currency: 'USD',
    exchange_rate: 1,
    iva_percent: 21,
    discount_amount: 0,
    status: 'borrador',
    payment_method: 'Transferencia',
    notes: ''
  })

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0 }
  ])

  useEffect(() => {
    fetchInitialData()
  }, [id])

  const fetchInitialData = async () => {
    setLoading(true)
    
    // Fetch Settings
    const { data: setts } = await supabase.from('invoice_settings').select('*').single()
    if(setts) setSettings(setts)

    // Fetch Clients
    const { data: cli } = await supabase.from('invoice_clients').select('*').order('name')
    if(cli) setClients(cli)

    // If Editing
    if (id) {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
      if (inv) {
        setForm({
          client_id: inv.client_id,
          number: inv.number,
          issue_date: inv.issue_date,
          due_date: inv.due_date || '',
          currency: inv.currency,
          exchange_rate: inv.exchange_rate,
          iva_percent: inv.iva_percent,
          discount_amount: inv.discount_amount,
          status: inv.status,
          payment_method: inv.payment_method || '',
          notes: inv.notes || ''
        })
        const { data: invItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position')
        if (invItems && invItems.length > 0) {
          setItems(invItems)
        }
      }
    } else {
      // New Invoice - use next number from settings
      if(setts) {
        setForm(f => ({...f, number: `${setts.invoice_prefix}-${String(setts.next_number).padStart(4, '0')}`}))
      }
    }
    
    setLoading(false)
  }

  // Derived calculations
  const calcSubtotal = () => items.reduce((acc, current) => acc + (current.quantity * current.unit_price), 0)
  const calcTotal = () => {
    const sub = calcSubtotal()
    const desc = parseFloat(form.discount_amount) || 0
    const ivaAmt = ((sub - desc) * (parseFloat(form.iva_percent) || 0)) / 100
    return (sub - desc) + ivaAmt
  }
  const calcIvaAmt = () => {
    const sub = calcSubtotal()
    const desc = parseFloat(form.discount_amount) || 0
    return ((sub - desc) * (parseFloat(form.iva_percent) || 0)) / 100
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  const removeItem = (index) => {
    if(items.length === 1) return toast.error('Debe haber al menos un ítem')
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleSave = async () => {
    if (!form.client_id) return toast.error('Selecciona un cliente')
    if (!form.number) return toast.error('El número de factura es obligatorio')
    
    // Validate items
    if (items.some(i => !i.description)) return toast.error('Todos los ítems deben tener descripción')

    setLoading(true)
    
    const subtotal = calcSubtotal()
    const iva_amount = calcIvaAmt()
    const total = calcTotal()
    
    const invoiceData = {
      ...form,
      due_date: form.due_date || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
      subtotal,
      iva_amount,
      total
    }

    try {
      let createdInvoiceId = id

      if (id) {
        // Update Invoice
        const { error: invErr } = await supabase.from('invoices').update(invoiceData).eq('id', id)
        if(invErr) throw invErr
        
        // Delete old items and insert new (simple array sync)
        await supabase.from('invoice_items').delete().eq('invoice_id', id)
      } else {
        // Insert Invoice
        const { data: newInv, error: invErr } = await supabase.from('invoices').insert([invoiceData]).select().single()
        if(invErr) throw invErr
        createdInvoiceId = newInv.id

        // Auto increment settings
        if(settings) {
          await supabase.from('invoice_settings').update({ next_number: settings.next_number + 1 }).eq('id', settings.id)
        }
      }

      // Insert Items
      const itemsToInsert = items.map((it, idx) => ({
        invoice_id: createdInvoiceId,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        position: idx
      }))
      const { error: itemErr } = await supabase.from('invoice_items').insert(itemsToInsert)
      if(itemErr) throw itemErr

      toast.success(id ? 'Factura actualizada' : 'Factura generada')
      navigate('/invoices')
      
    } catch (e) {
      console.error('Save invoice error:', e)
      toast.error(e.message || 'Error al guardar factura')
    }
    setLoading(false)
  }

  const selectedClient = clients.find(c => c.id === form.client_id)

  const invoiceForRecalculation = {
    ...form,
    subtotal: calcSubtotal(),
    iva_amount: calcIvaAmt(),
    total: calcTotal()
  }

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col animate-fade-in relative max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-100 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">{id ? 'Editar Factura' : 'Nueva Factura'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Download PDF button only functional because we dynamically generate it */}
          <PDFDownloadLink
            document={<InvoicePDF invoice={invoiceForRecalculation} settings={settings} client={selectedClient} items={items} />}
            fileName={`${form.number}_${selectedClient?.name?.replace(/ /g, '') || 'Factura'}.pdf`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 text-sm font-medium transition-colors"
          >
            {({ loading: pdfLoading }) => pdfLoading ? 'Generando PDF...' : <><Download size={16} /> Descargar PDF</>}
          </PDFDownloadLink>
          <Button onClick={handleSave} loading={loading} className="bg-[#7a9e82] hover:bg-[#6b8c72] text-white">
            <Save size={16} /> {id ? 'Guardar Cambios' : 'Emitir Factura'}
          </Button>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Formulario (Left) */}
        <div className="w-[45%] flex flex-col gap-6 overflow-y-auto pr-4 thin-scrollbar">
          
          {/* Cliente */}
          <div className="bg-surface-900/60 p-5 rounded-2xl border border-surface-800/60">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-surface-200">Cliente *</label>
              <button 
                onClick={() => setShowClientsModal(true)}
                className="text-xs text-[#7a9e82] hover:text-[#6b8c72] font-semibold flex items-center gap-1"
              >
                <Plus size={12} /> Nuevo Cliente
              </button>
            </div>
            <select
              value={form.client_id}
              onChange={e => setForm({...form, client_id: e.target.value})}
              className="w-full bg-surface-950 border border-surface-700/50 text-surface-100 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#7a9e82]/40"
            >
              <option value="">Selecciona un cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.tax_id ? `- ${c.tax_id_type}: ${c.tax_id}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Core Info */}
          <div className="bg-surface-900/60 p-5 rounded-2xl border border-surface-800/60 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-surface-300 mb-1">Número</label>
              <input value={form.number} onChange={e => setForm({...form, number: e.target.value})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-300 mb-1">Fecha Emisión</label>
              <input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-300 mb-1">Moneda</label>
              <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2">
                <option value="USD">USD ($)</option>
                <option value="ARS">ARS ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-300 mb-1">Vencimiento</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" />
            </div>
          </div>

          {/* Items */}
          <div className="bg-surface-900/60 p-5 rounded-2xl border border-surface-800/60">
            <h3 className="text-sm font-bold text-surface-200 mb-4 border-b border-surface-800 pb-2">Ítems de Factura</h3>
            
            <div className="flex flex-col gap-3">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-end group">
                  <div className="flex-1">
                    <label className="block text-[10px] text-surface-500 mb-1 uppercase tracking-wider">Descripción</label>
                    <input value={it.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" placeholder="Desarrollo Web" />
                  </div>
                  <div className="w-16">
                    <label className="block text-[10px] text-surface-500 mb-1 uppercase tracking-wider">Cant.</label>
                    <input type="number" min="0.01" step="0.01" value={it.quantity} onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value)||0)} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-2 py-2 text-center" />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-surface-500 mb-1 uppercase tracking-wider">Precio U.</label>
                    <input type="number" step="0.01" value={it.unit_price} onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value)||0)} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-2 py-2 text-right" />
                  </div>
                  <button onClick={() => removeItem(idx)} className="pb-2 text-surface-500 hover:text-red-400 opacity-50 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addItem} className="mt-4 text-xs font-semibold text-[#7a9e82] hover:text-[#6b8c72] flex items-center gap-1">
              <Plus size={14} /> Añadir Ítem
            </button>
          </div>

          {/* Totals & Options */}
          <div className="bg-surface-900/60 p-5 rounded-2xl border border-surface-800/60 grid grid-cols-2 gap-x-6 gap-y-4">
            
            <div>
              <label className="block text-xs font-bold text-surface-300 mb-1">IVA (%)</label>
              <select value={form.iva_percent} onChange={e => setForm({...form, iva_percent: parseFloat(e.target.value)})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2">
                <option value={0}>0%</option>
                <option value={10.5}>10.5%</option>
                <option value={21}>21%</option>
                <option value={27}>27%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-surface-300 mb-1">Descuento ({form.currency})</label>
              <input type="number" step="0.01" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: parseFloat(e.target.value)||0})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" />
            </div>

            <div className="col-span-2 flex items-center justify-between bg-surface-950 p-4 rounded-xl border border-surface-700">
              <span className="text-surface-200 font-bold uppercase tracking-wider text-sm">Total {form.currency}:</span>
              <span className="text-2xl font-bold text-[#7a9e82]">
                 {form.currency==='ARS'?'$':form.currency==='EUR'?'€':'$'}
                 {calcTotal().toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}
              </span>
            </div>

            <div className="col-span-2">
               <label className="block text-xs font-bold text-surface-300 mb-1">Método de Cobro (Pie de Factura)</label>
               <input value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" placeholder="Transferencia Bancaria" />
            </div>
            
            <div className="col-span-2">
               <label className="block text-xs font-bold text-surface-300 mb-1">Notas Adicionales</label>
               <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2" placeholder="Aclaraciones al cliente..." />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-surface-300 mb-1">Estado de Factura</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-surface-950 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2">
                <option value="borrador">Borrador</option>
                <option value="emitida">Emitida (Pendiente de Cobro)</option>
                <option value="pagada">Pagada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

          </div>
        </div>

        {/* Preview PDF (Right) */}
        <div className="flex-1 bg-surface-800 rounded-2xl overflow-hidden border border-surface-700 flex flex-col">
          <div className="bg-surface-900 border-b border-surface-700 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">Preview del PDF</span>
            <span className="text-[10px] text-surface-500">Actualización en tiempo real</span>
          </div>
          <div className="flex-1">
             <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
                <InvoicePDF invoice={invoiceForRecalculation} settings={settings} client={selectedClient} items={items} />
             </PDFViewer>
          </div>
        </div>
      </div>

      {showClientsModal && (
        <InvoiceClientsModal
          isOpen={showClientsModal}
          onClose={() => setShowClientsModal(false)}
          onClientSelect={(c) => {
            setForm({...form, client_id: c.id});
            setShowClientsModal(false);
            // Refresh clients list
            supabase.from('invoice_clients').select('*').order('name').then(({data}) => setClients(data||[]))
          }}
        />
      )}
    </div>
  )
}
