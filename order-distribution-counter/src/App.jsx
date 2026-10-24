import { useEffect, useState } from 'react'
import DistributionForm from './components/DistributionForm'
import Sidebar from './components/Sidebar'
import StatCard from './components/StatCard'
import TeamEditor from './components/TeamEditor'
import TeamTable from './components/TeamTable'
import { distributeOrders } from './utils/distribution'

const initialTeam = [
  {
    id: 1,
    name: 'You',
    status: 'working',
    pending: 0,
    completed: 0,
    breakStartTime: '',
    returnTime: '',
  },
  {
    id: 2,
    name: 'Teammate 2',
    status: 'working',
    pending: 0,
    completed: 0,
    breakStartTime: '',
    returnTime: '',
  },
  {
    id: 3,
    name: 'Teammate 3',
    status: 'working',
    pending: 0,
    completed: 0,
    breakStartTime: '',
    returnTime: '',
  },
  {
    id: 4,
    name: 'Teammate 4',
    status: 'working',
    pending: 0,
    completed: 0,
    breakStartTime: '',
    returnTime: '',
  },
  {
    id: 5,
    name: 'Teammate 5',
    status: 'working',
    pending: 0,
    completed: 0,
    breakStartTime: '',
    returnTime: '',
  },
  {
    id: 6,
    name: 'Teammate 6',
    status: 'break',
    pending: 2,
    completed: 0,
    breakStartTime: '',
    returnTime: '',
  },
]

const dailyRosterStorageKey = 'equiorder-daily-rosters-v1'
const selectedWeekdayStorageKey = 'equiorder-selected-weekday-v1'
const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function getEasternWeekday() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  }).format(new Date())
}

function getInitialSelectedDay() {
  if (typeof window !== 'undefined') {
    try {
      const savedWeekday = window.localStorage.getItem(selectedWeekdayStorageKey)
      if (weekdays.includes(savedWeekday)) {
        return savedWeekday
      }
    } catch {
      // Use today's Eastern weekday when browser storage is unavailable.
    }
  }

  return getEasternWeekday()
}

function readDailyRosters() {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = window.localStorage.getItem(dailyRosterStorageKey)
    const parsed = stored ? JSON.parse(stored) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const rosters = {}
    const datedRosters = Object.entries(parsed)
      .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))

    for (const [date, roster] of datedRosters) {
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'long',
      }).format(new Date(`${date}T12:00:00Z`))
      rosters[weekday] = roster
    }

    for (const weekday of weekdays) {
      if (Array.isArray(parsed[weekday])) {
        rosters[weekday] = parsed[weekday]
      }
    }

    return rosters
  } catch {
    return {}
  }
}

function hydrateDayRoster(roster) {
  return roster.map((person, index) => ({
    id: Number.isSafeInteger(person.id) ? person.id : index + 1,
    name: typeof person.name === 'string' ? person.name : `Teammate ${index + 1}`,
    status: person.status === 'break' ? 'break' : 'working',
    completed: 0,
    pending: 0,
    breakStartTime: person.breakStartTime ?? '',
    returnTime: person.returnTime ?? '',
  }))
}

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const savedTheme = window.localStorage.getItem('equiorder-theme')

    if (savedTheme) {
      return savedTheme === 'dark'
    }
  } catch {
    // Theme persistence may be unavailable in restricted browser contexts.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function App() {
  const [isDark, setIsDark] = useState(getInitialTheme)
  const [savedRosters, setSavedRosters] = useState(readDailyRosters)
  const [selectedDay, setSelectedDay] = useState(getInitialSelectedDay)
  const [team, setTeam] = useState(() =>
    savedRosters[selectedDay]
      ? hydrateDayRoster(savedRosters[selectedDay])
      : initialTeam,
  )
  const [activePage, setActivePage] = useState('dashboard')
  const [rosterSaved, setRosterSaved] = useState(
    Boolean(savedRosters[selectedDay]),
  )
  const [saveError, setSaveError] = useState('')
  const [orders, setOrders] = useState('')
  const [allocations, setAllocations] = useState(null)
  const [distributionHistory, setDistributionHistory] = useState([])

  const activeCount = team.filter(
    (person) => person.status === 'working',
  ).length
  const breakCount = team.length - activeCount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#172235' : '#eaf2fc')

    try {
      window.localStorage.setItem('equiorder-theme', isDark ? 'dark' : 'light')
    } catch {
      // Keep the in-memory theme working when storage is unavailable.
    }
  }, [isDark])

  useEffect(() => {
    try {
      window.localStorage.setItem(selectedWeekdayStorageKey, selectedDay)
    } catch {
      // Keep the selected weekday active for this session if storage is unavailable.
    }
  }, [selectedDay])

  function updateTeamStatus(id, status) {
    setTeam((current) =>
      current.map((person) =>
        person.id === id
          ? { ...person, status }
          : person,
      ),
    )
    setAllocations(null)
    setRosterSaved(false)
  }

  function updateOrderCount(id, field, value) {
    const count = value === '' ? 0 : Number(value)

    if (!Number.isSafeInteger(count) || count < 0) {
      return
    }

    setTeam((current) => {
      const updated = current.map((person) =>
        person.id === id ? { ...person, [field]: count } : person,
      )

      if (field === 'completed' && updated.length > 0) {
        const highestCompleted = Math.max(
          ...updated.map((person) => person.completed),
        )

        return updated.map((person) => {
          const pending = Math.max(
            0,
            highestCompleted - person.completed,
          )

          return {
            ...person,
            pending,
          }
        })
      }

      return updated
    })
    setAllocations(null)
  }

  function updateTeamName(id, name) {
    setTeam((current) =>
      current.map((person) => (person.id === id ? { ...person, name } : person)),
    )
    setRosterSaved(false)
  }

  function updateBreakTime(id, field, value) {
    setTeam((current) =>
      current.map((person) =>
        person.id === id ? { ...person, [field]: value } : person,
      ),
    )
    setRosterSaved(false)
  }

  function selectDay(day) {
    loadDay(day)
  }

  function loadDay(day) {
    const savedRoster = savedRosters[day]
    const nextTeam = savedRoster
      ? hydrateDayRoster(savedRoster)
      : team.map((person) => ({
          ...person,
          status: 'working',
          completed: 0,
          pending: 0,
          breakStartTime: '',
          returnTime: '',
        }))

    setSelectedDay(day)
    setTeam(nextTeam)
    setRosterSaved(Boolean(savedRoster))
    setSaveError('')
    setOrders('')
    setAllocations(null)
    setDistributionHistory([])
  }

  function saveCurrentDay() {
    const roster = team.map(({ id, name, status, breakStartTime, returnTime }) => ({
      id,
      name,
      status,
      breakStartTime,
      returnTime,
    }))
    const updatedRosters = { ...savedRosters, [selectedDay]: roster }

    setSavedRosters(updatedRosters)
    try {
      window.localStorage.setItem(
        dailyRosterStorageKey,
        JSON.stringify(updatedRosters),
      )
      setRosterSaved(true)
      setSaveError('')
    } catch {
      setRosterSaved(false)
      setSaveError('Could not save this day in browser storage.')
    }
  }

  function handleAddTeamMember() {
    setTeam((current) => {
      if (current.length >= 100) {
        return current
      }

      const id = current.reduce(
        (highest, person) => Math.max(highest, person.id),
        0,
      ) + 1

      return [
        ...current,
        {
          id,
          name: `Teammate ${id}`,
          status: 'working',
          pending: 0,
          completed: 0,
          breakStartTime: '',
          returnTime: '',
        },
      ]
    })
    setAllocations(null)
    setRosterSaved(false)
  }

  function handleRemoveTeamMember(id) {
    setTeam((current) => {
      if (current.length <= 1) {
        return current
      }

      const remaining = current.filter((person) => person.id !== id)
      const highestCompleted = Math.max(
        ...remaining.map((person) => person.completed),
      )

      return remaining.map((person) => ({
        ...person,
        pending: Math.max(0, highestCompleted - person.completed),
      }))
    })
    setAllocations(null)
    setRosterSaved(false)
  }

  function handleDistribution(event) {
    event.preventDefault()
    const total = Number(orders)

    if (orders === '' || !Number.isSafeInteger(total) || total < 0) {
      return
    }

    const result = distributeOrders(team, total)
    const updatedTeam = team.map((person) => ({
      ...person,
      completed: person.completed + (result[person.id] ?? 0),
    }))
    const highestCompleted = Math.max(
      ...updatedTeam.map((person) => person.completed),
    )

    setTeam(
      updatedTeam.map((person) => ({
        ...person,
        pending: Math.max(0, highestCompleted - person.completed),
      })),
    )
    setAllocations(result)
    const completedAt = new Date().toISOString()
    setDistributionHistory((current) => [
      {
        id: completedAt,
        completedAt,
        totalOrders: total,
        allocations: team
          .filter((person) => person.status === 'working')
          .map((person) => ({
            name: person.name,
            count: result[person.id] ?? 0,
          })),
      },
      ...current,
    ].slice(0, 5))
    setOrders('')
  }

  function handleOrdersInput(value) {
    setOrders(value)
    setAllocations(null)
  }

  return (
    <div className="min-h-screen bg-[#eaf2fc] text-[#102a5c]">
      <header className="px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/90 bg-[#eaf2fc] px-5 py-3 neo-raised sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-400 to-blue-700 text-white shadow-[4px_4px_9px_rgba(88,131,186,0.4),-3px_-3px_8px_rgba(255,255,255,0.85)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-6"
              >
                <path d="M4 7h16M4 12h10M4 17h16" />
                <circle cx="18" cy="12" r="2" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#102a5c]">
                EquiOrder
              </h1>
              <p className="text-xs font-medium text-slate-600">
                Order distribution
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Sidebar activePage={activePage} onNavigate={setActivePage} />
            <button
              type="button"
              onClick={() => setIsDark((current) => !current)}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              aria-pressed={isDark}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="grid size-11 place-items-center rounded-full border border-white/80 bg-[#eaf2fc] text-blue-800 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95"
            >
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
                {isDark ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                  </>
                ) : (
                  <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
                )}
              </svg>
              <span className="sr-only">
                {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              </span>
            </button>
            <span className="hidden min-h-10 items-center gap-2 rounded-full border border-white/80 bg-[#eaf2fc] px-4 py-2 text-xs font-bold text-emerald-700 neo-raised-sm sm:inline-flex">
              <span className="size-2 rounded-full bg-teal-500 shadow-[0_0_0_3px_rgba(20,184,166,0.14)]" />
              Demo mode
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-10">
        <section className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
              {activePage === 'dashboard' ? 'Overview' : 'Workspace'}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#102a5c] sm:text-4xl">
              {activePage === 'dashboard' ? 'Team dashboard' : 'Manage team'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {activePage === 'dashboard'
                ? 'See who is working, track order progress, and balance the next batch.'
                : 'Update your roster, order totals, and break times in one place.'}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-white/80 bg-[#eaf2fc] px-4 py-3 text-sm font-semibold text-[#254779] neo-raised-sm sm:self-auto">
            <span className="size-2 rounded-full bg-blue-600" />
            {team.length} {team.length === 1 ? 'teammate' : 'teammates'}
          </div>
        </section>

        {activePage === 'dashboard' ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total teammates" value={team.length} icon="people" />
              <StatCard
                label="Working"
                value={activeCount}
                icon="work"
                valueClass="text-green-600"
                iconClass="bg-green-50 text-green-700"
              />
              <StatCard
                label="On break"
                value={breakCount}
                icon="break"
                valueClass="text-amber-600"
                iconClass="bg-amber-50 text-amber-700"
              />
              <StatCard
                label="Incoming orders"
                value={orders === '' ? '—' : orders}
                icon="orders"
                valueClass="text-blue-700"
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.5fr)]">
              <DistributionForm
                activeCount={activeCount}
                history={distributionHistory}
                onSubmit={handleDistribution}
                orders={orders}
                onOrdersChange={handleOrdersInput}
              />

              <TeamTable
                team={team}
                allocations={allocations}
              />
            </div>
          </>
        ) : (
          <TeamEditor
            team={team}
            selectedDay={selectedDay}
            weekdays={weekdays}
            rosterSaved={rosterSaved}
            saveError={saveError}
            onAddTeamMember={handleAddTeamMember}
            onRemoveTeamMember={handleRemoveTeamMember}
            onDaySelect={selectDay}
            onSaveDay={saveCurrentDay}
            onNameChange={updateTeamName}
            onOrderCountChange={updateOrderCount}
            onBreakTimeChange={updateBreakTime}
            onStatusChange={updateTeamStatus}
          />
        )}

        <footer className="py-6 text-center text-xs font-semibold text-slate-500">
          EquiOrder · Fair orders, smarter distribution.
        </footer>
      </main>
    </div>
  )
}

export default App
