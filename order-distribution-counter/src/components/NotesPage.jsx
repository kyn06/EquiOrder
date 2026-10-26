import { useState } from 'react'
import CopyButton from './CopyButton'
import {
  actions,
  errorTypes,
  generateCRMLog,
  generateSalesMessage,
  getMessageVersion,
  quickCopyNotes,
  supportsSuggestedFormat,
} from '../utils/notes'

function OutputPreview({ title, value, placeholder, copyLabel, rows }) {
  return (
    <section className="rounded-2xl border border-white/90 bg-[#eaf2fc] p-4 neo-raised-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-[#102a5c]">{title}</h4>
        <CopyButton text={value} label={copyLabel} />
      </div>
      <textarea
        aria-label={`${title} preview`}
        readOnly
        rows={rows}
        value={value}
        placeholder={placeholder}
        className="neo-inset mt-3 w-full resize-y rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-3 font-mono text-sm leading-6 text-[#102a5c] outline-none placeholder:font-sans placeholder:text-slate-500"
      />
    </section>
  )
}

function QuickCopyNotes() {
  return (
    <section className="rounded-[28px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
          Quick copy notes
        </p>
        <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#102a5c]">
          Frequently used text
        </h3>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {quickCopyNotes.map((note, index) => (
          <li
            key={`${index}-${note}`}
            className="flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/90 bg-[#eaf2fc] p-3 neo-raised-sm"
          >
            <p className="min-w-0 break-words font-mono text-xs font-bold leading-5 text-[#254779]">
              {note}
            </p>
            <CopyButton text={note} label="Copy" compact />
          </li>
        ))}
      </ul>
    </section>
  )
}

function NotesPage() {
  const [oid, setOid] = useState('')
  const [errorType, setErrorType] = useState('Others')
  const [action, setAction] = useState('Include')
  const [message, setMessage] = useState('')
  const [isWrongPunctuation, setIsWrongPunctuation] = useState(false)
  const [isMissingCardMessage, setIsMissingCardMessage] = useState(false)
  const [useStandardRequest, setUseStandardRequest] = useState(false)
  const [templateValue, setTemplateValue] = useState('')
  const [timeWindow, setTimeWindow] = useState('')

  const messageVersion = getMessageVersion(errorType)
  const hasSuggestedFormat = supportsSuggestedFormat(errorType)
  const specialCaseNeedsTiming = isWrongPunctuation && !timeWindow
  const overThirtyMinutes = isWrongPunctuation && timeWindow === 'moreThan30'
  const showRequestFields =
    messageVersion === 1 &&
    !isMissingCardMessage &&
    !isWrongPunctuation &&
    (!hasSuggestedFormat || useStandardRequest)
  const showTemplateValue =
    hasSuggestedFormat &&
    !useStandardRequest &&
    (errorType === 'Missing institution name' ||
      errorType === 'Missing special instruction')

  const formData = {
    oid,
    errorType,
    action,
    message,
    isWrongPunctuation,
    isMissingCardMessage,
    useStandardRequest,
    templateValue,
    timeWindow,
  }
  const salesMessage = generateSalesMessage(formData)
  const crmLog = generateCRMLog(formData)

  function handleErrorTypeChange(value) {
    setErrorType(value)
    setAction('Include')
    setMessage('')
    setIsWrongPunctuation(false)
    setIsMissingCardMessage(false)
    setUseStandardRequest(false)
    setTemplateValue('')
    setTimeWindow('')
  }

  function handleSpecialCaseChange(value) {
    setIsWrongPunctuation(value === 'wrongPunctuation')
    setIsMissingCardMessage(value === 'missingCardMessage')
    setAction('Include')
    setMessage('')
    setTimeWindow('')
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
      <section className="order-2 rounded-[28px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6 xl:order-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Sales message generator
          </p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#102a5c]">
            Create a standardized report
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Choose a report type and the Sales and CRM text will update as you fill in the form.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="notes-oid"
              className="mb-1.5 block text-sm font-bold text-[#254779]"
            >
              Order ID (OID)
            </label>
            <input
              id="notes-oid"
              type="text"
              value={oid}
              onChange={(event) => setOid(event.target.value)}
              placeholder="e.g. N-3146-188045-2395 or OID: N-3146-188045-2395"
              autoComplete="off"
              aria-describedby="notes-oid-help"
              className="min-h-12 w-full rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-medium text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
            />
            <p id="notes-oid-help" className="mt-1 text-xs text-slate-600">
              Required for Sales messages and standard CRM logs. The more-than-30-minutes rule does not need an OID.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="notes-error-type"
              className="mb-1.5 block text-sm font-bold text-[#254779]"
            >
              Error type
            </label>
            <select
              id="notes-error-type"
              value={errorType}
              onChange={(event) => handleErrorTypeChange(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              {errorTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600">
              Version {messageVersion}: {messageVersion === 1 ? 'request format' : 'concern format'}
            </p>
          </div>

          {errorType === 'Others' && (
            <div className="sm:col-span-2">
              <label
                htmlFor="notes-special-case"
                className="mb-1.5 block text-sm font-bold text-[#254779]"
              >
                Other report type
              </label>
              <select
                id="notes-special-case"
                value={isWrongPunctuation
                  ? 'wrongPunctuation'
                  : isMissingCardMessage
                    ? 'missingCardMessage'
                    : 'standard'}
                onChange={(event) => handleSpecialCaseChange(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                <option value="standard">Standard request</option>
                <option value="wrongPunctuation">Wrong card message / wrong punctuation</option>
                <option value="missingCardMessage">Missing card message</option>
              </select>
            </div>
          )}

          {hasSuggestedFormat && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-bold text-[#254779]">
                Message format
              </legend>
              <div role="group" aria-label="Message format" className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={!useStandardRequest}
                  onClick={() => setUseStandardRequest(false)}
                  className={`${!useStandardRequest ? 'button-primary' : 'button-secondary'} min-h-11 rounded-xl px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                >
                  Suggested format
                </button>
                <button
                  type="button"
                  aria-pressed={useStandardRequest}
                  onClick={() => setUseStandardRequest(true)}
                  className={`${useStandardRequest ? 'button-primary' : 'button-secondary'} min-h-11 rounded-xl px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                >
                  Standard request
                </button>
              </div>
            </fieldset>
          )}

          {isWrongPunctuation && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-bold text-[#254779]">
                Time from order to report
              </legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={timeWindow === '30OrLess'}
                  onClick={() => setTimeWindow('30OrLess')}
                  className={`${timeWindow === '30OrLess' ? 'button-primary' : 'button-secondary'} min-h-11 rounded-xl px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                >
                  30 minutes or less
                </button>
                <button
                  type="button"
                  aria-pressed={timeWindow === 'moreThan30'}
                  onClick={() => setTimeWindow('moreThan30')}
                  className={`${timeWindow === 'moreThan30' ? 'button-primary' : 'button-secondary'} min-h-11 rounded-xl px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                >
                  More than 30 minutes
                </button>
              </div>
              {specialCaseNeedsTiming && (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Choose a time range to generate the correct report.
                </p>
              )}
            </fieldset>
          )}

          {isMissingCardMessage && (
            <div className="sm:col-span-2">
              <label
                htmlFor="notes-missing-card-message"
                className="mb-1.5 block text-sm font-bold text-[#254779]"
              >
                Missing card message
              </label>
              <textarea
                id="notes-missing-card-message"
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Enter the missing card message"
                className="min-h-20 w-full resize-y rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-medium leading-6 text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
              />
            </div>
          )}

          {showTemplateValue && (
            <div className="sm:col-span-2">
              <label
                htmlFor="notes-template-value"
                className="mb-1.5 block text-sm font-bold text-[#254779]"
              >
                {errorType === 'Missing institution name'
                  ? 'Institution name'
                  : 'Missing special instruction (SI)'}
              </label>
              <textarea
                id="notes-template-value"
                rows={2}
                value={templateValue}
                onChange={(event) => setTemplateValue(event.target.value)}
                placeholder={errorType === 'Missing institution name'
                  ? 'Enter the institution name'
                  : 'Enter the missing special instruction'}
                className="min-h-20 w-full resize-y rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-medium leading-6 text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
              />
            </div>
          )}

          {hasSuggestedFormat && !useStandardRequest && !showTemplateValue && (
            <p className="sm:col-span-2 rounded-xl border border-white/80 bg-[#eaf2fc] px-4 py-3 text-sm font-semibold text-[#254779]">
              The suggested wording will be generated automatically.
            </p>
          )}

          {showRequestFields && (
            <>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-bold text-[#254779]">
                  Action
                </legend>
                <div role="group" aria-label="Request action" className="flex flex-wrap gap-2">
                  {actions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={action === option}
                      onClick={() => setAction(option)}
                      className={`${action === option ? 'button-primary' : 'button-secondary'} min-h-11 min-w-20 rounded-xl px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="sm:col-span-2">
                <label
                  htmlFor="notes-message"
                  className="mb-1.5 block text-sm font-bold text-[#254779]"
                >
                  Request message
                </label>
                <textarea
                  id="notes-message"
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Enter the specific request for Sales"
                  className="min-h-24 w-full resize-y rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-medium leading-6 text-[#102a5c] outline-none neo-inset placeholder:text-slate-500 focus-visible:ring-4 focus-visible:ring-blue-200"
                />
              </div>
            </>
          )}

          {messageVersion === 2 && (
            <p className="sm:col-span-2 rounded-xl border border-white/80 bg-[#eaf2fc] px-4 py-3 text-sm font-semibold text-[#254779]">
              The concern will be generated automatically from the selected error type.
            </p>
          )}

          {overThirtyMinutes && (
            <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              More than 30 minutes: only the Wrong Punctuation CRM log is generated.
            </p>
          )}

          {isWrongPunctuation && timeWindow === '30OrLess' && (
            <p className="sm:col-span-2 rounded-xl border border-white/80 bg-[#eaf2fc] px-4 py-3 text-sm font-semibold text-[#254779]">
              The standard Wrong Punctuation Sales wording will be generated automatically.
            </p>
          )}
        </div>

        <div className="mt-6 space-y-4 border-t border-white/80 pt-5">
          <OutputPreview
            title="Sales message"
            value={salesMessage}
            placeholder={overThirtyMinutes
              ? 'No Sales message for reports more than 30 minutes.'
              : 'Complete the required fields to generate a Sales message.'}
            copyLabel="Copy Sales Message"
            rows={5}
          />
          <OutputPreview
            title="CRM log"
            value={crmLog}
            placeholder="Complete the required fields to generate a CRM log."
            copyLabel="Copy CRM Log"
            rows={2}
          />
        </div>
      </section>

      <div className="order-1 xl:sticky xl:top-6 xl:order-2">
        <QuickCopyNotes />
      </div>
    </div>
  )
}

export default NotesPage
