import { parseOids } from '../utils/oidDistribution'

export function OidDistributionControls({ team, oidInput, onOidInputChange, onCalculate, message, canUndo, canRedo, onUndo, onRedo }) {
  const oidCount = parseOids(oidInput).length
  const workingCount = team.filter((person) => person.status === 'working').length

  return (
    <form onSubmit={onCalculate} className="mt-5">
      <label htmlFor="dashboard-oid-input" className="mb-1.5 block text-sm font-bold text-[#254779]">OIDs</label>
      <textarea id="dashboard-oid-input" value={oidInput} onChange={(event) => onOidInputChange(event.target.value)} placeholder={'Paste OIDs here, one per line\nN-3162-967688-4058\nN-3162-961686-5364'} rows={8} className="min-h-48 w-full resize-y rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-mono text-sm text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">{oidCount} OID{oidCount === 1 ? '' : 's'} detected</span>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={oidCount === 0 || workingCount === 0} className="button-primary min-h-12 rounded-2xl px-6 py-3 text-sm font-extrabold shadow-none disabled:cursor-not-allowed disabled:opacity-50">Calculate OID distribution</button>
          <button type="button" onClick={onUndo} disabled={!canUndo} className="button-secondary min-h-12 rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">Undo</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} className="button-secondary min-h-12 rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">Redo</button>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 min-h-4 text-xs font-semibold text-slate-500">{message}</p>
    </form>
  )
}

export function AssignedOids({ assignments, onCopy }) {
  if (!assignments?.length) return null

  return (
    <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-xl font-extrabold tracking-tight text-[#102a5c]">Assigned OIDs</h3><p className="mt-1 text-sm text-slate-600">Copy a teammate’s OIDs and paste them into Google Sheets.</p></div>
        <button type="button" onClick={() => onCopy(assignments.flatMap(({ oids }) => oids), 'All OIDs')} className="button-secondary min-h-11 rounded-xl px-4 py-2 text-sm font-bold neo-raised-sm">Copy all OIDs</button>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assignments.map((assignment) => (
          <section key={assignment.id} className="overflow-hidden rounded-2xl border border-white/90 bg-[#eaf2fc] neo-raised-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/90 px-4 py-3"><div><h4 className="font-extrabold text-[#102a5c]">{assignment.name}</h4><p className="text-xs font-semibold text-slate-500">{assignment.oids.length} OID{assignment.oids.length === 1 ? '' : 's'}</p></div><button type="button" onClick={() => onCopy(assignment.oids, assignment.name)} disabled={assignment.oids.length === 0} className="button-primary rounded-lg px-3 py-2 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50">Copy</button></div>
            <div className="max-h-80 overflow-y-auto p-3"><table className="w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt' }}><tbody>{assignment.oids.map((oid, index) => <tr key={`${oid}-${index}`}><td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{oid}</td></tr>)}</tbody></table>{assignment.oids.length === 0 && <p className="py-4 text-center text-xs font-semibold text-slate-500">No OIDs assigned.</p>}</div>
          </section>
        ))}
      </div>
    </section>
  )
}
