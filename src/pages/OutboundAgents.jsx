import { useState } from 'react'
import { MessageSquare, History, BarChart3 } from 'lucide-react'
import OutboundAgentsChat from './OutboundAgentsChat'
import FollowUps from './FollowUps'
import Metrics from './Metrics'

export default function OutboundAgents() {
  const [activeTab, setActiveTab] = useState('chat')

  const tabs = [
    { id: 'chat', label: 'Chats & Agentes', icon: MessageSquare },
    { id: 'followups', label: 'Seguimientos', icon: History },
    { id: 'metrics', label: 'Métricas', icon: BarChart3 },
  ]

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Header & Tabs */}
      <div className="shrink-0 bg-surface-900/50 border-b border-surface-800/60 flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-surface-100 flex items-center gap-2 mb-3">
            <MessageSquare size={20} className="text-primary-400" />
            Outbound Hub
          </h1>

          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-2 pb-3 text-sm font-medium transition-all relative cursor-pointer
                  ${activeTab === tab.id 
                    ? 'text-primary-400' 
                    : 'text-surface-500 hover:text-surface-300'}
                `}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-fade-in" />
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
            <OutboundAgentsChat hideHeader={true} />
          </div>
        )}
        {activeTab === 'followups' && (
          <div className="absolute inset-0 overflow-y-auto px-6 py-4">
            <FollowUps hideHeader={true} />
          </div>
        )}
        {activeTab === 'metrics' && (
          <div className="absolute inset-0 overflow-y-auto px-6 py-4">
            <Metrics hideHeader={true} />
          </div>
        )}
      </div>
    </div>
  )
}
