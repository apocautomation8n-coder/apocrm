import { useState, useRef } from 'react'
import { Send, Mic, Square, Loader2 } from 'lucide-react'
import { sendOutboundMessage, uploadAudio } from '../../hooks/useMessages'
import toast from 'react-hot-toast'

export default function MessageInput({ agentId, agentSlug, contact, onMessageSent }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    const msg = text.trim()
    setText('')
    setSending(true)

    try {
      const data = await sendOutboundMessage({
        phone: contact.phone,
        agentSlug,
        agentId,
        contactId: contact.id,
        message: msg,
        mediaType: 'text',
      })
      onMessageSent(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        setSending(true)
        try {
          const publicUrl = await uploadAudio(blob)
          const data = await sendOutboundMessage({
            phone: contact.phone,
            agentSlug,
            agentId,
            contactId: contact.id,
            message: '',
            mediaUrl: publicUrl,
            mediaType: 'audio',
          })
          onMessageSent(data)
          toast.success('Audio enviado')
        } catch (err) {
          console.error(err)
        } finally {
          setSending(false)
        }
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      toast.error('No se pudo acceder al micrófono')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="px-4 py-3 border-t border-surface-800/60 bg-surface-900/80">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            id="message-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            disabled={recording || sending}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none text-sm disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Audio button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={sending || text.trim().length > 0}
          className={`
            p-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
            ${recording
              ? 'bg-red-500 text-white animate-pulse-soft'
              : 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'
            }
          `}
        >
          {recording ? <Square size={18} /> : <Mic size={18} />}
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2.5 rounded-xl gradient-primary text-white shadow-lg shadow-primary-600/25 hover:shadow-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {recording && (
        <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Grabando audio... Click para detener
        </div>
      )}
    </div>
  )
}
