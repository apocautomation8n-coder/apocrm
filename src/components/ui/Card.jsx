export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-surface-900/80 border border-surface-800/60 rounded-2xl
        ${hover ? 'hover:border-surface-700/80 hover:bg-surface-800/60 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, trend, color = 'primary' }) {
  const gradients = {
    primary: 'from-primary-500/20 to-primary-600/5',
    accent: 'from-accent-500/20 to-accent-600/5',
    success: 'from-emerald-500/20 to-emerald-600/5',
    warning: 'from-amber-500/20 to-amber-600/5',
    danger: 'from-red-500/20 to-red-600/5',
  }

  const iconBg = {
    primary: 'bg-primary-500/15 text-primary-400',
    accent: 'bg-accent-500/15 text-accent-400',
    success: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    danger: 'bg-red-500/15 text-red-400',
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradients[color]} border border-surface-800/60 rounded-2xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-surface-100">{value}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg[color]}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  )
}
