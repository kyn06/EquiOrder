import { OidDistributionControls } from './OidDistribution'

function DistributionForm({
  team,
  activeCount,
  history,
  selectedDay,
  progressMessage,
  onClearDay,
  onOrdersChange,
  onSubmit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  orders,
  activeTab,
  onTabChange,
  oidInput,
  onOidInputChange,
  onOidCalculate,
  oidMessage,
}) {
  return (
    <section className="flex h-full flex-col rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#102a5c]">
              Distribute orders
            </h3>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-white/80 bg-[#eaf2fc] px-3 py-1.5 text-xs font-bold text-blue-800 neo-raised-sm">
            {selectedDay} · {activeCount} available
          </span>
        </div>

        <div className="mt-5 flex rounded-xl border border-white/80 bg-[#eaf2fc] p-1 neo-inset" role="tablist" aria-label="Distribution type">
          {[['orders', 'Normal calculation'], ['oids', 'Actual OIDs']].map(([tabId, label]) => (
            <button key={tabId} type="button" role="tab" aria-selected={activeTab === tabId} onClick={() => onTabChange(tabId)} className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-xs font-extrabold ${activeTab === tabId ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-white/60 dark:text-slate-300'}`}>{label}</button>
          ))}
        </div>

        {activeTab === 'oids' ? <OidDistributionControls team={team} oidInput={oidInput} onOidInputChange={onOidInputChange} onCalculate={onOidCalculate} message={oidMessage} canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} /> : <form
          onSubmit={onSubmit}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end xl:flex-col xl:items-stretch"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="incoming-orders"
              className="mb-1.5 block text-sm font-bold text-[#254779]"
            >
              Number of incoming orders
            </label>
            <input
              id="incoming-orders"
              type="number"
              min="0"
              step="1"
              value={orders}
              onChange={(event) => onOrdersChange(event.target.value)}
              placeholder="Enter order count"
              className="min-h-13 w-full rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 text-base font-medium text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
              required
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0 xl:justify-end">
            <button
              type="submit"
              disabled={activeCount === 0}
              className="button-primary min-h-13 rounded-2xl px-6 py-3 text-sm font-extrabold shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              Calculate distribution
            </button>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo last distribution"
              title="Undo last distribution"
              className="button-secondary min-h-13 rounded-xl px-4 py-2 text-sm font-bold neo-raised-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo last distribution"
              title="Redo last distribution"
              className="button-secondary min-h-13 rounded-xl px-4 py-2 text-sm font-bold neo-raised-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Redo
            </button>
          </div>
        </form>}

        <section className="mt-5 flex min-h-0 flex-1 flex-col border-t border-white/80 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-[#102a5c]">
              Recent batches
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                Latest {history.length} of 10
              </span>
              <button
                type="button"
                onClick={onClearDay}
                aria-label={`Clear saved order progress for ${selectedDay}`}
                className="button-danger min-h-11 rounded-xl px-3 py-2 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                Clear day
              </button>
            </div>
          </div>

          <div className="neo-inset mt-2 min-h-44 flex-1 overflow-y-auto rounded-xl border border-white/80 bg-[#eaf2fc] p-2">
            {history.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-slate-600">
                No batches yet.
              </p>
            ) : (
              <ol className="divide-y divide-white/80">
                {history.map((batch) => (
                  <li key={batch.id} className="py-2.5 first:pt-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <time
                        dateTime={batch.completedAt}
                        className="text-xs font-medium text-slate-500"
                      >
                        {new Date(batch.completedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                      <span className="shrink-0 font-extrabold tabular-nums text-[#102a5c]">
                        {batch.totalOrders} orders
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate text-xs text-slate-600"
                      title={batch.allocations
                        .map(({ count }) => count)
                        .join(', ')}
                    >
                      {batch.allocations
                        .map(({ count }) => count)
                        .join(', ')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p aria-live="polite" className="mt-2 min-h-4 text-xs font-medium text-slate-500">
            {progressMessage}
          </p>
        </section>
      </div>
    </section>
  )
}

export default DistributionForm
