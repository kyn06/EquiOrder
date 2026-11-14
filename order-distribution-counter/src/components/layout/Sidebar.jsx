import { useEffect, useRef, useState } from 'react'

const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'oid-distribution', label: 'OID Distribution' },
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
    <>
      <div className="relative order-1 ml-auto sm:hidden" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-controls="mobile-topbar-menu"
          className="button-secondary inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Menu
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
        {isOpen && (
          <nav id="mobile-topbar-menu" aria-label="Main navigation" className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-white/80 bg-[#eaf2fc] p-2 neo-raised dark:border-white/10">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => { onNavigate(page.id); setIsOpen(false) }}
                aria-current={activePage === page.id ? 'page' : undefined}
                className={`flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${activePage === page.id ? 'bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-white' : 'text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/5'}`}
              >
                {page.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      <nav aria-label="Main navigation" className="order-3 hidden min-w-0 flex-wrap items-center gap-1 rounded-2xl border border-white/80 bg-[#e1ebf7] p-1 neo-inset dark:border-white/10 dark:bg-[#15263f] sm:flex sm:w-full xl:order-none xl:w-auto xl:flex-1">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => onNavigate(page.id)}
            aria-current={activePage === page.id ? 'page' : undefined}
            className={`flex min-h-10 min-w-24 flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${activePage === page.id ? 'bg-[#eaf2fc] text-blue-800 shadow-[2px_2px_5px_rgba(88,131,186,0.2),-2px_-2px_5px_rgba(255,255,255,0.9)] dark:bg-blue-600 dark:text-white dark:ring-1 dark:ring-blue-300/70 dark:shadow-none' : 'text-slate-600 hover:bg-white/50 hover:text-[#102a5c] dark:text-slate-200 dark:hover:bg-white/5'}`}
          >
            {page.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export default Sidebar
