import { useState } from 'react'
import { MessageSquare, MessageCircle } from 'lucide-react'
import OutboundAgents from './OutboundAgents'
import InboundAgents from './InboundAgents'
import Tabs from '../components/ui/Tabs'

export default function Agents() {
  const [activeTab, setActiveTab] = useState('outbound')

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Header & Tabs */}
      <div className="shrink-0 bg-surface-900/50 border-b border-surface-800/60 flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2 mb-3">
            <MessageSquare size={20} className="text-primary-400" />
            Agentes
          </h1>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('outbound')}
              className={`
                flex items-center gap-2 px-2 pb-3 text-sm font-medium transition-all relative cursor-pointer
                ${activeTab === 'outbound' 
                  ? 'text-primary-400' 
                  : 'text-surface-500 hover:text-surface-300'}
              `}
            >
              <MessageSquare size={16} />
              Outbound
              {activeTab === 'outbound' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-fade-in" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`
                flex items-center gap-2 px-2 pb-3 text-sm font-medium transition-all relative cursor-pointer
                ${activeTab === 'inbound' 
                  ? 'text-emerald-400' 
                  : 'text-surface-500 hover:text-surface-300'}
              `}
            >
              <MessageCircle size={16} />
              Inbound
              {activeTab === 'inbound' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 animate-fade-in" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-surface-950 relative">
        {activeTab === 'outbound' && (
          <div className="absolute inset-0">
            <OutboundAgents hideHeader={true} />
          </div>
        )}
        {activeTab === 'inbound' && (
          <div className="absolute inset-0">
            <InboundAgents hideHeader={true} />
          </div>
        )}
      </div>
    </div>
  )
}
