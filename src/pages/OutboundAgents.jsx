import { useState } from 'react'
import { useAgents, useConversations } from '../hooks/useMessages'
import { useRealtime } from '../hooks/useRealtime'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import ContactPanel from '../components/chat/ContactPanel'
import Toggle from '../components/ui/Toggle'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Search, Plus, Bot, PanelRightOpen, PanelRightClose } from 'lucide-react'

export default function OutboundAgents() {
  const { agents, loading: agentsLoading, toggleBot, addAgent } = useAgents()
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [showContactPanel, setShowContactPanel] = useState(true)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentSlug, setNewAgentSlug] = useState('')
  const [search, setSearch] = useState('')

  const activeAgent = selectedAgent || agents[0]
  const { conversations, loading: convsLoading, refetch } = useConversations(activeAgent?.id)

  // Realtime: refresh conversations on new messages
  useRealtime('messages', null, () => {
    refetch()
  })

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      conv.contact?.name?.toLowerCase().includes(s) ||
      conv.contact?.phone?.includes(s)
    )
  })

  const handleAddAgent = async () => {
    if (!newAgentName.trim() || !newAgentSlug.trim()) return
    await addAgent(newAgentName.trim(), newAgentSlug.trim().toLowerCase().replace(/\s+/g, '-'))
    setShowAddAgent(false)
    setNewAgentName('')
    setNewAgentSlug('')
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
            <div className="flex items-center gap-2">
              <Bot size={16} className={activeAgent.bot_enabled ? 'text-emerald-400' : 'text-surface-500'} />
              <Toggle
                enabled={activeAgent.bot_enabled}
                onChange={(val) => toggleBot(activeAgent.id, val)}
                size="sm"
              />
              <span className={`text-xs font-medium ${activeAgent.bot_enabled ? 'text-emerald-400' : 'text-surface-500'}`}>
                {activeAgent.bot_enabled ? 'Bot ON' : 'Bot OFF'}
              </span>
            </div>
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
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversación..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-800/60 border border-surface-700/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
              />
            </div>
          </div>
          <ConversationList
            conversations={filteredConversations}
            selectedContactId={selectedContact?.id}
            onSelect={setSelectedContact}
            loading={convsLoading}
          />
        </div>

        {/* Chat window */}
        <ChatWindow agent={activeAgent} contact={selectedContact} />

        {/* Contact panel */}
        {showContactPanel && selectedContact && (
          <ContactPanel
            contact={selectedContact}
            onClose={() => setShowContactPanel(false)}
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
    </div>
  )
}
