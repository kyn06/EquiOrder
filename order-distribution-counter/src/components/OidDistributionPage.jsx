import { useEffect, useMemo, useRef, useState } from 'react'
import { distributeOrders } from '../utils/distribution'

function parseOids(value) {
  return value
    .split(/\r?\n/)
    .map((oid) => oid.trim())
    .filter(Boolean)
}

function OidDistributionPage({ team, selectedDay }) {
  const [oidInput, setOidInput] = useState('')
  const [assignments, setAssignments] = useState([])
  const [message, setMessage] = useState('')
  const [copiedTarget, setCopiedTarget] = useState('')
  const copyTimeoutRef = useRef(null)

  useEffect(() => () => window.clearTimeout(copyTimeoutRef.current), [])

  const oidCount = useMemo(() => parseOids(oidInput).length, [oidInput])
  const workingCount = team.filter((person) => person.status === 'working').length

  function calculateDistribution(event) {
    event.preventDefault()
    const oids = parseOids(oidInput)

    if (oids.length === 0 || workingCount === 0) {
      setAssignments([])
      setMessage(workingCount === 0 ? 'No teammates are currently working.' : 'Paste at least one OID.')
      return
    }

    const allocations = distributeOrders(team, oids.length)
    let oidIndex = 0
    const nextAssignments = team
      .filter((person) => person.status === 'working')
      .map((person) => {
        const count = allocations[person.id] ?? 0
        const assignedOids = oids.slice(oidIndex, oidIndex + count)
        oidIndex += count
        return { ...person, oids: assignedOids }
      })

    setAssignments(nextAssignments)
    setMessage(`${oids.length} OID${oids.length === 1 ? '' : 's'} distributed across ${workingCount} working teammate${workingCount === 1 ? '' : 's'}.`)
  }

  async function copyOids(oids, teammateName = 'OIDs', target = teammateName) {
    try {
      await navigator.clipboard.writeText(oids.join('\n'))
      setMessage(`${teammateName} copied. Paste into Google Sheets for one OID per cell.`)
      setCopiedTarget(target)
      window.clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = window.setTimeout(() => setCopiedTarget(''), 2000)
      return true
    } catch {
      setMessage('Copy failed. Select the OIDs and copy them manually.')
      return false
    }
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#102a5c]">OID Distribution</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Paste one actual OID per line, such as N-3162-967688-4058. The same distribution rules as the dashboard will assign them to working teammates.
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-white/80 bg-[#eaf2fc] px-3 py-1.5 text-xs font-bold text-blue-800 neo-raised-sm">
            {selectedDay} · {workingCount} available
          </span>
        </div>

        <form onSubmit={calculateDistribution} className="mt-5">
          <label htmlFor="oid-input" className="mb-1.5 block text-sm font-bold text-[#254779]">
            OIDs
          </label>
          <textarea
            id="oid-input"
            value={oidInput}
            onChange={(event) => setOidInput(event.target.value)}
            placeholder={'Paste OIDs here, one per line\nN-3162-967688-4058\nN-3162-961686-5364'}
            rows={8}
            className="min-h-48 w-full resize-y rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-mono text-sm text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">
              {oidCount} OID{oidCount === 1 ? '' : 's'} detected
            </span>
            <button
              type="submit"
              disabled={oidCount === 0 || workingCount === 0}
              className="button-primary min-h-12 rounded-2xl px-6 py-3 text-sm font-extrabold shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              Calculate OID distribution
            </button>
          </div>
        </form>
        <p aria-live="polite" className="mt-3 min-h-4 text-xs font-semibold text-slate-500">{message}</p>
      </section>

      {assignments.length > 0 && (
        <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-[#102a5c]">Assigned OIDs</h3>
              <p className="mt-1 text-sm text-slate-600">Copy a teammate’s OIDs and paste them into Google Sheets.</p>
            </div>
            <button
              type="button"
              onClick={() => copyOids(assignments.flatMap(({ oids }) => oids), 'All OIDs', 'all')}
              className="button-secondary min-h-11 rounded-xl px-4 py-2 text-sm font-bold neo-raised-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {copiedTarget === 'all' ? 'Copied!' : 'Copy all OIDs'}
            </button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => (
              <section key={assignment.id} className="overflow-hidden rounded-2xl border border-white/90 bg-[#eaf2fc] neo-raised-sm">
                <div className="flex items-center justify-between gap-3 border-b border-white/90 px-4 py-3">
                  <div>
                    <h4 className="font-extrabold text-[#102a5c]">{assignment.name}</h4>
                    <p className="text-xs font-semibold text-slate-500">{assignment.oids.length} OID{assignment.oids.length === 1 ? '' : 's'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyOids(assignment.oids, assignment.name, assignment.id)}
                    disabled={assignment.oids.length === 0}
                    className="button-primary rounded-lg px-3 py-2 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copiedTarget === assignment.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-3">
                  {assignment.oids.length > 0 ? (
                    <table className="w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt' }}>
                      <tbody>
                        {assignment.oids.map((oid, index) => (
                          <tr key={`${oid}-${index}`}>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>
                              {oid}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-4 text-center text-xs font-semibold text-slate-500">No OIDs assigned.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}

export default OidDistributionPage
