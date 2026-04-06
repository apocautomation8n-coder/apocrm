import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { useMessages } from '../../hooks/useMessages'
import { useRealtime } from '../../hooks/useRealtime'
import { MessageSquare, Bot } from 'lucide-react'
import Toggle from '../ui/Toggle'

export default function ChatWindow({ agent, contact, onToggleBot }) {
  const { messages, loading, addMessage } = useMessages(agent?.id, contact?.id)
  const bottomRef = useRef(null)

  // Realtime: listen for new messages for this agent + contact
  useRealtime('messages', { filter: `agent_id=eq.${agent?.id}` }, (newMsg) => {
    if (newMsg.contact_id === contact?.id) {
      addMessage(newMsg)
    }
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950/50">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-surface-600" />
          </div>
          <p className="text-surface-500 text-sm">Seleccioná una conversación</p>
          <p className="text-surface-600 text-xs mt-1">para ver los mensajes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-surface-800/60 bg-surface-900/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {(contact.name || contact.phone || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-100">{contact.name || contact.phone}</p>
            <p className="text-xs text-surface-500">{contact.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Bot size={16} className={contact.bot_enabled ? 'text-emerald-400' : 'text-surface-500'} />
          <Toggle
            enabled={contact.bot_enabled ?? true}
            onChange={(val) => onToggleBot?.(contact.id, val)}
            size="sm"
          />
          <span className={`text-[10px] font-medium uppercase tracking-wider ${contact.bot_enabled ? 'text-emerald-400' : 'text-surface-500'}`}>
            {contact.bot_enabled ? 'Bot ON' : 'Bot OFF'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-surface-950/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-600 text-sm">No hay mensajes aún</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        agentId={agent.id}
        agentSlug={agent.slug}
        contact={contact}
        onMessageSent={addMessage}
      />
    </div>
  )
}
