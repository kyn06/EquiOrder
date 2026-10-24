import { useState } from 'react'
import { distributeOrders } from './utils/distribution'

const initialTeam = [
  { id: 1, name: 'You', status: 'working', pending: 0 },
  { id: 2, name: 'Teammate 2', status: 'working', pending: 0 },
  { id: 3, name: 'Teammate 3', status: 'working', pending: 0 },
  { id: 4, name: 'Teammate 4', status: 'working', pending: 0 },
  { id: 5, name: 'Teammate 5', status: 'working', pending: 0 },
  { id: 6, name: 'Teammate 6', status: 'break', pending: 2 },
]

function App() {
  const [team, setTeam] = useState(initialTeam)
  const [orders, setOrders] = useState('')
  const [allocations, setAllocations] = useState(null)

  const activeCount = team.filter(
    (person) => person.status === 'working',
  ).length

  const breakCount = team.length - activeCount

  function toggleBreak(id) {
    setTeam((current) =>
      current.map((person) =>
        person.id === id
          ? {
              ...person,
              status:
                person.status === 'working' ? 'break' : 'working',
            }
          : person,
      ),
    )
    setAllocations(null)
  }

  function handleDistribution(event) {
    event.preventDefault()

    const total = Number(orders)

    if (orders === '' || !Number.isSafeInteger(total) || total < 0) {
      return
    }

    const result = distributeOrders(team, total)
    setAllocations(result)
  }

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              EquiOrder
            </h1>
            <p className="text-sm text-slate-500">
              Automatic Order Distribution Counter
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Demo Mode
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <section>
          <h2 className="text-3xl font-bold">Team Dashboard</h2>
          <p className="mt-2 text-slate-500">
            Manage breaks and distribute incoming orders fairly.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Total teammates</p>
            <p className="mt-2 text-3xl font-bold">{team.length}</p>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">Working</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeCount}
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">On break</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {breakCount}
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">Incoming orders</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {orders === '' ? '—' : orders}
            </p>
          </div>
        </section>

        <section className={`${cardClass} space-y-4`}>
          <div>
            <h3 className="text-xl font-bold">Distribute Orders</h3>
            <p className="mt-1 text-sm text-slate-500">
              Orders are divided among teammates who are working.
            </p>
          </div>

          <form
            onSubmit={handleDistribution}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="number"
              min="0"
              step="1"
              value={orders}
              onChange={(event) => setOrders(event.target.value)}
              placeholder="Enter number of incoming orders"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />

            <button
              type="submit"
              disabled={activeCount === 0}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Calculate Distribution
            </button>
          </form>

          {allocations !== null && (
            <div className="rounded-xl bg-blue-50 p-4 text-blue-900">
              <p className="font-semibold">Distribution calculated</p>
              <p className="mt-1 text-sm">
                {Object.values(allocations).reduce(
                  (sum, count) => sum + count,
                  0,
                )}{' '}
                new orders allocated to {activeCount} active teammates.
              </p>
            </div>
          )}
        </section>

        <section className={cardClass}>
          <div className="mb-5">
            <h3 className="text-xl font-bold">Team Members</h3>
            <p className="mt-1 text-sm text-slate-500">
              Change a teammate's status and recalculate the distribution.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3">Teammate</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Pending orders</th>
                  <th className="px-3 py-3">New allocation</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {team.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-4 font-semibold">
                      {person.name}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          person.status === 'working'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {person.status === 'working'
                          ? 'Working'
                          : 'On break'}
                      </span>
                    </td>

                    <td className="px-3 py-4">{person.pending}</td>

                    <td className="px-3 py-4 font-semibold">
                      {allocations && person.status === 'working'
                        ? allocations[person.id] ?? 0
                        : '—'}
                    </td>

                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => toggleBreak(person.id)}
                        className="rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
                      >
                        {person.status === 'working'
                          ? 'Start break'
                          : 'Return'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="pb-4 text-center text-sm text-slate-400">
          EquiOrder · Fair orders, smarter distribution.
        </footer>
      </main>
    </div>
  )
}

export default App
