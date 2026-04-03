export default function Toggle({ enabled, onChange, label, size = 'md' }) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  }

  const s = sizes[size]

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex items-center shrink-0 rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2 focus:ring-offset-surface-900
          cursor-pointer
          ${s.track}
          ${enabled ? 'bg-primary-600' : 'bg-surface-700'}
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-lg
            transform transition-transform duration-200 ease-in-out
            ${s.thumb}
            ${enabled ? s.translate : 'translate-x-0.5'}
          `}
        />
      </button>
      {label && (
        <span className="text-sm text-surface-300">{label}</span>
      )}
    </label>
  )
}
