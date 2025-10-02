// src/pages/pos/GuestBtn.jsx
export default function GuestBtn({active, glow, theme, onClick, children}){
  const glowCls = glow
    ? (theme==='dark'
        ? 'ring-2 ring-sky-500 bg-sky-500/15 border-sky-500'
        : 'ring-2 ring-amber-500 bg-amber-500/15 border-amber-500')
    : ''
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-sm border transition touch-btn
        ${active
          ? `bg-brand/20 border-brand text-neutral-900 dark:text-white ${glowCls}`
          : `bg-[var(--surface)] border-neutral-200/80 hover:border-brand dark:bg-neutral-900 dark:border-neutral-800 ${glowCls}`
        }`}
    >
      {children}
    </button>
  )
}
