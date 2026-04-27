import { MessageCircle } from 'lucide-react'
import InboundAgentsChat from './InboundAgentsChat'

export default function InboundAgents({ hideHeader = false }) {
  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Header (Simplified) */}
      {!hideHeader && (
        <div className="shrink-0 bg-surface-900/50 border-b border-surface-800/60 flex items-center px-6 py-4">
          <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2">
            <MessageCircle size={20} className="text-emerald-400" />
            Inbound Hub
          </h1>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 bg-surface-950 relative">
        <div className="absolute inset-0">
          <InboundAgentsChat />
        </div>
      </div>
    </div>
  )
}
