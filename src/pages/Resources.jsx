import { useState } from 'react'
import Tabs from '../components/ui/Tabs'
import PortfolioProjects from './PortfolioProjects'
import ResourceDrive from './ResourceDrive'

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
            { id: 'drive', label: 'Archivos & Documentos' },
            { id: 'portfolio', label: 'Portafolio' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'drive' && <ResourceDrive />}
        {activeTab === 'portfolio' && <PortfolioProjects hideHeader={true} />}
      </div>
    </div>
  )
}
