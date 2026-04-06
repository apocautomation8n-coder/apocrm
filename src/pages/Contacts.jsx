import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { Users, Search, Plus, Pencil, Trash2, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const navigate = useNavigate()

  const fetchContacts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error cargando contactos')
    else setContacts(data)
    setLoading(false)
  }

  useEffect(() => { fetchContacts() }, [])

  const filtered = contacts.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.name?.toLowerCase().includes(s) || c.phone?.includes(s)
  })

  const handleSave = async () => {
    if (!form.phone.trim()) return toast.error('El teléfono es obligatorio')

    if (editing) {
      const { error } = await supabase.from('contacts').update({ name: form.name, phone: form.phone, email: form.email }).eq('id', editing.id)
      if (error) return toast.error('Error actualizando contacto')
      toast.success('Contacto actualizado')
    } else {
      const { error } = await supabase.from('contacts').insert({ name: form.name, phone: form.phone, email: form.email })
      if (error) return toast.error(error.message.includes('duplicate') ? 'Ese teléfono ya existe' : 'Error creando contacto')
      toast.success('Contacto creado')
    }

    setShowModal(false)
    setEditing(null)
    setForm({ name: '', phone: '', email: '' })
    fetchContacts()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contacto? Al hacerlo se borrarán todos sus mensajes y datos asociados. Esta acción no se puede deshacer.')) return
    
    try {
      // 1. Delete related messages
      await supabase.from('messages').delete().eq('contact_id', id)
      
      // 2. Delete related pipeline cards
      await supabase.from('pipeline_cards').delete().eq('contact_id', id)
      
      // 3. Delete the contact
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      
      if (error) {
        throw error
      }
      
      toast.success('Contacto y datos asociados eliminados')
      fetchContacts()
    } catch (err) {
      console.error('Error deleting contact:', err)
      toast.error('Error al eliminar el contacto')
    }
  }

  const openEdit = (contact) => {
    setEditing(contact)
    setForm({ name: contact.name || '', phone: contact.phone, email: contact.email || '' })
    setShowModal(true)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <Users size={24} className="text-primary-400" />
            Contactos
          </h1>
          <p className="text-sm text-surface-400 mt-1">{contacts.length} contactos registrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '' }); setShowModal(true) }}>
          <Plus size={16} />
          Agregar contacto
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-900/80 border border-surface-800/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-surface-500">No se encontraron contactos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Teléfono</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.id} className="border-b border-surface-800/30 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {(contact.name || contact.phone || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-surface-200 font-medium">{contact.name || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-surface-300 font-mono text-xs">{contact.phone}</td>
                    <td className="px-5 py-3.5">
                      {contact.email ? (
                        <span className="text-xs text-surface-400">{contact.email}</span>
                      ) : (
                        <span className="text-[10px] text-surface-600 italic">No registrado</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-surface-400 text-xs">{format(new Date(contact.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate('/agents')}
                          className="p-1.5 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all cursor-pointer"
                          title="Ver conversaciones"
                        >
                          <MessageSquare size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(contact)}
                          className="p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Eliminar"
                        >
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

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar contacto' : 'Agregar contacto'}>
        <div className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Juan Pérez" />
          <Input label="Teléfono" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="5491112345678" />
          <Input label="Email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@empresa.com" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
