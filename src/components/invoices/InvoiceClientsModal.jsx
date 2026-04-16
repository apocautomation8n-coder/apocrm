import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { Trash2, Pencil, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InvoiceClientsModal({ isOpen, onClose, onClientSelect }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(null)
  
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    tax_id_type: 'CUIT',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Argentina'
  })

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('invoice_clients').select('*').order('name')
    if (error) {
      toast.error('Error cargando clientes de facturación')
    } else {
      setClients(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      fetchClients()
    }
  }, [isOpen])

  const openEdit = (client) => {
    setEditingClient(client)
    setForm({
      name: client.name || '',
      legal_name: client.legal_name || '',
      tax_id: client.tax_id || '',
      tax_id_type: client.tax_id_type || 'CUIT',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || 'Argentina'
    })
  }

  const resetForm = () => {
    setEditingClient(null)
    setForm({
      name: '',
      legal_name: '',
      tax_id: '',
      tax_id_type: 'CUIT',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Argentina'
    })
  }

  const handleSave = async () => {
    if (!form.name) return toast.error('El nombre comercial es obligatorio')
    
    if (editingClient) {
      const { error } = await supabase.from('invoice_clients').update(form).eq('id', editingClient.id)
      if (error) toast.error('Error al actualizar')
      else {
        toast.success('Cliente actualizado')
        fetchClients()
        resetForm()
      }
    } else {
      const { data, error } = await supabase.from('invoice_clients').insert([form]).select().single()
      if (error) toast.error('Error al crear')
      else {
        toast.success('Cliente creado')
        fetchClients()
        resetForm()
        if (onClientSelect) onClientSelect(data)
      }
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return
    const { error } = await supabase.from('invoice_clients').delete().eq('id', id)
    if (error) toast.error('Error al eliminar (puede tener facturas asociadas)')
    else {
      toast.success('Cliente eliminado')
      fetchClients()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clientes de Facturación" size="xl">
      <div className="flex gap-6 h-[500px]">
        {/* Lista */}
        <div className="w-1/2 flex flex-col border-r border-surface-700 pr-4 overflow-y-auto">
          {loading ? (
             <div className="text-center p-4 text-surface-400">Cargando...</div>
          ) : clients.length === 0 ? (
             <div className="text-center p-4 text-surface-400">No hay clientes aún</div>
          ) : (
             <div className="space-y-2">
               {clients.map(c => (
                 <div key={c.id} className="p-3 bg-surface-800 rounded-xl border border-surface-700 flex justify-between items-center group">
                   <div 
                     className="flex-1 cursor-pointer" 
                     onClick={() => onClientSelect && onClientSelect(c)}
                   >
                     <div className="font-medium text-surface-100">{c.name}</div>
                     <div className="text-xs text-surface-400">{c.tax_id_type}: {c.tax_id || '-'}</div>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => openEdit(c)} className="p-1.5 text-surface-400 hover:text-primary-400"><Pencil size={14} /></button>
                     <button onClick={() => handleDelete(c.id)} className="p-1.5 text-surface-400 hover:text-red-400"><Trash2 size={14} /></button>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Formulario */}
        <div className="w-1/2 flex flex-col gap-3 overflow-y-auto pr-2">
          <h3 className="text-sm font-semibold text-surface-300 mb-2">
            {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <Input label="Nombre / Alias *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Tech Corp" />
          <Input label="Razón Social Legal" value={form.legal_name} onChange={e => setForm({...form, legal_name: e.target.value})} placeholder="Tech Corp S.A." />
          
          <div className="flex gap-2">
            <div className="w-1/3">
              <Select label="Tipo ID" value={form.tax_id_type} onChange={e => setForm({...form, tax_id_type: e.target.value})} options={[
                {value: 'CUIT', label: 'CUIT'},
                {value: 'RUT', label: 'RUT'},
                {value: 'NIF', label: 'NIF'},
                {value: 'EIN', label: 'EIN'},
                {value: 'Otro', label: 'Otro'}
              ]} />
            </div>
            <div className="w-2/3">
              <Input label="N° de Identificación (Tax ID)" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} placeholder="20-12345678-9" />
            </div>
          </div>

          <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <Input label="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-surface-700">
             {editingClient && (
               <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
             )}
             <Button onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
