function TeamTable({ team, allocations }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/90 bg-[#eaf2fc] neo-raised">
      <div className="flex flex-col gap-3 border-b border-white/90 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-[#102a5c]">
            Team members
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Review workloads and update availability.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full border border-white/90 bg-[#eaf2fc] px-3 py-1.5 text-green-800 neo-raised-sm">
            {team.filter((person) => person.status === 'working').length} working
          </span>
          <span className="rounded-full border border-white/90 bg-[#eaf2fc] px-3 py-1.5 text-amber-800 neo-raised-sm">
            {team.filter((person) => person.status === 'break').length} on break
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-190 text-left text-sm">
          <thead>
            <tr className="border-b border-white/90 text-xs font-extrabold uppercase tracking-wide text-slate-600">
              <th className="px-5 py-3.5">Teammate</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Completed</th>
              <th className="px-4 py-3.5 text-right">Pending</th>
              <th className="px-4 py-3.5 text-right">New allocation</th>
            </tr>
          </thead>
          <tbody>
            {team.map((person) => (
              <tr
                key={person.id}
                className="border-b border-white/80 transition-colors last:border-0 hover:bg-white/25"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/90 bg-[#eaf2fc] text-xs font-extrabold text-blue-800 neo-raised-sm">
                      {person.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <span className="font-bold text-[#102a5c]">
                      {person.name || 'Unnamed teammate'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
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
                <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-[#254779]">
                  {person.completed}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-[#254779]">
                  {person.pending}
                </td>
                <td className="px-4 py-3.5 text-right font-extrabold tabular-nums text-blue-800">
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
