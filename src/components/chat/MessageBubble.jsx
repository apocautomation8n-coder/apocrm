import { format } from 'date-fns'

export default function MessageBubble({ message }) {
  const isOutbound = message.direction === 'outbound'
  const time = format(new Date(message.timestamp), 'HH:mm')

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`
          max-w-[75%] px-4 py-2.5 shadow-md
          ${isOutbound ? 'bubble-outbound' : 'bubble-inbound'}
        `}
      >
        {message.media_type === 'audio' && message.media_url ? (
          <audio controls className="max-w-[250px]" preload="none">
            <source src={message.media_url} type="audio/webm" />
            Tu navegador no soporta audio.
          </audio>
        ) : (
          <p className={`text-sm leading-relaxed ${isOutbound ? 'text-white' : 'text-surface-200'}`}>
            {message.content}
          </p>
        )}
        <p className={`text-[10px] mt-1 text-right ${isOutbound ? 'text-white/50' : 'text-surface-500'}`}>
          {time}
        </p>
      </div>
    </div>
  )
}
