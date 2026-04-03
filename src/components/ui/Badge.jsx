const colors = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/15 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  gray: 'bg-surface-500/15 text-surface-400 border-surface-500/20',
  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
}

export default function Badge({ color = 'gray', children, dot = false, className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-xs font-medium rounded-full border
        ${colors[color] || colors.gray}
        ${className}
      `}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-soft" />
      )}
      {children}
    </span>
  )
}
