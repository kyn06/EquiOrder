import { useCallback, useEffect, useState } from 'react'
import { confirmDestructiveAction, promptNewPassword, showAlert, showToast } from '../../lib/swal'

const refreshIntervalMs = 15_000

const eventLabels = {
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  login_blocked: 'Blocked sign-in (disabled)',
  logout: 'Signed out',
  register: 'Account created',
  admin_disable: 'Account disabled',
  admin_enable: 'Account enabled',
  admin_signout: 'Forced sign-out',
  admin_password: 'Password reset',
}

async function adminRequest(path, options) {
  const response = await fetch(`/api/admin/${path}`, { credentials: 'same-origin', ...options })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Admin request failed.')
  return result
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'
}

function Metric({ label, value, tone = 'text-[#102a5c]', hint }) {
  return (
    <div className="rounded-2xl border border-white/90 bg-[#eaf2fc] p-4 neo-raised-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-slate-500">{hint}</p>}
    </div>
  )
}

function ActionButton({ children, danger = false, ...props }) {
  return (
    <button
      type="button"
      className={`${danger ? 'button-danger' : 'button-secondary'} min-h-9 rounded-lg px-3 py-1.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50`}
      {...props}
    >
      {children}
    </button>
  )
}

function AdminPanel({ currentUserId }) {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const [overviewResult, usersResult, activityResult] = await Promise.all([
        adminRequest('overview'),
        adminRequest('users'),
        adminRequest('activity?limit=50'),
      ])
      setOverview(overviewResult)
      setUsers(usersResult.users)
      setEvents(activityResult.events)
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Could not load admin data.')
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(load, 0)
    const refresh = window.setInterval(load, refreshIntervalMs)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(refresh)
    }
  }, [load])

  async function runAction(user, action, { body, success }) {
    setBusyId(user.id)
    try {
      await adminRequest(`users/${user.id}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      showToast(success)
      await load()
    } catch (actionError) {
      showAlert({ title: 'Action failed', text: actionError.message, icon: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  async function toggleDisabled(user) {
    if (!user.disabled) {
      const confirmed = await confirmDestructiveAction({
        title: `Disable ${user.email}?`,
        text: 'They will be signed out immediately and cannot sign in until re-enabled.',
        confirmButtonText: 'Disable account',
      })
      if (!confirmed) return
    }
    runAction(user, user.disabled ? 'enable' : 'disable', {
      success: user.disabled ? 'Account enabled' : 'Account disabled',
    })
  }

  async function forceSignOut(user) {
    const confirmed = await confirmDestructiveAction({
      title: `Sign out ${user.email}?`,
      text: 'This ends all of their active sessions.',
      confirmButtonText: 'Sign out user',
    })
    if (confirmed) runAction(user, 'signout', { success: 'User signed out' })
  }

  async function resetPassword(user) {
    const password = await promptNewPassword({
      title: `Reset password for ${user.email}`,
      text: 'They will be signed out everywhere. Share the new password with them privately.',
    })
    if (password) runAction(user, 'password', { body: { password }, success: 'Password reset' })
  }

  const counts = overview?.counts
  const dbOk = overview?.database.ok

  return (
    <section className="space-y-6">
      <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#102a5c]">System admin</h2>
            <p className="mt-1 text-sm text-slate-600">
              Monitor system health, users and sign-in activity. Refreshes every {refreshIntervalMs / 1000}s.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border border-white/80 bg-[#eaf2fc] px-3 py-1.5 text-xs font-bold neo-raised-sm ${error ? 'text-rose-700' : 'text-emerald-700'}`}
              role="status"
            >
              <span className={`size-2 rounded-full ${error ? 'bg-rose-600' : 'bg-emerald-600'}`} />
              {error ? 'Unreachable' : overview ? 'Healthy' : 'Checking…'}
            </span>
            <ActionButton onClick={load}>Refresh</ActionButton>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}

        {overview && (
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric label="API server" value="Online" tone="text-emerald-700" hint={`Up ${formatUptime(overview.server.uptimeSeconds)} · Node ${overview.server.nodeVersion}`} />
            <Metric
              label="Database"
              value={dbOk ? 'Connected' : 'Down'}
              tone={dbOk ? 'text-emerald-700' : 'text-rose-700'}
              hint={`${overview.database.latencyMs} ms · ${formatBytes(overview.database.sizeBytes)}`}
            />
            <Metric label="Memory" value={`${overview.server.memoryMb} MB`} hint={`Heap ${overview.server.heapUsedMb} MB`} />
            <Metric label="Active sessions" value={counts.active_sessions} hint={`${counts.online_users} signed-in user${counts.online_users === 1 ? '' : 's'}`} />
            <Metric label="Total users" value={counts.users} hint={`${counts.new_users_7d} new this week`} />
            <Metric label="Logins (24h)" value={counts.logins_24h} tone="text-blue-700" />
            <Metric label="Failed logins (24h)" value={counts.failed_logins_24h} tone={counts.failed_logins_24h > 0 ? 'text-amber-600' : 'text-[#102a5c]'} />
            <Metric label="Disabled accounts" value={counts.disabled} tone={counts.disabled > 0 ? 'text-rose-700' : 'text-[#102a5c]'} hint={`${counts.admins} admin${counts.admins === 1 ? '' : 's'}`} />
          </div>
        )}
      </section>

      <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
        <h3 className="text-xl font-extrabold tracking-tight text-[#102a5c]">Users</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">Sessions</th>
                <th className="px-3 py-2">Teammates</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId
                return (
                  <tr key={user.id} className="border-t border-white/80 align-middle">
                    <td className="px-3 py-3">
                      <p className="font-extrabold text-[#102a5c]">{user.name}{isSelf && <span className="ml-1 text-xs font-bold text-slate-500">(you)</span>}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1">
                        {user.role === 'admin' && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">Admin</span>}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${user.disabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {user.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-600">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-3 py-3 tabular-nums">{user.activeSessions}</td>
                    <td className="px-3 py-3 tabular-nums">{user.teammates}</td>
                    <td className="px-3 py-3 tabular-nums">{user.notes}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <ActionButton disabled={busyId === user.id} onClick={() => resetPassword(user)}>Reset password</ActionButton>
                        <ActionButton disabled={busyId === user.id || user.activeSessions === 0} onClick={() => forceSignOut(user)}>Sign out</ActionButton>
                        <ActionButton
                          danger={!user.disabled}
                          disabled={busyId === user.id || (!user.disabled && (isSelf || user.role === 'admin'))}
                          onClick={() => toggleDisabled(user)}
                        >
                          {user.disabled ? 'Enable' : 'Disable'}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
        <h3 className="text-xl font-extrabold tracking-tight text-[#102a5c]">Recent activity</h3>
        <div className="neo-inset mt-4 max-h-96 overflow-y-auto rounded-xl border border-white/80 bg-[#eaf2fc] p-2">
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-white/80">
              {events.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2.5 text-sm">
                  <span>
                    <span className={`font-extrabold ${entry.event === 'login_failed' || entry.event === 'login_blocked' ? 'text-amber-600' : 'text-[#102a5c]'}`}>
                      {eventLabels[entry.event] ?? entry.event}
                    </span>
                    <span className="ml-2 text-xs text-slate-600">
                      {entry.userEmail || entry.detail || 'unknown'}
                      {entry.actorEmail && ` · by ${entry.actorEmail}`}
                    </span>
                  </span>
                  <time dateTime={entry.createdAt} className="text-xs font-medium text-slate-500">{formatDate(entry.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </section>
  )
}

export default AdminPanel
