import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK

/**
 * Normalizes a phone number.
 * For Argentina (54), it strips the '9' prefix if present to create a canonical format.
 */
export function normalizePhone(phone) {
  if (!phone) return ''
  let clean = phone.replace(/\D/g, '')
  if (clean.startsWith('549')) {
    return '54' + clean.slice(3)
  }
  return clean
}

/**
 * Returns potential variants of an Argentinian phone number (with and without 9).
 */
export function getPhoneVariants(phone) {
  const clean = phone.replace(/\D/g, '')
  if (!clean.startsWith('54')) return [clean]
  
  if (clean.startsWith('549')) {
    return [clean, '54' + clean.slice(3)]
  } else {
    return [clean, '549' + clean.slice(2)]
  }
}

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
        contacts (
          id, 
          name, 
          phone, 
          bot_enabled,
          contact_labels (
            labels (id, name, color)
          )
        )
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
        // Flatten labels from contacts -> contact_labels -> labels
        const flatLabels = msg.contacts?.contact_labels?.map(cl => cl.labels).filter(Boolean) || []
        
        contactMap[cid] = {
          contact: { ...msg.contacts, labels: flatLabels },
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

  const toggleContactBot = async (contactId, enabled) => {
    const { error } = await supabase
      .from('contacts')
      .update({ bot_enabled: enabled })
      .eq('id', contactId)
    if (error) {
      toast.error('Error actualizando estado del bot')
    } else {
      setConversations(prev => prev.map(c => 
        c.contact.id === contactId ? { ...c, contact: { ...c.contact, bot_enabled: enabled } } : c
      ))
      toast.success(enabled ? 'Bot activado para este contacto' : 'Bot desactivado para este contacto')
    }
  }

  const markAsReadLocally = useCallback((contactId) => {
    setConversations(prev => prev.map(c => 
      c.contact.id === contactId ? { ...c, unreadCount: 0 } : c
    ))
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  return { conversations, loading, refetch: fetchConversations, toggleContactBot, markAsReadLocally }
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
    setMessages(prev => {
      // Evitar duplicados por ID
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }

  return { messages, loading, refetch: fetchMessages, addMessage }
}

export async function sendOutboundMessage({ phone, agentSlug, agentId, contactId, contactName, message, mediaUrl, mediaType }) {
  // 1) Send to n8n webhook
  try {
    await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        agent_slug: agentSlug,
        contact_name: contactName || '',
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

export async function deleteConversationByContact(agentId, contactId) {
  // 1. Borrar todos los mensajes de este agente/contacto
  const { error: msgError } = await supabase
    .from('messages')
    .delete()
    .eq('agent_id', agentId)
    .eq('contact_id', contactId)

  if (msgError) {
    toast.error('Error al borrar la conversación')
    throw msgError
  }

  // 2. Borrar todos los seguimientos de este agente/contacto
  // Así no reaparece en métricas ni el bot le vuelve a escribir
  await supabase
    .from('follow_ups')
    .delete()
    .eq('agent_id', agentId)
    .eq('contact_id', contactId)

  toast.success('Conversación borrada')
}

export function useContacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching contacts:', error)
    } else {
      setContacts(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  return { contacts, loading, refetch: fetchContacts }
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

export function useLabels() {
  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLabels = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .order('name', { ascending: true })
    if (error) {
      console.error('Error fetching labels:', error)
    } else {
      setLabels(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLabels() }, [fetchLabels])

  const addLabel = async (name, color) => {
    const { data, error } = await supabase
      .from('labels')
      .insert({ name, color })
      .select()
      .single()
    if (!error) setLabels(prev => [...prev, data])
    return { data, error }
  }

  const deleteLabel = async (id) => {
    const { error } = await supabase.from('labels').delete().eq('id', id)
    if (!error) setLabels(prev => prev.filter(l => l.id !== id))
    return { error }
  }

  return { labels, loading, refetch: fetchLabels, addLabel, deleteLabel }
}

export async function addLabelToContact(contactId, labelId) {
  const { error } = await supabase
    .from('contact_labels')
    .insert({ contact_id: contactId, label_id: labelId })
  return { error }
}

export async function removeLabelFromContact(contactId, labelId) {
  const { error } = await supabase
    .from('contact_labels')
    .delete()
    .eq('contact_id', contactId)
    .eq('label_id', labelId)
  return { error }
}

/**
 * Merges a source contact into a target contact.
 * Moves all related data and deletes the duplicate.
 */
export async function mergeContacts(targetId, sourceId) {
  console.log(`Merging contact ${sourceId} into ${targetId}`)
  
  // 1. Update messages
  const { error: msgErr } = await supabase
    .from('messages')
    .update({ contact_id: targetId })
    .eq('contact_id', sourceId)
  if (msgErr) console.error('Error merging messages:', msgErr)

  // 2. Update pipeline cards
  const { error: cardErr } = await supabase
    .from('pipeline_cards')
    .update({ contact_id: targetId })
    .eq('contact_id', sourceId)
  if (cardErr) console.error('Error merging cards:', cardErr)

  // 3. Update follow ups
  const { error: fuErr } = await supabase
    .from('follow_ups')
    .update({ contact_id: targetId })
    .eq('contact_id', sourceId)
  if (fuErr) console.error('Error merging followups:', fuErr)

  // 4. Update labels
  const { data: sourceLabels } = await supabase.from('contact_labels').select('label_id').eq('contact_id', sourceId)
  if (sourceLabels?.length) {
    for (const l of sourceLabels) {
      // Direct insert, ignore if already exists
      await supabase.from('contact_labels').insert({ contact_id: targetId, label_id: l.label_id })
    }
  }

  // 5. Delete source contact
  const { error: delErr } = await supabase.from('contacts').delete().eq('id', sourceId)
  if (delErr) console.error('Error deleting merged contact:', delErr)

  return { success: !delErr }
}
