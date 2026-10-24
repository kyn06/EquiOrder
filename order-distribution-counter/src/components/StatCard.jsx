const icons = {
  people: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  work: (
    <>
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </>
  ),
  break: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  orders: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
}

function StatCard({
  label,
  value,
  valueClass = 'text-slate-900',
  icon = 'people',
  iconClass = 'bg-blue-50 text-blue-700',
}) {
  return (
    <div className="rounded-[26px] border border-white/80 bg-[#eaf2fc] p-5 neo-raised transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className={`mt-3 text-3xl font-extrabold tracking-tight ${valueClass}`}>
            {value}
          </p>
        </div>
        <span className={`grid size-12 place-items-center rounded-2xl border border-white/80 neo-raised-sm ${iconClass}`}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            {icons[icon]}
          </svg>
        </span>
      </div>
    </div>
  )
}

export default StatCard
