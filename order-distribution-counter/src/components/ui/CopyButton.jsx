import { showToast } from '../../lib/swal'

function CopyButton({ text, getText, label, disabled = false, compact = false, onCopy, onUndo, count }) {
  async function handleCopy() {
    if (disabled) return

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.')
      }
      const valueToCopy = getText ? getText() : text
      if (!valueToCopy) return
      await navigator.clipboard.writeText(valueToCopy)
      showToast('Copied!', false)
      onCopy?.()
    } catch {
      showToast('Copy failed. Try selecting the text manually.', true)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={!count}
          aria-label="Undo last audit count"
          title="Undo last count"
          className="button-secondary grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[1.15rem]">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled || (!getText && !text)}
        className={`button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold neo-raised-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'min-w-24' : ''}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
        </svg>
        {label}
        {count !== undefined && (
          <span
            title="Audits today (resets 8:50 AM ET)"
            className="-mr-1 min-w-4 border-l border-slate-400/30 pl-2 text-center text-[11px] font-semibold tabular-nums text-slate-500/70 dark:border-slate-200/25 dark:text-slate-200/80"
          >
            {count}
          </span>
        )}
      </button>
    </div>
  )
}

export default CopyButton
