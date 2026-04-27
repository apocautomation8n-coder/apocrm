import { useState } from 'react'
import { MessageCircle, History, BarChart3 } from 'lucide-react'
import InboundAgentsChat from './InboundAgentsChat'
import FollowUps from './FollowUps'
import Metrics from './Metrics'

export default function InboundAgents({ hideHeader = false }) {
  const [activeTab, setActiveTab] = useState('chat')

  const tabs = [
    { id: 'chat', label: 'Chats & Agentes', icon: MessageCircle },
    { id: 'followups', label: 'Seguimientos', icon: History },
    { id: 'metrics', label: 'Métricas', icon: BarChart3 },
  ]

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Header & Tabs */}
      <div className="shrink-0 bg-surface-900/50 border-b border-surface-800/60 flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-6">
          {!hideHeader && (
            <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2 mb-3">
              <MessageCircle size={20} className="text-emerald-400" />
              Inbound Hub
            </h1>
          )}

          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-2 pb-3 text-sm font-medium transition-all relative cursor-pointer
                  ${activeTab === tab.id 
                    ? 'text-emerald-400' 
                    : 'text-surface-500 hover:text-surface-300'}
                `}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 animate-fade-in" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-surface-950 relative">
        {activeTab === 'chat' && (
          <div className="absolute inset-0">
            <InboundAgentsChat />
          </div>
        )}
        {activeTab === 'followups' && (
          <div className="absolute inset-0 overflow-y-auto px-6 py-4">
            <FollowUps hideHeader={true} agentType="inbound" />
          </div>
        )}
        {activeTab === 'metrics' && (
          <div className="absolute inset-0 overflow-y-auto px-6 py-4">
            <Metrics hideHeader={true} agentType="inbound" />
          </div>
        )}
      </div>
    </div>
  )
}
