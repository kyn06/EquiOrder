import { useState } from 'react'

function TeamTable({ team, allocations, onOrderCountChange }) {
  const [sortBy, setSortBy] = useState('custom')
  const [sortDirection, setSortDirection] = useState('desc')
  const activeSort = sortBy
  const orderedTeam = [...team].sort((first, second) => {
    if (activeSort === 'custom') return 0

    let comparison = 0
    if (activeSort === 'name') {
      comparison = (first.name || '').localeCompare(second.name || '', undefined, {
        sensitivity: 'base',
        numeric: true,
      })
    } else if (activeSort === 'status') {
      comparison = first.status.localeCompare(second.status)
    } else if (activeSort === 'completed' || activeSort === 'pending') {
      comparison = Number(first[activeSort] || 0) - Number(second[activeSort] || 0)
    } else if (activeSort === 'allocation') {
      comparison = (allocations?.[first.id] ?? 0) - (allocations?.[second.id] ?? 0)
    }

    return (sortDirection === 'asc' ? comparison : -comparison) ||
      team.indexOf(first) - team.indexOf(second)
  })

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/90 bg-[#eaf2fc] neo-raised">
      <div className="flex flex-col gap-3 border-b border-white/90 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-[#102a5c]">
            Team members
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {activeSort === 'custom'
              ? 'Showing teammates in your roster order.'
              : `Sorted by ${activeSort === 'allocation' ? 'new allocation' : activeSort}, ${sortDirection === 'asc' ? 'ascending' : 'descending'}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 text-xs font-bold text-slate-700 neo-inset">
            <span>Sort</span>
            <select
              aria-label="Sort team members by"
              value={activeSort}
              onChange={(event) => setSortBy(event.target.value)}
              className="team-sort-select min-h-10 bg-transparent text-sm font-semibold"
            >
              <option value="custom">Custom order</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="allocation">New allocation</option>
            </select>
          </label>
          {activeSort !== 'custom' && (
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 text-xs font-bold text-slate-700 neo-inset">
              <span>Order</span>
              <select
                aria-label="Sort direction"
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value)}
                className="team-sort-select min-h-10 bg-transparent text-sm font-semibold"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          )}
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full border border-white/90 bg-[#eaf2fc] px-3 py-1.5 text-green-800 neo-raised-sm">
              {team.filter((person) => person.status === 'working').length} working
            </span>
            <span className="rounded-full border border-white/90 bg-[#eaf2fc] px-3 py-1.5 text-amber-800 neo-raised-sm">
              {team.filter((person) => person.status === 'break').length} on break
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-190 text-left text-sm">
          <thead>
            <tr className="border-b border-white/90 text-xs font-extrabold uppercase tracking-wide text-slate-600">
              <th className="w-52 px-3 py-3.5">Teammate</th>
              <th className="w-32 px-4 py-3.5">Status</th>
              <th className="w-32 px-4 py-3.5 text-center">Completed</th>
              <th className="w-32 px-4 py-3.5 text-center">Pending</th>
              <th className="w-32 px-4 py-3.5 text-center">New allocation</th>
            </tr>
          </thead>
          <tbody>
            {orderedTeam.map((person) => (
              <tr
                key={person.id}
                className="team-member-row border-b border-white/80 transition-colors last:border-0 hover:bg-white/25"
              >
                <td className="w-52 max-w-52 px-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/90 bg-[#eaf2fc] text-xs font-extrabold text-blue-800 neo-raised-sm">
                      {person.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <span
                      title={person.name || 'Unnamed teammate'}
                      className="min-w-0 max-w-32 truncate font-bold text-[#102a5c]"
                    >
                      {person.name || 'Unnamed teammate'}
                    </span>
                  </div>
                </td>
                <td className="w-32 px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border border-white/90 bg-[#eaf2fc] px-2.5 py-1.5 text-xs font-bold neo-raised-sm ${
                      person.status === 'working'
                        ? 'text-green-800'
                        : 'text-amber-800'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        person.status === 'working'
                          ? 'bg-green-600'
                          : 'bg-amber-600'
                      }`}
                    />
                    {person.status === 'working' ? 'Working' : 'On break'}
                  </span>
                </td>
                <td className="w-32 px-4 py-3.5 text-center">
                  <label htmlFor={`dashboard-completed-${person.id}`} className="sr-only">
                    Orders completed by {person.name}
                  </label>
                  <input
                    id={`dashboard-completed-${person.id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={person.completed}
                    onChange={(event) =>
                      onOrderCountChange(person.id, 'completed', event.target.value)
                    }
                    className="mx-auto block min-h-10 w-24 rounded-xl border border-white/90 bg-[#eaf2fc] px-2 py-2 text-center font-semibold tabular-nums text-[#254779] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                  />
                </td>
                <td className="w-32 px-4 py-3.5 text-center font-semibold tabular-nums text-[#254779]">
                  {person.pending}
                </td>
                <td className="w-32 px-4 py-3.5 text-center font-extrabold tabular-nums text-blue-800">
                  {allocations && person.status === 'working'
                    ? allocations[person.id] ?? 0
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TeamTable
