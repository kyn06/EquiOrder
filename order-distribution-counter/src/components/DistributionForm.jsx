function DistributionForm({
  activeCount,
  history,
  onOrdersChange,
  onSubmit,
  orders,
}) {
  return (
    <section className="rounded-[30px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#102a5c]">
              Distribute orders
            </h3>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-white/80 bg-[#eaf2fc] px-3 py-1.5 text-xs font-bold text-blue-800 neo-raised-sm">
            {activeCount} available
          </span>
        </div>

        <form
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

          <button
            type="submit"
            disabled={activeCount === 0}
            className="min-h-13 rounded-2xl border border-blue-300/70 bg-linear-to-br from-sky-400 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-none transition duration-150 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            Calculate distribution
          </button>
        </form>

        <section className="mt-5 border-t border-white/80 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-[#102a5c]">
              Recent batches
            </h4>
            <span className="text-xs font-medium text-slate-500">
              Latest {history.length} of 5
            </span>
          </div>

          <div className="neo-inset mt-2 h-44 overflow-y-auto rounded-xl border border-white/80 bg-[#eaf2fc] p-2">
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
        </section>
      </div>
    </section>
  )
}

export default DistributionForm
