const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'team', label: 'Manage team' },
  { id: 'notes', label: 'Notes' },
]

function Sidebar({ activePage, onNavigate }) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-white/80 bg-[#eaf2fc] p-1.5 neo-inset"
    >
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => onNavigate(page.id)}
          aria-current={activePage === page.id ? 'page' : undefined}
          className={`min-h-10 rounded-xl px-2.5 py-2 text-sm font-bold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4 ${
            activePage === page.id
              ? 'border border-white/80 bg-[#eaf2fc] text-blue-700'
              : 'text-slate-600 hover:text-blue-800'
          }`}
        >
          {page.label}
        </button>
      ))}
    </nav>
  )
}

export default Sidebar
