import { useState } from 'react'
import { useAgents, useConversations, useContacts, deleteConversationByContact, normalizePhone, getPhoneVariants, mergeContacts } from '../hooks/useMessages'
import { useRealtime } from '../hooks/useRealtime'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import ContactPanel from '../components/chat/ContactPanel'
import Toggle from '../components/ui/Toggle'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Search, Plus, Bot, PanelRightOpen, PanelRightClose, Tag, Filter } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import LabelManager from '../components/chat/LabelManager'
import { useLabels } from '../hooks/useMessages'
import toast from 'react-hot-toast'

export default function OutboundAgents() {
  const { agents, loading: agentsLoading, toggleBot, addAgent } = useAgents()
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

  // Sync selectedContact with latest data from conversations (important for bot_enabled status)
  const currentContact = conversations.find(c => c.contact?.id === selectedContact?.id)?.contact || selectedContact

  // Realtime: refresh conversations on new messages
  useRealtime('messages', null, () => {
    refetch()
  })

  const filteredConversations = conversations.filter(conv => {
    const s = search.toLowerCase()
    
    // Search match
    const matchesSearch = !search || 
      conv.contact?.name?.toLowerCase().includes(s) ||
      conv.contact?.phone?.includes(s)

    // Label match
    const matchesLabel = selectedLabelId === 'all' || 
      conv.contact?.labels?.some(l => l.id === selectedLabelId)

    return matchesSearch && matchesLabel
  })

  const handleAddAgent = async () => {
    if (!newAgentName.trim() || !newAgentSlug.trim()) return
    await addAgent(newAgentName.trim(), newAgentSlug.trim().toLowerCase().replace(/\s+/g, '-'))
    setShowAddAgent(false)
    setNewAgentName('')
    setNewAgentSlug('')
  }

  const handleAddContact = async () => {
    const rawPhone = normalizePhone(newContactPhone.trim())
    if (!rawPhone) return toast.error('El número de teléfono no es válido')
    
    try {
      const variants = getPhoneVariants(rawPhone)
      
      // 1. Find existing contacts for any of the variants
      const { data: existing, error: findError } = await supabase
        .from('contacts')
        .select('*')
        .in('phone', variants)

      if (findError) throw findError

      let targetContact = null

      if (existing && existing.length > 0) {
        // We found at least one contact
        if (existing.length > 1 && rawPhone.startsWith('54')) {
          // ARGENTINA: Multiple contacts found for variants (e.g. one with 9, one without)
          // Fusionar automáticamente
          const main = existing[0]
          const duplicate = existing[1]
          await mergeContacts(main.id, duplicate.id)
          targetContact = main
          toast.success('Contactos de Argentina fusionados automáticamente')
        } else {
          // Just one found, or international (don't auto-merge international)
          targetContact = existing[0]
          if (existing.length > 1) {
            toast.error('Se detectaron múltiples contactos para este número (Internacional). Se usará el primero.')
          }
        }
      }

      let contactId = targetContact?.id

      if (!contactId) {
        // 2. Create if not found
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

      // Success
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
    if (!confirm('¿Estás seguro de que quieres borrar todos los mensajes de esta conversación? Esta acción no se puede deshacer.')) return
    
    try {
      await deleteConversationByContact(activeAgent.id, contactId)
      if (selectedContact?.id === contactId) {
        setSelectedContact(null)
      }
      refetch()
    } catch (err) {
      console.error('Error deleting conversation:', err)
    }
  }

  if (agentsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar: agent tabs + bot toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800/60 bg-surface-900/50 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
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
                  ? 'bg-primary-600/15 text-primary-400'
                  : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-200'
                }
              `}
            >
              {agent.name}
            </button>
          ))}
          <button
            onClick={() => setShowAddAgent(true)}
            className="p-2 text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 rounded-lg transition-all cursor-pointer"
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

      {/* Main content: conversation list + chat + contact panel */}
      <div className="flex-1 flex min-h-0">
        {/* Conversation list */}
        <div className="w-80 border-r border-surface-800/60 flex flex-col shrink-0 bg-surface-900/30">
          {/* Search */}
          <div className="p-3 border-b border-surface-800/40">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
                />
              </div>
              <button
                onClick={() => setShowAddContact(true)}
                className="p-2 text-primary-400 hover:text-primary-300 bg-primary-600/10 hover:bg-primary-600/20 rounded-lg transition-all cursor-pointer shrink-0"
                title="Nueva conversación"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => setShowLabelManager(true)}
                className="p-2 text-surface-400 hover:text-surface-200 bg-surface-800/60 hover:bg-surface-800 rounded-lg transition-all cursor-pointer shrink-0"
                title="Gestionar etiquetas"
              >
                <Tag size={18} />
              </button>
            </div>

            {/* Label Filter Bar */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedLabelId('all')}
                className={`
                  px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-all border
                  ${selectedLabelId === 'all' 
                    ? 'bg-primary-600/20 text-primary-400 border-primary-500/40' 
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
                  style={{ 
                    backgroundColor: selectedLabelId === label.id ? label.color : 'transparent' 
                  }}
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

        {/* Chat window */}
        <ChatWindow 
          agent={activeAgent} 
          contact={currentContact} 
          onToggleBot={toggleContactBot}
        />

        {/* Contact panel */}
        {showContactPanel && currentContact && (
          <ContactPanel
            contact={currentContact}
            onClose={() => setShowContactPanel(false)}
            onToggleBot={toggleContactBot}
          />
        )}
      </div>

      {/* Add agent modal */}
      <Modal isOpen={showAddAgent} onClose={() => setShowAddAgent(false)} title="Agregar Agente">
        <div className="space-y-4">
          <Input
            label="Nombre del agente"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="ej: Restaurantes"
          />
          <Input
            label="Slug (identificador único)"
            value={newAgentSlug}
            onChange={(e) => setNewAgentSlug(e.target.value)}
            placeholder="ej: restaurantes"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddAgent(false)}>Cancelar</Button>
            <Button onClick={handleAddAgent}>Crear agente</Button>
          </div>
        </div>
      </Modal>

      {/* Add contact modal */}
      <Modal isOpen={showAddContact} onClose={() => {
        setShowAddContact(false)
        setContactSearch('')
      }} title="Nueva Conversación">
        <div className="space-y-4">
          {/* Picker / Search */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-300">Buscar contacto existente</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                placeholder="Escribe un nombre o teléfono..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40 transition-all"
              />
            </div>
            
            {contactSearch.trim() && (() => {
              const searchLower = contactSearch.toLowerCase()
              // Generate phone variants from the search term for fuzzy matching
              const searchDigits = contactSearch.replace(/\D/g, '')
              const searchVariants = searchDigits.length >= 6 ? getPhoneVariants(searchDigits) : []
              
              const matchingContacts = contacts.filter(c => {
                // Name match (case insensitive)
                if (c.name?.toLowerCase().includes(searchLower)) return true
                // Direct phone match
                if (c.phone?.includes(contactSearch)) return true
                // Variant phone match (fuzzy: 549... matches 54... and vice versa)
                if (searchVariants.length > 0) {
                  const contactDigits = c.phone?.replace(/\D/g, '') || ''
                  return searchVariants.some(v => {
                    const vDigits = v.replace(/\D/g, '')
                    return contactDigits.includes(vDigits) || vDigits.includes(contactDigits)
                  })
                }
                return false
              })

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
                      className="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-primary-500/10 hover:text-primary-400 transition-colors flex flex-col"
                    >
                      <span className="font-medium">{c.name || 'Sin nombre'}</span>
                      <span className="text-[10px] text-surface-500">{c.phone}</span>
                    </button>
                  ))
                }
                {matchingContacts.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-surface-500">
                    No se encontraron contactos.
                  </div>
                )}
              </div>
              )
            })()}
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-surface-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface-900 px-2 text-surface-500">O crear nuevo</span>
            </div>
          </div>

          <Input
            label="Número de teléfono (con código de país)"
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            placeholder="ej: 5491112345678"
          />
          <Input
            label="Nombre completo (opcional)"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            placeholder="ej: Juan Pérez"
          />
          <Input
            label="Email (opcional)"
            value={newContactEmail}
            onChange={(e) => setNewContactEmail(e.target.value)}
            placeholder="ej: juan@empresa.com"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => {
              setShowAddContact(false)
              setContactSearch('')
              setNewContactName('')
              setNewContactPhone('')
              setNewContactEmail('')
            }}>Cancelar</Button>
            <Button onClick={handleAddContact}>Iniciar chat</Button>
          </div>
        </div>
      </Modal>

      <LabelManager 
        isOpen={showLabelManager} 
        onClose={() => setShowLabelManager(false)} 
      />
    </div>
  )
}
