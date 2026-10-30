import { useEffect, useRef, useState } from 'react'

function CopyButton({ text, getText, label, disabled = false, compact = false }) {
  const [feedback, setFeedback] = useState({ text: null, message: '' })
  const timeoutRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  async function handleCopy() {
    if (disabled) return

    window.clearTimeout(timeoutRef.current)
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.')
      }
      const valueToCopy = getText ? getText() : text
      if (!valueToCopy) return
      await navigator.clipboard.writeText(valueToCopy)
      setFeedback({ text: valueToCopy, message: 'Copied!' })
    } catch {
      setFeedback({ text, message: 'Copy failed. Try selecting the text manually.' })
    }
    timeoutRef.current = window.setTimeout(
      () => setFeedback({ text: null, message: '' }),
      2500,
    )
  }

  const feedbackMessage = feedback.message

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      </button>
      <span
        aria-live="polite"
        className={`text-xs font-semibold ${feedbackMessage.startsWith('Copy failed') ? 'text-red-700' : 'text-green-700'}`}
      >
        {feedbackMessage}
      </span>
    </div>
  )
}

export default CopyButton
