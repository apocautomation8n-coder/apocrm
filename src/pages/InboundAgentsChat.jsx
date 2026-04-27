import { useState, useEffect } from 'react'
import { useAgents, useConversations, useContacts, deleteConversationByContact, normalizePhone, getPhoneVariants, mergeContacts } from '../hooks/useMessages'
import { useRealtime } from '../hooks/useRealtime'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import ContactPanel from '../components/chat/ContactPanel'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Search, Plus, PanelRightOpen, PanelRightClose, Tag } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import LabelManager from '../components/chat/LabelManager'
import { useLabels } from '../hooks/useMessages'
import toast from 'react-hot-toast'

export default function InboundAgentsChat() {
  const { agents, loading: agentsLoading, addAgent } = useAgents('inbound')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [showContactPanel, setShowContactPanel] = useState(true)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentSlug, setNewAgentSlug] = useState('')
  const [search, setSearch] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const { contacts } = useContacts()
  const [contactSearch, setContactSearch] = useState('')
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [selectedLabelId, setSelectedLabelId] = useState('all')
  const { labels } = useLabels()

  const activeAgent = selectedAgent || agents[0]
  const { conversations, loading: convsLoading, refetch, toggleContactBot, markAsReadLocally } = useConversations(activeAgent?.id)

  const currentContact = conversations.find(c => c.contact?.id === selectedContact?.id)?.contact || selectedContact

  useRealtime('messages', null, () => {
    refetch()
  })

  useEffect(() => {
    const channel = supabase
      .channel('messages-updates-reorder-inbound')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        refetch()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [refetch])

  const filteredConversations = conversations.filter(conv => {
    const s = search.toLowerCase()
    const matchesSearch = !search || 
      conv.contact?.name?.toLowerCase().includes(s) ||
      conv.contact?.phone?.includes(s)
    const matchesLabel = selectedLabelId === 'all' || 
      conv.contact?.labels?.some(l => l.id === selectedLabelId)
    return matchesSearch && matchesLabel
  })

  const handleAddAgent = async () => {
    if (!newAgentName.trim() || !newAgentSlug.trim()) return
    await addAgent(newAgentName.trim(), newAgentSlug.trim().toLowerCase().replace(/\s+/g, '-'), 'inbound')
    setShowAddAgent(false)
    setNewAgentName('')
    setNewAgentSlug('')
  }

  const handleAddContact = async () => {
    const rawPhone = normalizePhone(newContactPhone.trim())
    if (!rawPhone) return toast.error('El número de teléfono no es válido')
    
    try {
      const variants = getPhoneVariants(rawPhone)
      const { data: existing, error: findError } = await supabase
        .from('contacts')
        .select('*')
        .in('phone', variants)

      if (findError) throw findError

      let targetContact = null
      if (existing && existing.length > 0) {
        if (existing.length > 1 && rawPhone.startsWith('54')) {
          const main = existing[0]
          const duplicate = existing[1]
          await mergeContacts(main.id, duplicate.id)
          targetContact = main
        } else {
          targetContact = existing[0]
        }
      }

      let contactId = targetContact?.id
      if (!contactId) {
        const { data: newContact, error: createErr } = await supabase
          .from('contacts')
          .insert({ 
            phone: rawPhone, 
            name: newContactName.trim() || null, 
            email: newContactEmail.trim() || null,
            bot_enabled: true 
          })
          .select('id')
          .single()
        
        if (createErr) throw createErr
        contactId = newContact.id
      }

      setShowAddContact(false)
      setNewContactName('')
      setNewContactPhone('')
      setNewContactEmail('')
      setContactSearch('')
      await refetch()
      setSelectedContact({ id: contactId, name: newContactName || rawPhone, phone: rawPhone })
    } catch (err) {
      console.error('Error adding contact:', err)
      toast.error('Error al procesar el contacto')
    }
  }

  const handleDeleteConversation = async (contactId) => {
    if (!confirm('¿Estás seguro de que quieres borrar todos los mensajes de esta conversación?')) return
    try {
      await deleteConversationByContact(activeAgent.id, contactId)
      if (selectedContact?.id === contactId) setSelectedContact(null)
      refetch()
    } catch (err) {
      console.error('Error deleting conversation:', err)
    }
  }

  if (agentsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800/60 bg-surface-900/50 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {agents.length === 0 && (
            <span className="text-xs text-surface-500 px-3 py-2 italic">No hay agentes inbound creados</span>
          )}
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => {
                setSelectedAgent(agent)
                setSelectedContact(null)
              }}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap
                transition-all duration-200 cursor-pointer
                ${activeAgent?.id === agent.id
                  ? 'bg-emerald-600/15 text-emerald-400'
                  : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-200'
                }
              `}
            >
              {agent.name}
            </button>
          ))}
          <button
            onClick={() => setShowAddAgent(true)}
            className="p-2 text-surface-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
            title="Agregar Agente Inbound"
          >
            <Plus size={16} />
          </button>
        </div>

        {activeAgent && (
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setShowContactPanel(!showContactPanel)}
              className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 rounded-lg transition-all cursor-pointer"
            >
              {showContactPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-80 border-r border-surface-800/60 flex flex-col shrink-0 bg-surface-900/30">
          <div className="p-3 border-b border-surface-800/40">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
              </div>
              <button
                onClick={() => setShowAddContact(true)}
                className="p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => setShowLabelManager(true)}
                className="p-2 text-surface-400 hover:text-surface-200 bg-surface-800/60 hover:bg-surface-800 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <Tag size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedLabelId('all')}
                className={`
                  px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-all border
                  ${selectedLabelId === 'all' 
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-surface-800/40 text-surface-500 border-surface-700/30 hover:text-surface-300'
                  }
                `}
              >
                Todos
              </button>
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => setSelectedLabelId(prev => prev === label.id ? 'all' : label.id)}
                  className={`
                    px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-all border
                    ${selectedLabelId === label.id 
                      ? 'border-transparent text-white' 
                      : 'bg-surface-800/40 text-surface-500 border-surface-700/30 hover:text-surface-300'
                    }
                  `}
                  style={{ backgroundColor: selectedLabelId === label.id ? label.color : 'transparent' }}
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
          <ConversationList
            conversations={filteredConversations}
            selectedContactId={currentContact?.id}
            onSelect={(contact) => {
              setSelectedContact(contact)
              markAsReadLocally(contact.id)
            }}
            onDelete={handleDeleteConversation}
            onAdd={() => setShowAddContact(true)}
            loading={convsLoading}
          />
        </div>

        <ChatWindow 
          agent={activeAgent} 
          contact={currentContact} 
          onToggleBot={toggleContactBot}
        />

        {showContactPanel && currentContact && (
          <ContactPanel
            contact={currentContact}
            onClose={() => setShowContactPanel(false)}
            onToggleBot={toggleContactBot}
          />
        )}
      </div>

      <Modal isOpen={showAddAgent} onClose={() => setShowAddAgent(false)} title="Agregar Agente Inbound">
        <div className="space-y-4">
          <Input
            label="Nombre del agente"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="ej: Apoc Inbound"
          />
          <Input
            label="Slug (identificador único)"
            value={newAgentSlug}
            onChange={(e) => setNewAgentSlug(e.target.value)}
            placeholder="ej: apoc-inbound"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddAgent(false)}>Cancelar</Button>
            <Button onClick={handleAddAgent} className="bg-emerald-600 hover:bg-emerald-500 text-white border-none">Crear agente</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddContact} onClose={() => setShowAddContact(false)} title="Nueva Conversación Inbound">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-300">Buscar contacto existente</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Escribe un nombre o teléfono..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
              />
            </div>
            {contactSearch.trim() && (() => {
              const searchLower = contactSearch.toLowerCase()
              const matchingContacts = contacts.filter(c => 
                c.name?.toLowerCase().includes(searchLower) || c.phone?.includes(contactSearch)
              )
              return (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-700/30 bg-surface-800/40 mt-1 divide-y divide-surface-700/20">
                  {matchingContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setNewContactPhone(c.phone)
                        setNewContactName(c.name || '')
                        setContactSearch('')
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors flex flex-col"
                    >
                      <span className="font-medium">{c.name || 'Sin nombre'}</span>
                      <span className="text-[10px] text-surface-500">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
          <Input label="Número de teléfono" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
          <Input label="Nombre completo" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddContact(false)}>Cancelar</Button>
            <Button onClick={handleAddContact} className="bg-emerald-600 hover:bg-emerald-500 text-white border-none">Iniciar chat</Button>
          </div>
        </div>
      </Modal>

      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />
    </div>
  )
}
