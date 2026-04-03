import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK

export function useAgents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
    if (error) {
      toast.error('Error cargando agentes')
      console.error(error)
    } else {
      setAgents(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  const toggleBot = async (agentId, enabled) => {
    const { error } = await supabase
      .from('agents')
      .update({ bot_enabled: enabled })
      .eq('id', agentId)
    if (error) {
      toast.error('Error actualizando estado del bot')
    } else {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, bot_enabled: enabled } : a))
      toast.success(enabled ? 'Bot activado' : 'Bot desactivado')
    }
  }

  const addAgent = async (name, slug) => {
    const { data, error } = await supabase
      .from('agents')
      .insert({ name, slug })
      .select()
      .single()
    if (error) {
      toast.error('Error creando agente')
    } else {
      setAgents(prev => [...prev, data])
      toast.success('Agente creado')
    }
    return { data, error }
  }

  return { agents, loading, toggleBot, addAgent, refetch: fetchAgents }
}

export function useConversations(agentId) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    if (!agentId) return
    setLoading(true)

    // Get all distinct contacts for this agent
    const { data: msgs, error } = await supabase
      .from('messages')
      .select(`
        contact_id,
        content,
        direction,
        media_type,
        timestamp,
        is_read,
        contacts (id, name, phone)
      `)
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // Group by contact, take last message
    const contactMap = {}
    let unread = 0
    msgs.forEach(msg => {
      const cid = msg.contact_id
      if (!contactMap[cid]) {
        contactMap[cid] = {
          contact: msg.contacts,
          lastMessage: msg.content || (msg.media_type === 'audio' ? '🎵 Audio' : ''),
          lastDirection: msg.direction,
          lastTimestamp: msg.timestamp,
          unreadCount: 0,
        }
      }
      if (!msg.is_read && msg.direction === 'inbound') {
        contactMap[cid].unreadCount++
        unread++
      }
    })

    const sorted = Object.values(contactMap).sort(
      (a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    )
    setConversations(sorted)
    setLoading(false)
  }, [agentId])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  return { conversations, loading, refetch: fetchConversations }
}

export function useMessages(agentId, contactId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    if (!agentId || !contactId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('agent_id', agentId)
      .eq('contact_id', contactId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setMessages(data)
    }
    setLoading(false)

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('agent_id', agentId)
      .eq('contact_id', contactId)
      .eq('direction', 'inbound')
      .eq('is_read', false)
  }, [agentId, contactId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const addMessage = (msg) => {
    setMessages(prev => [...prev, msg])
  }

  return { messages, loading, refetch: fetchMessages, addMessage }
}

export async function sendOutboundMessage({ phone, agentSlug, agentId, contactId, message, mediaUrl, mediaType }) {
  // 1) Send to n8n webhook
  try {
    await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        agent_slug: agentSlug,
        message: message || '',
        media_url: mediaUrl || null,
        media_type: mediaType || 'text',
      }),
    })
  } catch (err) {
    console.error('Webhook error:', err)
    toast.error('Error enviando al webhook')
    throw err
  }

  // 2) Save to Supabase
  const { data, error } = await supabase
    .from('messages')
    .insert({
      agent_id: agentId,
      contact_id: contactId,
      direction: 'outbound',
      content: message || '',
      media_url: mediaUrl || null,
      media_type: mediaType || 'text',
      is_read: true,
    })
    .select()
    .single()

  if (error) {
    toast.error('Error guardando mensaje')
    throw error
  }

  return data
}

export async function uploadAudio(blob) {
  const fileName = `audio_${Date.now()}.webm`
  const { data, error } = await supabase.storage
    .from('audio-messages')
    .upload(fileName, blob, {
      contentType: 'audio/webm',
      cacheControl: '3600',
    })

  if (error) {
    toast.error('Error subiendo audio')
    throw error
  }

  const { data: { publicUrl } } = supabase.storage
    .from('audio-messages')
    .getPublicUrl(data.path)

  return publicUrl
}
