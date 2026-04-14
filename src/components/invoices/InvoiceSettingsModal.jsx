import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import toast from 'react-hot-toast'
import { Building } from 'lucide-react'

export default function InvoiceSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    company_name: '',
    legal_name: '',
    cuit: '',
    address: '',
    city: '',
    country: 'Argentina',
    email: '',
    phone: '',
    invoice_prefix: 'FAC',
    next_number: 1,
    bank_info: '',
    logo_url: '' // We'll handle this as a simple valid URL input for now, or storage upload later
  })

  useEffect(() => {
    const fetchSettings = async () => {
      if (!isOpen) return
      setLoading(true)
      const { data, error } = await supabase.from('invoice_settings').select('*').limit(1).single()
      
      if (!error && data) {
        setSettings(data)
        setForm({
          company_name: data.company_name || '',
          legal_name: data.legal_name || '',
          cuit: data.cuit || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'Argentina',
          email: data.email || '',
          phone: data.phone || '',
          invoice_prefix: data.invoice_prefix || 'FAC',
          next_number: data.next_number || 1,
          bank_info: data.bank_info || '',
          logo_url: data.logo_url || ''
        })
      }
      setLoading(false)
    }

    fetchSettings()
  }, [isOpen])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('invoice_settings').update(form).eq('id', settings.id)
    
    if (error) {
      toast.error('Error al guardar configuración')
    } else {
      toast.success('Configuración guardada')
      onClose()
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const { data, error } = await supabase.storage
      .from('public-assets') // Make sure this bucket exists and is public
      .upload(`logos/${Date.now()}_${file.name}`, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      toast.error('Error subiendo logo. Revisa permisos o URL externa en su lugar.')
    } else {
      const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(data.path)
      setForm({ ...form, logo_url: publicUrl })
      toast.success('Logo subido')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración del Emisor">
      {loading ? (
        <div className="p-8 text-center text-surface-400">Cargando...</div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          <div className="flex items-center gap-3 bg-primary-500/10 p-4 rounded-xl border border-primary-500/20">
            <Building size={24} className="text-primary-400" />
            <div>
              <h3 className="text-sm font-semibold text-primary-200">Datos de tu Empresa</h3>
              <p className="text-xs text-primary-400/80">Esta información aparecerá en todas las facturas generadas.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre Comercial *" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="Apoc Automation" />
            <Input label="Razón Social Legal" value={form.legal_name} onChange={e => setForm({...form, legal_name: e.target.value})} placeholder="Apoc Automation S.R.L." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="CUIT / Tax ID" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
            <Input label="Email de Contacto" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            <Input label="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Ciudad / Estado" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            <Input label="País" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
          </div>

          <hr className="border-surface-700" />

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1">URL del Logo (Opcional)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={form.logo_url} 
                onChange={e => setForm({...form, logo_url: e.target.value})} 
                placeholder="https://..." 
                className="flex-1 bg-surface-900 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2"
              />
            </div>
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo Preview" className="h-10 mt-2 object-contain" />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1">Datos Bancarios para el pie de Factura</label>
            <textarea
              value={form.bank_info}
              onChange={e => setForm({...form, bank_info: e.target.value})}
              className="w-full bg-surface-900 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 min-h-[80px]"
              placeholder="Banco Galicia&#10;CBU: 000000000000000000&#10;Alias: APOC.AUTO"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-surface-800 p-4 rounded-xl">
            <Input label="Prefijo de Factura" value={form.invoice_prefix} onChange={e => setForm({...form, invoice_prefix: e.target.value})} placeholder="FAC" />
            <Input label="Siguiente Número" type="number" value={form.next_number} onChange={e => setForm({...form, next_number: parseInt(e.target.value) || 1})} />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} loading={saving}>Guardar Configuración</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
