import { useState } from 'react'
import Tabs from '../components/ui/Tabs'
import PortfolioProjects from './PortfolioProjects'
import ResourceDrive from './ResourceDrive'
import AutomationManager from '../components/resources/AutomationManager'

export default function Resources() {
  const [activeTab, setActiveTab] = useState('drive')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Recursos</h1>
          <p className="text-surface-400 mt-1">
            Gestiona tus archivos, notas y el portafolio de proyectos.
          </p>
        </div>
      </div>

      <div className="border-b border-surface-800">
        <Tabs
          tabs={[
            { value: 'drive', label: 'Archivos & Documentos' },
            { value: 'portfolio', label: 'Portafolio' },
            { value: 'automation', label: 'Automatizaciones' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'drive' && <ResourceDrive />}
        {activeTab === 'portfolio' && <PortfolioProjects hideHeader={true} />}
        {activeTab === 'automation' && <AutomationManager />}
      </div>
    </div>
  )
}
