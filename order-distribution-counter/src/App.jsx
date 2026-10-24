import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
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
const dailyProgressStorageKey = 'equiorder-daily-progress-v1'
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

function cacheDailyRosters(rosters) {
  try {
    window.localStorage.setItem(dailyRosterStorageKey, JSON.stringify(rosters))
  } catch {
    // PostgreSQL remains the primary store if the browser cache is unavailable.
  }
}

function readDailyProgress() {
  if (typeof window === 'undefined') return {}

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(dailyProgressStorageKey) || '{}',
    )
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

function cacheDailyProgress(progress) {
  try {
    window.localStorage.setItem(dailyProgressStorageKey, JSON.stringify(progress))
  } catch {
    // PostgreSQL remains the primary store if the browser cache is unavailable.
  }
}

function hydrateDayRoster(roster, progress = null) {
  const orderCounts = new Map(
    (progress?.teammates ?? []).map((person) => [person.id, person]),
  )

  return roster.map((person, index) => ({
    id: Number.isSafeInteger(person.id) ? person.id : index + 1,
    name: typeof person.name === 'string' ? person.name : `Teammate ${index + 1}`,
    status: person.status === 'break' ? 'break' : 'working',
    completed: orderCounts.get(person.id)?.completed ?? 0,
    pending: orderCounts.get(person.id)?.pending ?? 0,
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

function confirmDestructiveAction({ title, text, confirmButtonText }) {
  const isDark = document.documentElement.classList.contains('dark')

  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    background: isDark ? '#172235' : '#eaf2fc',
    color: isDark ? '#eaf2fc' : '#102a5c',
  }).then((result) => result.isConfirmed)
}

function App() {
  const [isDark, setIsDark] = useState(getInitialTheme)
  const [savedRosters, setSavedRosters] = useState(readDailyRosters)
  const [savedProgress, setSavedProgress] = useState(readDailyProgress)
  const savedProgressRef = useRef(savedProgress)
  const [selectedDay, setSelectedDay] = useState(getInitialSelectedDay)
  const selectedDayRef = useRef(selectedDay)
  const [team, setTeam] = useState(() =>
    savedRosters[selectedDay]
      ? hydrateDayRoster(
          savedRosters[selectedDay],
          savedProgress[selectedDay],
        )
      : initialTeam,
  )
  const [activePage, setActivePage] = useState('dashboard')
  const [rosterSaved, setRosterSaved] = useState(
    Boolean(savedRosters[selectedDay]),
  )
  const [saveError, setSaveError] = useState('')
  const [isSavingRoster, setIsSavingRoster] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [orders, setOrders] = useState('')
  const [allocations, setAllocations] = useState(
    () => savedProgress[selectedDay]?.allocations ?? null,
  )
  const [distributionHistory, setDistributionHistory] = useState(
    () => savedProgress[selectedDay]?.recentBatches ?? [],
  )

  const activeCount = team.filter(
    (person) => person.status === 'working',
  ).length
  const breakCount = team.length - activeCount
  const orderProgressPayload = JSON.stringify({
    teammates: team.map(({ id, completed, pending }) => ({
      id,
      completed,
      pending,
    })),
    allocations,
    recentBatches: distributionHistory,
  })
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
    selectedDayRef.current = selectedDay
    try {
      window.localStorage.setItem(selectedWeekdayStorageKey, selectedDay)
    } catch {
      // Keep the selected weekday active for this session if storage is unavailable.
    }
  }, [selectedDay])

  useEffect(() => {
    let cancelled = false

    async function loadRostersFromDatabase() {
      try {
        const response = await fetch('/api/rosters')
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Could not load saved rosters.')
        }

        const databaseRosters = result.rosters ?? {}
        const databaseProgress = result.progress ?? {}
        const cachedRosters = readDailyRosters()
        const cachedProgress = readDailyProgress()

        for (const [weekday, roster] of Object.entries(cachedRosters)) {
          if (roster.length > 0 && !databaseRosters[weekday]?.length) {
            const migrationResponse = await fetch(
              `/api/rosters/${encodeURIComponent(weekday)}`,
              {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ roster }),
              },
            )
            if (!migrationResponse.ok) {
              const migrationResult = await migrationResponse.json()
              throw new Error(
                migrationResult.error || `Could not migrate ${weekday}'s roster.`,
              )
            }
            databaseRosters[weekday] = roster
          }
        }

        for (const [weekday, progress] of Object.entries(cachedProgress)) {
          if (!databaseProgress[weekday]) {
            const migrationResponse = await fetch(
              `/api/progress/${encodeURIComponent(weekday)}`,
              {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ progress }),
              },
            )
            if (!migrationResponse.ok) {
              const migrationResult = await migrationResponse.json()
              throw new Error(
                migrationResult.error || `Could not migrate ${weekday}'s order progress.`,
              )
            }
            databaseProgress[weekday] = progress
          }
        }

        if (cancelled) return

        setSavedRosters(databaseRosters)
        setSavedProgress(databaseProgress)
        savedProgressRef.current = databaseProgress
        cacheDailyRosters(databaseRosters)
        cacheDailyProgress(databaseProgress)
        const activeDay = selectedDayRef.current
        const activeRoster = databaseRosters[activeDay]?.length
          ? databaseRosters[activeDay]
          : cachedRosters[activeDay]?.length
            ? cachedRosters[activeDay]
            : initialTeam
        setTeam(hydrateDayRoster(activeRoster, databaseProgress[activeDay]))
        setRosterSaved(Boolean(databaseRosters[activeDay]?.length))
        setAllocations(databaseProgress[activeDay]?.allocations ?? null)
        setDistributionHistory(databaseProgress[activeDay]?.recentBatches ?? [])
        setApiConnected(true)
        setSaveError('')
      } catch {
        if (!cancelled) {
          setApiConnected(false)
          setSaveError(
            'Cannot reach PostgreSQL. Check that the API is running and DATABASE_URL is set. Using this browser’s saved roster.',
          )
        }
      }
    }

    loadRostersFromDatabase()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const progress = JSON.parse(orderProgressPayload)
    if (!apiConnected) return undefined

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/progress/${encodeURIComponent(selectedDay)}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ progress }),
          },
        )
        if (!response.ok) throw new Error('Could not save this day’s order progress.')
      } catch {
        setApiConnected(false)
        setProgressMessage('PostgreSQL is unavailable. Order progress is cached in this browser.')
      }
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [
    selectedDay,
    orderProgressPayload,
    apiConnected,
  ])

  function rememberProgress(day, teamSnapshot, allocationSnapshot, historySnapshot) {
    const progress = {
      teammates: teamSnapshot.map(({ id, completed, pending }) => ({
        id,
        completed,
        pending,
      })),
      allocations: allocationSnapshot,
      recentBatches: historySnapshot,
    }
    const updated = { ...savedProgressRef.current, [day]: progress }
    savedProgressRef.current = updated
    setSavedProgress(updated)
    cacheDailyProgress(updated)
  }

  function updateTeamStatus(id, status) {
    const updatedTeam = team.map((person) =>
      person.id === id ? { ...person, status } : person,
    )
    setTeam(updatedTeam)
    setAllocations(null)
    rememberProgress(selectedDay, updatedTeam, null, distributionHistory)
    setRosterSaved(false)
  }

  function updateOrderCount(id, field, value) {
    const count = value === '' ? 0 : Number(value)

    if (!Number.isSafeInteger(count) || count < 0) {
      return
    }

    let updatedTeam = team.map((person) =>
      person.id === id ? { ...person, [field]: count } : person,
    )

    if (field === 'completed' && updatedTeam.length > 0) {
      const highestCompleted = Math.max(
        ...updatedTeam.map((person) => person.completed),
      )
      updatedTeam = updatedTeam.map((person) => ({
        ...person,
        pending: Math.max(0, highestCompleted - person.completed),
      }))
    }

    setTeam(updatedTeam)
    setAllocations(null)
    rememberProgress(selectedDay, updatedTeam, null, distributionHistory)
  }

  function updateTeamName(id, name) {
    const updatedTeam = team.map((person) =>
      person.id === id ? { ...person, name } : person,
    )
    setTeam(updatedTeam)
    rememberProgress(selectedDay, updatedTeam, allocations, distributionHistory)
    setRosterSaved(false)
  }

  function updateBreakTime(id, field, value) {
    const updatedTeam = team.map((person) =>
      person.id === id ? { ...person, [field]: value } : person,
    )
    setTeam(updatedTeam)
    rememberProgress(selectedDay, updatedTeam, allocations, distributionHistory)
    setRosterSaved(false)
  }

  function selectDay(day) {
    loadDay(day)
  }

  function loadDay(day) {
    const savedRoster = savedRosters[day]
    const dayProgress = savedProgressRef.current[day]
    const rosterToLoad = savedRoster ?? team.map((person) => ({
      ...person,
      status: 'working',
      breakStartTime: '',
      returnTime: '',
    }))
    const nextTeam = hydrateDayRoster(rosterToLoad, dayProgress)

    setSelectedDay(day)
    setTeam(nextTeam)
    setRosterSaved(Boolean(savedRoster))
    setSaveError('')
    setProgressMessage('')
    setOrders('')
    setAllocations(dayProgress?.allocations ?? null)
    setDistributionHistory(dayProgress?.recentBatches ?? [])
  }

  async function saveCurrentDay() {
    const roster = team.map(({ id, name, status, breakStartTime, returnTime }) => ({
      id,
      name,
      status,
      breakStartTime,
      returnTime,
    }))
    const updatedRosters = { ...savedRosters, [selectedDay]: roster }

    setIsSavingRoster(true)
    try {
      const response = await fetch(
        `/api/rosters/${encodeURIComponent(selectedDay)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roster }),
        },
      )
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Could not save this roster.')
      }

      setSavedRosters(updatedRosters)
      cacheDailyRosters(updatedRosters)
      setRosterSaved(true)
      setSaveError('')
    } catch {
      try {
        window.localStorage.setItem(
          dailyRosterStorageKey,
          JSON.stringify(updatedRosters),
        )
        setSavedRosters(updatedRosters)
        setRosterSaved(true)
        setSaveError('PostgreSQL save failed. Saved locally in this browser.')
      } catch {
        setRosterSaved(false)
        setSaveError('Could not save this roster to PostgreSQL or browser storage.')
      }
    } finally {
      setIsSavingRoster(false)
    }
  }

  function handleAddTeamMember() {
    if (team.length >= 100) return

    const id = team.reduce(
      (highest, person) => Math.max(highest, person.id),
      0,
    ) + 1
    const updatedTeam = [
      ...team,
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
    setTeam(updatedTeam)
    setAllocations(null)
    rememberProgress(selectedDay, updatedTeam, null, distributionHistory)
    setRosterSaved(false)
  }

  async function handleRemoveTeamMember(id) {
    if (team.length <= 1) return

    const teammate = team.find((person) => person.id === id)
    if (!teammate) return

    const confirmed = await confirmDestructiveAction({
      title: `Remove ${teammate.name}?`,
      text: `This removes ${teammate.name} from the ${selectedDay} roster.`,
      confirmButtonText: 'Remove teammate',
    })
    if (!confirmed) return

    const remaining = team.filter((person) => person.id !== id)
    const highestCompleted = Math.max(
      ...remaining.map((person) => person.completed),
    )
    const updatedTeam = remaining.map((person) => ({
      ...person,
      pending: Math.max(0, highestCompleted - person.completed),
    }))
    setTeam(updatedTeam)
    setAllocations(null)
    rememberProgress(selectedDay, updatedTeam, null, distributionHistory)
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

    const balancedTeam = updatedTeam.map((person) => ({
      ...person,
      pending: Math.max(0, highestCompleted - person.completed),
    }))
    setTeam(balancedTeam)
    setAllocations(result)
    const completedAt = new Date().toISOString()
    const updatedHistory = [
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
      ...distributionHistory,
    ].slice(0, 5)
    setDistributionHistory(updatedHistory)
    rememberProgress(selectedDay, balancedTeam, result, updatedHistory)
    setOrders('')
  }

  function handleOrdersInput(value) {
    setOrders(value)
    setAllocations(null)
    rememberProgress(selectedDay, team, null, distributionHistory)
  }

  async function handleClearDay() {
    const confirmed = await confirmDestructiveAction({
      title: `Clear ${selectedDay}'s order progress?`,
      text: 'This clears completed and pending counts, new allocations, and recent batches for this weekday.',
      confirmButtonText: 'Clear day',
    })
    if (!confirmed) return

    const clearedTeam = team.map((person) => ({
      ...person,
      completed: 0,
      pending: 0,
    }))
    const clearedProgress = {
      teammates: clearedTeam.map(({ id }) => ({ id, completed: 0, pending: 0 })),
      allocations: null,
      recentBatches: [],
    }

    setTeam(clearedTeam)
    setAllocations(null)
    setDistributionHistory([])
    setOrders('')
    setProgressMessage('')
    const updatedProgress = {
      ...savedProgressRef.current,
      [selectedDay]: clearedProgress,
    }
    savedProgressRef.current = updatedProgress
    setSavedProgress(updatedProgress)
    cacheDailyProgress(updatedProgress)

    if (!apiConnected) return

    try {
      const response = await fetch(
        `/api/progress/${encodeURIComponent(selectedDay)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) throw new Error('Could not clear saved order progress.')
      setProgressMessage(`${selectedDay} order progress cleared`)
    } catch {
      setApiConnected(false)
      setProgressMessage('Could not reach PostgreSQL. Progress was cleared in this browser only.')
    }
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
                selectedDay={selectedDay}
                progressMessage={progressMessage}
                onClearDay={handleClearDay}
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
            isSaving={isSavingRoster}
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
