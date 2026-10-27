import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import DistributionForm from './components/DistributionForm'
import DropdownSelect from './components/DropdownSelect'
import LoginPage from './components/LoginPage'
import NotesPage from './components/NotesPage'
import ProfileDropdown from './components/ProfileDropdown'
import Sidebar from './components/Sidebar'
import StatCard from './components/StatCard'
import TeamEditor from './components/TeamEditor'
import TeamTable from './components/TeamTable'
import { distributeOrders } from './utils/distribution'

const initialTeam = []

const dailyRosterStorageKey = 'equiorder-daily-rosters-v1'
const dailyProgressStorageKey = 'equiorder-daily-progress-v1'
const selectedWeekdayStorageKey = 'equiorder-selected-weekday-v1'
const activePageStorageKey = 'equiorder-active-page-v1'
const distributionActionsStorageKey = 'equiorder-distribution-actions-v1'
const maxDistributionUndoSteps = 20
const initialAccountEmail = 'pjkim.garcia@gmail.com'
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

function formatEasternTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date)
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

function getInitialActivePage() {
  if (typeof window !== 'undefined') {
    try {
      const savedPage = window.localStorage.getItem(activePageStorageKey)
      if (['dashboard', 'team', 'notes'].includes(savedPage)) {
        return savedPage
      }
    } catch {
      // Fall back to the dashboard when browser storage is unavailable.
    }
  }

  return 'dashboard'
}

function accountStorageKey(key, userId) {
  return `${key}-${userId}`
}

function readDailyRosters(userId) {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = window.localStorage.getItem(accountStorageKey(dailyRosterStorageKey, userId))
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

function cacheDailyRosters(rosters, userId) {
  try {
    window.localStorage.setItem(accountStorageKey(dailyRosterStorageKey, userId), JSON.stringify(rosters))
  } catch {
    // PostgreSQL remains the primary store if the browser cache is unavailable.
  }
}

function readDailyProgress(userId) {
  if (typeof window === 'undefined') return {}

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(accountStorageKey(dailyProgressStorageKey, userId)) || '{}',
    )
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

function cacheDailyProgress(progress, userId) {
  try {
    window.localStorage.setItem(accountStorageKey(dailyProgressStorageKey, userId), JSON.stringify(progress))
  } catch {
    // PostgreSQL remains the primary store if the browser cache is unavailable.
  }
}

function isDistributionSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.team) &&
      (snapshot.allocations === null ||
        (typeof snapshot.allocations === 'object' &&
          !Array.isArray(snapshot.allocations))) &&
      Array.isArray(snapshot.distributionHistory) &&
      typeof snapshot.orders === 'string',
  )
}

function readDistributionActions(day, userId) {
  if (typeof window === 'undefined') return { undo: [], redo: [] }

  try {
    const stored = window.localStorage.getItem(`${distributionActionsStorageKey}-${userId}-${day}`)
    const parsed = JSON.parse(stored || '{}')
    return {
      undo: Array.isArray(parsed.undo)
        ? parsed.undo.filter(isDistributionSnapshot).slice(-maxDistributionUndoSteps)
        : [],
      redo: Array.isArray(parsed.redo)
        ? parsed.redo.filter(isDistributionSnapshot).slice(-maxDistributionUndoSteps)
        : [],
    }
  } catch {
    return { undo: [], redo: [] }
  }
}

function cacheDistributionActions(day, undo, redo, userId) {
  try {
    window.localStorage.setItem(
      `${distributionActionsStorageKey}-${userId}-${day}`,
      JSON.stringify({ undo, redo }),
    )
  } catch {
    // Keep distribution undo history in memory when browser storage is unavailable.
  }
}

function adoptLegacyBrowserCache(user) {
  if (user.email.toLowerCase() !== initialAccountEmail) return
  try {
    const storageMigrations = [dailyRosterStorageKey, dailyProgressStorageKey]
    for (const key of storageMigrations) {
      const accountKey = accountStorageKey(key, user.id)
      if (window.localStorage.getItem(accountKey) === null) {
        const legacyValue = window.localStorage.getItem(key)
        if (legacyValue !== null) window.localStorage.setItem(accountKey, legacyValue)
      }
    }

    for (const day of weekdays) {
      const legacyKey = `${distributionActionsStorageKey}-${day}`
      const accountKey = `${distributionActionsStorageKey}-${user.id}-${day}`
      if (window.localStorage.getItem(accountKey) === null) {
        const legacyValue = window.localStorage.getItem(legacyKey)
        if (legacyValue !== null) window.localStorage.setItem(accountKey, legacyValue)
      }
    }
  } catch {
    // Database data remains available if browser storage cannot be read.
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
    completed: orderCounts.get(person.id)?.completed ?? person.completed ?? 0,
    pending: orderCounts.get(person.id)?.pending ?? person.pending ?? 0,
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

function DashboardApp({ user, onLogout }) {
  const [isDark, setIsDark] = useState(getInitialTheme)
  const [easternTime, setEasternTime] = useState(() => formatEasternTime(new Date()))
  const [savedRosters, setSavedRosters] = useState(() => readDailyRosters(user.id))
  const [savedProgress, setSavedProgress] = useState(() => readDailyProgress(user.id))
  const savedProgressRef = useRef(savedProgress)
  const [selectedDay, setSelectedDay] = useState(getInitialSelectedDay)
  const selectedDayRef = useRef(selectedDay)
  const breakAlertRef = useRef({ date: '', events: new Set() })
  const [team, setTeam] = useState(() =>
    savedRosters[selectedDay]
      ? hydrateDayRoster(
          savedRosters[selectedDay],
          savedProgress[selectedDay],
        )
      : initialTeam,
  )
  const [activePage, setActivePage] = useState(getInitialActivePage)
  const [rosterSaved, setRosterSaved] = useState(
    Boolean(savedRosters[selectedDay]),
  )
  const [saveError, setSaveError] = useState('')
  const [isSavingRoster, setIsSavingRoster] = useState(false)
  const [copiedRoster, setCopiedRoster] = useState(null)
  const [copyPasteMessage, setCopyPasteMessage] = useState('')
  const [apiConnected, setApiConnected] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [orders, setOrders] = useState('')
  const [allocations, setAllocations] = useState(
    () => savedProgress[selectedDay]?.allocations ?? null,
  )
  const [distributionHistory, setDistributionHistory] = useState(
    () => savedProgress[selectedDay]?.recentBatches ?? [],
  )
  const [distributionUndoStack, setDistributionUndoStack] = useState(
    () => readDistributionActions(selectedDay, user.id).undo,
  )
  const [distributionRedoStack, setDistributionRedoStack] = useState(
    () => readDistributionActions(selectedDay, user.id).redo,
  )

  useEffect(() => {
    const guardState = { equiorderDashboard: true }
    window.history.pushState(guardState, '', window.location.href)

    function keepDashboardOpen() {
      window.history.pushState(guardState, '', window.location.href)
    }

    window.addEventListener('popstate', keepDashboardOpen)
    return () => window.removeEventListener('popstate', keepDashboardOpen)
  }, [])

  useEffect(() => {
    cacheDistributionActions(selectedDay, distributionUndoStack, distributionRedoStack, user.id)
  }, [distributionRedoStack, distributionUndoStack, selectedDay, user.id])

  useEffect(() => {
    const clock = window.setInterval(() => {
      setEasternTime(formatEasternTime(new Date()))
    }, 1000)

    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    function applyScheduledStatuses() {
      const now = new Date()
      const currentWeekday = getEasternWeekday()
      const currentDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now)
      if (breakAlertRef.current.date !== currentDate) {
        breakAlertRef.current = { date: currentDate, events: new Set() }
      }
      const currentDayIsSelected = currentWeekday === selectedDay
      const savedCurrentRoster = savedRosters[currentWeekday]
      const scheduledRoster = currentDayIsSelected
        ? team
        : savedCurrentRoster
      if (!scheduledRoster) return

      const timeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(now)
      const currentMinute =
        Number(timeParts.find((part) => part.type === 'hour')?.value ?? 0) * 60 +
        Number(timeParts.find((part) => part.type === 'minute')?.value ?? 0)
      const getScheduledMinute = (time) => {
        if (!time) return null
        const [hour, minute] = time.split(':').map(Number)
        return hour * 60 + minute
      }
      const transitions = []
      const updatedRoster = scheduledRoster.map((person) => {
        const breakMinute = getScheduledMinute(person.breakStartTime)
        const returnMinute = getScheduledMinute(person.returnTime)
        const returnDue = returnMinute !== null && currentMinute >= returnMinute - 5

        if (person.status === 'break' && returnDue) {
          transitions.push({ id: person.id, name: person.name, status: 'working' })
          return { ...person, status: 'working' }
        }

        const breakDue = breakMinute !== null && currentMinute >= breakMinute - 5
        if (person.status === 'working' && breakDue && !returnDue) {
          transitions.push({ id: person.id, name: person.name, status: 'break' })
          return { ...person, status: 'break' }
        }

        return person
      })

      if (transitions.length === 0) return

      if (currentDayIsSelected) {
        const updatedTeam = team.map((person) => {
          const transitioned = transitions.find((entry) => entry.id === person.id)
          return transitioned ? { ...person, status: transitioned.status } : person
        })
        setTeam(updatedTeam)
        setAllocations(null)
        rememberProgress(selectedDay, updatedTeam, null, distributionHistory)
      }
      const transitionMessages = transitions.map(({ name, status }) =>
        status === 'break' ? `${name} is now on break` : `${name} returned to work`,
      )
      setProgressMessage(
        `${currentDayIsSelected ? '' : `${currentWeekday}: `}${transitionMessages.join('; ')} automatically 5 minutes before the scheduled time.`,
      )

      const newlyOnBreak = transitions.filter(({ id, status }) => {
        if (status !== 'break') return false
        const teammate = scheduledRoster.find((person) => person.id === id)
        const eventKey = `${id}:${teammate?.breakStartTime ?? ''}`
        if (breakAlertRef.current.events.has(eventKey)) return false
        breakAlertRef.current.events.add(eventKey)
        return true
      })
      if (newlyOnBreak.length > 0) {
        const names = updatedRoster
          .filter(({ status }) => status === 'break')
          .map(({ name }) => name)
        const isDark = document.documentElement.classList.contains('dark')
        Swal.fire({
          title: names.length === 1 ? `${names[0]} is on break` : 'Teammates on break',
          text: `Currently on break: ${names.join(', ')}.`,
          icon: 'info',
          confirmButtonText: 'OK',
          confirmButtonColor: isDark ? '#2563eb' : '#1d4ed8',
          background: isDark ? '#172235' : '#eaf2fc',
          color: isDark ? '#eaf2fc' : '#102a5c',
        })
      }

      const canPersist = savedCurrentRoster && (!currentDayIsSelected || rosterSaved)
      if (!canPersist) return

      const updatedRosters = { ...savedRosters, [currentWeekday]: updatedRoster }
      setSavedRosters(updatedRosters)
      cacheDailyRosters(updatedRosters, user.id)
      if (currentDayIsSelected) setRosterSaved(true)

      if (apiConnected) {
        fetch(`/api/rosters/${encodeURIComponent(currentWeekday)}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roster: updatedRoster }),
        }).then((response) => {
          if (!response.ok) throw new Error('Could not save scheduled status.')
        }).catch(() => {
          setApiConnected(false)
          setProgressMessage(
            'Scheduled status changed and saved in this browser. PostgreSQL could not be reached.',
          )
        })
      }
    }

    applyScheduledStatuses()
    const schedule = window.setInterval(applyScheduledStatuses, 15_000)
    return () => window.clearInterval(schedule)
  }, [apiConnected, distributionHistory, rosterSaved, savedRosters, selectedDay, team, user.id])

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
    updatedAt: savedProgress[selectedDay]?.updatedAt ?? null,
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#172235' : '#eee1cd')

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
    try {
      window.localStorage.setItem(activePageStorageKey, activePage)
    } catch {
      // Keep the selected page active for this session if storage is unavailable.
    }
  }, [activePage])

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
        const cachedRosters = readDailyRosters(user.id)
        const cachedProgress = readDailyProgress(user.id)

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
          const databaseTimestamp = Date.parse(databaseProgress[weekday]?.updatedAt ?? '')
          const cachedTimestamp = Date.parse(progress.updatedAt ?? '')
          const cachedBatchTimestamp = Date.parse(
            progress.recentBatches?.[0]?.completedAt ?? '',
          )
          const databaseBatchTimestamp = Date.parse(
            databaseProgress[weekday]?.recentBatches?.[0]?.completedAt ?? '',
          )
          const cachedIsNewer = Number.isFinite(cachedTimestamp)
            ? !Number.isFinite(databaseTimestamp) || cachedTimestamp > databaseTimestamp
            : (Number.isFinite(cachedBatchTimestamp) &&
                (!Number.isFinite(databaseBatchTimestamp) ||
                  cachedBatchTimestamp > databaseBatchTimestamp)) ||
              (progress.recentBatches?.length ?? 0) >
                (databaseProgress[weekday]?.recentBatches?.length ?? 0)

          if (!databaseProgress[weekday] || cachedIsNewer) {
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
            const migrationResult = await migrationResponse.json()
            databaseProgress[weekday] = migrationResult.progress ?? progress
          }
        }

        if (cancelled) return

        setSavedRosters(databaseRosters)
        setSavedProgress(databaseProgress)
        savedProgressRef.current = databaseProgress
        cacheDailyRosters(databaseRosters, user.id)
        cacheDailyProgress(databaseProgress, user.id)
        const activeDay = selectedDayRef.current
        const activeRoster = databaseRosters[activeDay]?.length
          ? databaseRosters[activeDay]
          : cachedRosters[activeDay]?.length
            ? cachedRosters[activeDay]
            : []
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
  }, [user.id])

  useEffect(() => {
    const progress = JSON.parse(orderProgressPayload)
    if (!apiConnected || team.length === 0) return undefined

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
    team.length,
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
      updatedAt: new Date().toISOString(),
    }
    const updated = { ...savedProgressRef.current, [day]: progress }
    savedProgressRef.current = updated
    setSavedProgress(updated)
    cacheDailyProgress(updated, user.id)
  }

  function clearDistributionActions() {
    setDistributionUndoStack([])
    setDistributionRedoStack([])
  }

  function undoDistribution() {
    if (distributionUndoStack.length === 0) return

    const snapshot = distributionUndoStack[distributionUndoStack.length - 1]
    const currentSnapshot = { team, allocations, distributionHistory, orders }
    setDistributionUndoStack(distributionUndoStack.slice(0, -1))
    setDistributionRedoStack((redoStack) => [
      ...redoStack.slice(-(maxDistributionUndoSteps - 1)),
      currentSnapshot,
    ])
    setTeam(snapshot.team)
    setAllocations(snapshot.allocations)
    setDistributionHistory(snapshot.distributionHistory)
    setOrders(snapshot.orders)
    rememberProgress(
      selectedDay,
      snapshot.team,
      snapshot.allocations,
      snapshot.distributionHistory,
    )
  }

  function redoDistribution() {
    if (distributionRedoStack.length === 0) return

    const snapshot = distributionRedoStack[distributionRedoStack.length - 1]
    const currentSnapshot = { team, allocations, distributionHistory, orders }
    setDistributionRedoStack(distributionRedoStack.slice(0, -1))
    setDistributionUndoStack((undoStack) => [
      ...undoStack.slice(-(maxDistributionUndoSteps - 1)),
      currentSnapshot,
    ])
    setTeam(snapshot.team)
    setAllocations(snapshot.allocations)
    setDistributionHistory(snapshot.distributionHistory)
    setOrders(snapshot.orders)
    rememberProgress(
      selectedDay,
      snapshot.team,
      snapshot.allocations,
      snapshot.distributionHistory,
    )
  }

  function updateTeamStatus(id, status) {
    clearDistributionActions()
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

    clearDistributionActions()

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
    clearDistributionActions()
    const updatedTeam = team.map((person) =>
      person.id === id ? { ...person, name } : person,
    )
    setTeam(updatedTeam)
    rememberProgress(selectedDay, updatedTeam, allocations, distributionHistory)
    setRosterSaved(false)
  }

  function updateBreakTime(id, field, value) {
    clearDistributionActions()
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

  function copyCurrentTeam() {
    setCopiedRoster(team.map(({ id, name, status, breakStartTime, returnTime }) => ({
      id,
      name,
      status,
      breakStartTime,
      returnTime,
    })))
    setCopyPasteMessage(`Copied the ${selectedDay} team. Select another weekday and paste it.`)
  }

  function pasteCopiedTeam() {
    if (!copiedRoster) return

    clearDistributionActions()

    let nextId = team.reduce((highest, person) => Math.max(highest, person.id), 0) + 1
    const pastedTeam = copiedRoster.map((person, index) => {
      const destinationPerson = team[index]
      return {
        ...person,
        id: destinationPerson?.id ?? nextId++,
        completed: destinationPerson?.completed ?? 0,
        pending: destinationPerson?.pending ?? 0,
      }
    })

    setTeam(pastedTeam)
    setRosterSaved(false)
    setSaveError('')
    setCopyPasteMessage(`Pasted the team into ${selectedDay}. Select Save day to keep it.`)
  }

  function loadDay(day) {
    const distributionActions = readDistributionActions(day, user.id)
    const savedRoster = savedRosters[day]
    const dayProgress = savedProgressRef.current[day]
    const rosterToLoad = savedRoster ?? team.map((person) => ({
      ...person,
      status: 'working',
      breakStartTime: '',
      returnTime: '',
    }))
    const nextTeam = hydrateDayRoster(rosterToLoad, dayProgress)

    setDistributionUndoStack(distributionActions.undo)
    setDistributionRedoStack(distributionActions.redo)
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
    const roster = team.map(({ id, name, status, completed, pending, breakStartTime, returnTime }) => ({
      id,
      name,
      status,
      completed,
      pending,
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
      cacheDailyRosters(updatedRosters, user.id)
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

    clearDistributionActions()

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

  function handleReorderTeamMember(sourceId, targetId) {
    const sourceIndex = team.findIndex((person) => person.id === sourceId)
    const targetIndex = team.findIndex((person) => person.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return

    clearDistributionActions()
    const reorderedTeam = [...team]
    const [movedPerson] = reorderedTeam.splice(sourceIndex, 1)
    reorderedTeam.splice(targetIndex, 0, movedPerson)
    setTeam(reorderedTeam)
    setRosterSaved(false)
    setSaveError('')
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

    clearDistributionActions()

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

    setDistributionUndoStack((undoStack) => [
      ...undoStack.slice(-(maxDistributionUndoSteps - 1)),
      { team, allocations, distributionHistory, orders },
    ])
    setDistributionRedoStack([])

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
    ].slice(0, 10)
    setDistributionHistory(updatedHistory)
    rememberProgress(selectedDay, balancedTeam, result, updatedHistory)
    setOrders('')
  }

  function handleOrdersInput(value) {
    setOrders(value)
    setAllocations(null)
    setDistributionRedoStack([])
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
      updatedAt: new Date().toISOString(),
    }

    setTeam(clearedTeam)
    clearDistributionActions()
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
    cacheDailyProgress(updatedProgress, user.id)

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
                {activePage === 'notes' ? 'Sales & CRM notes' : 'Order distribution'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Sidebar activePage={activePage} onNavigate={setActivePage} />
            <ProfileDropdown
              name={user.name}
              email={user.email}
              onLogout={async () => {
                try {
                  const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                  })
                  if (!response.ok) throw new Error('Could not sign out.')
                  onLogout()
                } catch {
                  Swal.fire({
                    title: 'Could not sign out',
                    text: 'Check your connection and try again.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#1d4ed8',
                  })
                }
              }}
            />
            <button
              type="button"
              onClick={() => setIsDark((current) => !current)}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              aria-pressed={isDark}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="button-secondary grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95"
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
            <span
              className="hidden min-h-10 items-center rounded-full border border-white/80 bg-[#eaf2fc] px-4 py-2 text-xs font-bold tabular-nums text-emerald-700 neo-raised-sm sm:inline-flex"
              title="Current Eastern Time"
            >
              {easternTime}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-10">
        {activePage !== 'notes' && (
          <section className="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-end">
            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/80 bg-[#eaf2fc] px-4 py-2 text-sm font-semibold text-[#254779] neo-raised-sm">
                <span className="size-2 rounded-full bg-blue-600" />
                {team.length} {team.length === 1 ? 'teammate' : 'teammates'}
              </div>
              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 text-xs font-bold text-slate-700 neo-inset">
                <span>Day</span>
                <DropdownSelect
                  label="Day"
                  value={selectedDay}
                  onChange={selectDay}
                  options={weekdays.map((weekday) => ({ value: weekday, label: weekday }))}
                />
              </div>
            </div>
          </section>
        )}

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
                canUndo={distributionUndoStack.length > 0}
                canRedo={distributionRedoStack.length > 0}
                onUndo={undoDistribution}
                onRedo={redoDistribution}
                orders={orders}
                onOrdersChange={handleOrdersInput}
              />

              <TeamTable
                team={team}
                allocations={allocations}
                onOrderCountChange={updateOrderCount}
              />
            </div>
          </>
        ) : activePage === 'team' ? (
          <TeamEditor
            team={team}
            selectedDay={selectedDay}
            weekdays={weekdays}
            rosterSaved={rosterSaved}
            saveError={saveError}
            isSaving={isSavingRoster}
            hasCopiedRoster={Boolean(copiedRoster)}
            copyPasteMessage={copyPasteMessage}
            onAddTeamMember={handleAddTeamMember}
            onRemoveTeamMember={handleRemoveTeamMember}
            onReorderTeamMember={handleReorderTeamMember}
            onDaySelect={selectDay}
            onSaveDay={saveCurrentDay}
            onCopyTeam={copyCurrentTeam}
            onPasteTeam={pasteCopiedTeam}
            onNameChange={updateTeamName}
            onOrderCountChange={updateOrderCount}
            onBreakTimeChange={updateBreakTime}
            onStatusChange={updateTeamStatus}
          />
        ) : (
          <NotesPage userId={user.id} />
        )}

        <footer className="py-6 text-center text-xs font-semibold text-slate-500">
          EquiOrder · Fair orders, smarter distribution.
        </footer>
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 401) return null
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not check your session.')
        return result.user
      })
      .then((authenticatedUser) => {
        if (cancelled) return
        if (authenticatedUser) {
          adoptLegacyBrowserCache(authenticatedUser)
          setUser(authenticatedUser)
        }
      })
      .catch(() => {
        if (!cancelled) setAuthError('Could not connect to EquiOrder. Start the API server and try again.')
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false)
      })
    return () => { cancelled = true }
  }, [])

  function handleAuthenticated(authenticatedUser) {
    adoptLegacyBrowserCache(authenticatedUser)
    setAuthError('')
    setUser(authenticatedUser)
  }

  if (isCheckingSession) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-[#102a5c]">
        <div className="rounded-2xl border border-white/90 bg-[#eaf2fc] px-6 py-5 text-sm font-bold neo-raised-sm" role="status">
          Loading your workspace…
        </div>
      </main>
    )
  }

  return user
    ? <DashboardApp user={user} onLogout={() => setUser(null)} />
    : <LoginPage onAuthenticated={handleAuthenticated} initialError={authError} />
}

export default App
