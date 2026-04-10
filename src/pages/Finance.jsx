import { useState } from 'react'
import { DollarSign, CreditCard, TrendingDown } from 'lucide-react'
import FinanceProjects from './FinanceProjects'
import Plans from './Plans'
import FinanceExpenses from './FinanceExpenses'

export default function Finance() {
  const [activeTab, setActiveTab] = useState('projects')

  const tabs = [
    { id: 'projects', label: 'Proyectos', icon: DollarSign },
    { id: 'plans', label: 'Mensualidades', icon: CreditCard },
    { id: 'expenses', label: 'Egresos', icon: TrendingDown },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
          <DollarSign size={24} className="text-primary-400" />
          Finanzas
        </h1>
        <p className="text-sm text-surface-400 mt-1">Gestión integral de ingresos, mantenimientos y egresos</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-surface-800/60">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative
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

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'projects' && <FinanceProjects hideHeader={true} />}
        {activeTab === 'plans' && <Plans hideHeader={true} />}
        {activeTab === 'expenses' && <FinanceExpenses hideHeader={true} />}
      </div>
    </div>
  )
}
