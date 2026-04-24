import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DollarSign, CreditCard, TrendingDown, BarChart3, Wallet, Calculator, TrendingUp, FileText } from 'lucide-react'
import FinanceDashboard from './FinanceDashboard'
import FinanceProjects from './FinanceProjects'
import FinanceIncomes from './FinanceIncomes'
import Plans from './Plans'
import FinanceExpenses from './FinanceExpenses'
import FinanceCash from './FinanceCash'
import CurrencyConverter from './CurrencyConverter'
import Invoices from './Invoices'
import MonthlyReportNotification from '../components/finance/MonthlyReportNotification'

export default function Finance() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard')
  const [showManualReport, setShowManualReport] = useState(false)

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'cash', label: 'Caja', icon: Wallet },
    { id: 'incomes', label: 'Ingresos', icon: TrendingUp },
    { id: 'projects', label: 'Proyectos', icon: DollarSign },
    { id: 'plans', label: 'Mensualidades', icon: CreditCard },
    { id: 'expenses', label: 'Egresos', icon: TrendingDown },
    { id: 'invoices', label: 'Facturas', icon: FileText },
    { id: 'converter', label: 'Conversión', icon: Calculator },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <MonthlyReportNotification forceOpen={showManualReport} onCloseManual={() => setShowManualReport(false)} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <DollarSign size={24} className="text-primary-400" />
            Finanzas
          </h1>
          <p className="text-sm text-surface-400 mt-1">Gestión integral de ingresos, mantenimientos y egresos</p>
        </div>
        
        <button 
          onClick={() => setShowManualReport(true)}
          className="flex items-center gap-2 px-3 py-2 bg-surface-800/80 hover:bg-surface-700/80 text-surface-200 text-sm font-medium rounded-xl border border-surface-700 transition-colors cursor-pointer"
        >
          <FileText size={16} className="text-primary-400" />
          <span className="hidden sm:inline">Reporte del Mes</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-surface-800/60 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative whitespace-nowrap cursor-pointer
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
        {activeTab === 'dashboard' && <FinanceDashboard />}
        {activeTab === 'cash' && <FinanceCash hideHeader={true} />}
        {activeTab === 'incomes' && <FinanceIncomes hideHeader={true} />}
        {activeTab === 'projects' && <FinanceProjects hideHeader={true} />}
        {activeTab === 'plans' && <Plans hideHeader={true} />}
        {activeTab === 'expenses' && <FinanceExpenses hideHeader={true} />}
        {activeTab === 'converter' && <CurrencyConverter hideHeader={true} />}
        {activeTab === 'invoices' && <Invoices hideHeader={true} />}
      </div>
    </div>
  )
}
