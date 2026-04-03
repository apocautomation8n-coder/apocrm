export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 bg-surface-800/50 rounded-xl border border-surface-700/30 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded-lg
            transition-all duration-200 cursor-pointer
            ${activeTab === tab.value
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
            }
          `}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
