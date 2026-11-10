import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'equiorder.auditCounter'
const CHANGE_EVENT = 'equiorder:audit-counter'
const TIME_ZONE = 'America/New_York'
const RESET_MINUTES = 8 * 60 + 50 // 8:50 AM Eastern

const etFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// Identifies the current counting window. It rolls over at 8:50 AM Eastern
// (DST-aware): before 8:50 we still belong to the previous day's window.
export function getResetPeriod(now = new Date()) {
  const parts = Object.fromEntries(etFormatter.formatToParts(now).map((p) => [p.type, p.value]))
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  if (minutes < RESET_MINUTES) date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function readCount() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (stored?.period === getResetPeriod() && Number.isInteger(stored.count)) return stored.count
  } catch {
    // Storage unavailable or corrupted: start from zero.
  }
  return 0
}

function writeCount(count) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ period: getResetPeriod(), count }))
  } catch {
    // Ignore storage failures; the counter still works for this session.
  }
  // Tell every other counter on this page (storage events only reach other tabs).
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useAuditCounter() {
  const [count, setCount] = useState(readCount)

  // Re-check periodically so the counter resets while the page stays open.
  useEffect(() => {
    const sync = () => setCount(readCount())
    const interval = window.setInterval(sync, 30000)
    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('storage', sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  const increment = useCallback(() => {
    const next = readCount() + 1
    writeCount(next)
    setCount(next)
  }, [])

  const reset = useCallback(() => {
    writeCount(0)
    setCount(0)
  }, [])

  return [count, increment, reset]
}
