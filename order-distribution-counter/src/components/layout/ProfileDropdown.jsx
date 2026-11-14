import { useEffect, useRef, useState } from 'react'

function ProfileDropdown({ name, email, onLogout }) {
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
        aria-controls="profile-menu"
        aria-label="Open profile menu"
        className="button-secondary inline-flex min-h-11 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95"
      >
        <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-sky-400 to-blue-700 text-xs font-extrabold text-white" aria-hidden="true">
          {name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
        </span>
        <span className="hidden text-sm font-bold sm:inline">Profile</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <section id="profile-menu" aria-label="Profile" className="absolute right-0 z-50 mt-3 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-white/80 bg-[#eaf2fc] p-3 neo-raised dark:border-white/10">
          <div className="flex items-center gap-3 rounded-xl bg-white/50 p-3 dark:bg-white/5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-sky-400 to-blue-700 text-sm font-extrabold text-white" aria-hidden="true">
              {name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[#102a5c]">{name}</p>
              <p className="truncate text-xs font-medium text-slate-600">{email}</p>
            </div>
          </div>
          <div className="my-3 border-t border-slate-200 dark:border-white/10" />
          <button
            type="button"
            onClick={() => { setIsOpen(false); onLogout() }}
            className="button-danger flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M10 17l5-5-5-5M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            Log out
          </button>
        </section>
      )}
    </div>
  )
}

export default ProfileDropdown
