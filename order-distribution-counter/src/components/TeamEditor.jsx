function TeamEditor({
  team,
  selectedDay,
  weekdays,
  rosterSaved,
  saveError,
  isSaving,
  hasCopiedRoster,
  copyPasteMessage,
  onAddTeamMember,
  onRemoveTeamMember,
  onDaySelect,
  onSaveDay,
  onCopyTeam,
  onPasteTeam,
  onNameChange,
  onOrderCountChange,
  onBreakTimeChange,
  onStatusChange,
}) {
  const orderedTeam = [...team].sort((first, second) => {
    if (!first.breakStartTime) return second.breakStartTime ? 1 : 0
    if (!second.breakStartTime) return -1
    return first.breakStartTime.localeCompare(second.breakStartTime)
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/90 bg-[#eaf2fc] p-5 neo-raised sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Roster settings
            </p>
            <h3 className="mt-1 text-lg font-extrabold tracking-tight text-[#102a5c]">
              Manage weekday roster
            </h3>
          </div>
        </div>

        <div className="mt-5 border-t border-white/90 pt-5">
          <div className="space-y-2">
            <label
              htmlFor="roster-weekday"
              className="block text-sm font-bold text-[#254779]"
            >
              Roster weekday
            </label>
            <p className="-mt-1 text-xs leading-5 text-slate-600">
              Save stores names, status, and EST break times; order counts stay session-only.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                id="roster-weekday"
                value={selectedDay}
                onChange={(event) => onDaySelect(event.target.value)}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/90 bg-[#eaf2fc] px-4 py-3 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200 sm:basis-48"
              >
                {weekdays.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekday}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onCopyTeam}
                className="button-secondary min-h-12 shrink-0 rounded-2xl px-4 py-3 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Copy team
              </button>
              <button
                type="button"
                onClick={onPasteTeam}
                disabled={!hasCopiedRoster}
                className="button-secondary min-h-12 shrink-0 rounded-2xl px-4 py-3 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Paste team
              </button>
              <button
                type="button"
                onClick={onSaveDay}
                disabled={isSaving}
                className="button-primary min-h-12 shrink-0 rounded-2xl px-5 py-3 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save day'}
              </button>
            </div>
            <p aria-live="polite" className="min-h-5 text-xs font-medium text-slate-600">
              {saveError ||
                (rosterSaved
                  ? `Saved for ${selectedDay}`
                  : 'Unsaved roster changes')}
            </p>
            <p aria-live="polite" className="min-h-5 text-xs font-medium text-slate-600">
              {copyPasteMessage || 'Copy names, status, and break times to another weekday. Order counts stay with each day.'}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-white/90 bg-[#eaf2fc] neo-raised">
        <div className="border-b border-white/90 px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            Team roster
          </p>
          <h3 className="mt-1 text-lg font-extrabold tracking-tight text-[#102a5c]">
            Teammate details
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Sorted by break start time, earliest to latest. Unscheduled breaks appear last.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-250 text-left text-sm">
            <thead>
              <tr className="border-b border-white/90 text-xs font-extrabold uppercase tracking-wide text-slate-600">
                <th className="w-42 px-3 py-2.5">Name</th>
                <th className="w-32 px-2 py-2.5 text-center">Status</th>
                <th className="w-30 px-2 py-2.5 text-center">Completed</th>
                <th className="w-32 px-2 py-2.5 text-center">Pending</th>
                <th className="w-25 px-2 py-2.5 text-center">Break started (EST)</th>
                <th className="w-25 px-3 py-2.5 text-center">Returned at (EST)</th>
              </tr>
            </thead>
            <tbody>
              {orderedTeam.map((person) => (
                <tr
                  key={person.id}
                  className="border-b border-white/80 transition-colors last:border-0 hover:bg-white/25"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-52 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRemoveTeamMember(person.id)}
                        disabled={team.length <= 1}
                        aria-label={`Remove ${person.name}`}
                        title={
                          team.length <= 1
                            ? 'At least one teammate is required'
                            : `Remove ${person.name}`
                        }
                        className="button-danger grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        X
                      </button>
                      <label
                        htmlFor={`teammate-name-${person.id}`}
                        className="sr-only"
                      >
                        Name for teammate {person.id}
                      </label>
                      <input
                        id={`teammate-name-${person.id}`}
                        type="text"
                        value={person.name}
                        onChange={(event) =>
                          onNameChange(person.id, event.target.value)
                        }
                        className="min-h-10 w-full min-w-40 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-2 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                        required
                      />
                    </div>
                  </td>
                  <td className="w-32 px-2 py-2.5">
                    <label
                      htmlFor={`status-${person.id}`}
                      className="sr-only"
                    >
                      Status for {person.name}
                    </label>
                    <select
                      id={`status-${person.id}`}
                      value={person.status}
                      onChange={(event) =>
                        onStatusChange(person.id, event.target.value)
                      }
                      className="min-h-10 w-32 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-2 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                    >
                      <option value="working">Working</option>
                      <option value="break">On break</option>
                    </select>
                  </td>
                  <td className="w-32 px-2 py-2.5 text-center">
                    <label
                      htmlFor={`completed-${person.id}`}
                      className="sr-only"
                    >
                      Orders completed by {person.name}
                    </label>
                    <input
                      id={`completed-${person.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={person.completed}
                      onChange={(event) =>
                        onOrderCountChange(
                          person.id,
                          'completed',
                          event.target.value,
                        )
                      }
                      className="mx-auto block min-h-10 w-28 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-2 text-center font-semibold tabular-nums text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                    />
                  </td>
                  <td className="w-32 px-2 py-2.5 text-center">
                    <label
                      htmlFor={`pending-${person.id}`}
                      className="sr-only"
                    >
                      Pending orders for {person.name}
                    </label>
                    <input
                      id={`pending-${person.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={person.pending}
                      onChange={(event) =>
                        onOrderCountChange(
                          person.id,
                          'pending',
                          event.target.value,
                        )
                      }
                      className="mx-auto block min-h-10 w-28 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-2 text-center font-semibold tabular-nums text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <label
                      htmlFor={`break-start-${person.id}`}
                      className="sr-only"
                    >
                      Break start time in EST for {person.name}
                    </label>
                    <input
                      id={`break-start-${person.id}`}
                      type="time"
                      value={person.breakStartTime}
                      onChange={(event) =>
                        onBreakTimeChange(
                          person.id,
                          'breakStartTime',
                          event.target.value,
                        )
                      }
                      className="min-h-10 w-40 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-2 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <label
                      htmlFor={`returned-at-${person.id}`}
                      className="sr-only"
                    >
                      Return time in EST for {person.name}
                    </label>
                    <input
                      id={`returned-at-${person.id}`}
                      type="time"
                      value={person.returnTime}
                      onChange={(event) =>
                        onBreakTimeChange(
                          person.id,
                          'returnTime',
                          event.target.value,
                        )
                      }
                      className="min-h-10 w-40 rounded-xl border border-white/90 bg-[#eaf2fc] px-3 py-2 font-semibold text-[#102a5c] outline-none neo-inset focus-visible:ring-4 focus-visible:ring-blue-200"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-white/90 p-5 sm:px-6">
          <button
            type="button"
            onClick={onAddTeamMember}
            disabled={team.length >= 100}
            className="button-primary inline-flex min-h-11 items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add teammate
          </button>
        </div>
      </section>
    </div>
  )
}

export default TeamEditor
