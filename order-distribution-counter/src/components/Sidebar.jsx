import { useEffect, useRef, useState } from 'react'

const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'team', label: 'Manage team' },
  { id: 'notes', label: 'Notes' },
]

function Sidebar({ activePage, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="topbar-menu"
        className="button-secondary inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Menu
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <nav id="topbar-menu" aria-label="Main navigation" className="absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-white/80 bg-[#eaf2fc] p-2 neo-raised dark:border-white/10">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Navigate</p>
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => { onNavigate(page.id); setIsOpen(false) }}
              aria-current={activePage === page.id ? 'page' : undefined}
              className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${activePage === page.id ? 'bg-blue-100 text-blue-800 dark:bg-[#243b5a] dark:text-blue-200' : 'text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/5'}`}
            >
              {page.label}
              {activePage === page.id && <span className="size-2 rounded-full bg-blue-600" aria-label="Current page" />}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export default Sidebar
