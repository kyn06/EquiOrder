import { useEffect, useId, useRef, useState } from 'react'

function DropdownSelect({ label, value, options, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const popupId = useId()
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!isOpen) return
    const selectedIndex = options.findIndex((option) => option.value === value)
    optionRefs.current[Math.max(selectedIndex, 0)]?.focus()
  }, [isOpen, options, value])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function moveFocus(event, index) {
    let nextIndex = index
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % options.length
    else if (event.key === 'ArrowUp') nextIndex = (index - 1 + options.length) % options.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = options.length - 1
    else return

    event.preventDefault()
    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`${label}: ${selectedOption?.label ?? ''}`}
        aria-expanded={isOpen}
        aria-controls={popupId}
        className="button-secondary inline-flex min-h-10 min-w-32 items-center justify-between gap-2 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div id={popupId} role="group" aria-label={`${label} options`} className="absolute right-0 z-50 mt-3 max-h-72 w-56 overflow-y-auto rounded-2xl border border-white/80 bg-[#eaf2fc] p-2 neo-raised dark:border-white/10">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element }}
              type="button"
              onClick={() => { onChange(option.value); setIsOpen(false); triggerRef.current?.focus() }}
              onKeyDown={(event) => moveFocus(event, index)}
              aria-pressed={value === option.value}
              className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${value === option.value ? 'bg-blue-100 text-blue-800 dark:bg-[#243b5a] dark:text-blue-200' : 'text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/5'}`}
            >
              {option.label}
              {value === option.value && <span className="size-2 rounded-full bg-blue-600" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DropdownSelect
