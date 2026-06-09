import { useState, useRef } from 'react'

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// ── Single reminder item ──────────────────────────────────────────────────────

function ReminderItem({ reminder, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteTimeoutRef = useRef(null)

  const handleCheckbox = () => {
    onEdit(reminder.id, { done: !reminder.done })
  }

  const handleTextChange = (e) => {
    onEdit(reminder.id, { text: e.target.value })
  }

  const handleDateChange = (e) => {
    // Store as ISO date string or null
    onEdit(reminder.id, { due_at: e.target.value || null })
  }

  const handleDeleteClick = () => {
    if (!reminder.text.trim()) {
      // Empty text — delete immediately without confirmation
      onDelete(reminder.id)
      return
    }

    if (confirmDelete) {
      // Second click — confirm
      clearTimeout(deleteTimeoutRef.current)
      onDelete(reminder.id)
    } else {
      setConfirmDelete(true)
      deleteTimeoutRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <li className="flex items-start gap-2.5 group py-2 border-b border-surface-border/40 last:border-0">
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={reminder.done}
          onChange={handleCheckbox}
          id={`reminder-done-${reminder.id}`}
          className="w-4 h-4 rounded border-surface-border bg-surface-raised text-accent cursor-pointer accent-blue-500"
          aria-label={`Marcar recordatorio como ${reminder.done ? 'pendiente' : 'completado'}`}
        />
      </div>

      {/* Text input */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <input
          type="text"
          value={reminder.text}
          onChange={handleTextChange}
          placeholder="Escribe un recordatorio…"
          aria-label="Texto del recordatorio"
          className={`w-full bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 transition-colors
            ${reminder.done
              ? 'line-through text-slate-600'
              : 'text-slate-200 placeholder-slate-600'
            }`}
        />

        {/* Date field — visible always but compact */}
        <input
          type="date"
          value={reminder.due_at ? reminder.due_at.split('T')[0] : ''}
          onChange={handleDateChange}
          aria-label="Fecha del recordatorio"
          className="w-36 text-[11px] bg-surface-raised border border-surface-border rounded px-2 py-0.5 text-slate-400 focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {/* Delete button */}
      <button
        onClick={handleDeleteClick}
        title={confirmDelete ? 'Clic de nuevo para confirmar' : 'Eliminar recordatorio'}
        aria-label="Eliminar recordatorio"
        className={`flex-shrink-0 p-1 rounded transition-colors mt-0.5
          ${confirmDelete
            ? 'text-red-400 bg-red-400/10'
            : 'text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100'
          }`}
      >
        <TrashIcon />
      </button>
    </li>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * RemindersList — Editable list of reminders with optimistic updates.
 *
 * Props:
 *   reminders  {Array}     — from useReminders hook
 *   loading    {boolean}
 *   onAdd      {function}  — add(text, due_at)
 *   onEdit     {function}  — edit(id, changes)
 *   onDelete   {function}  — delete(id)
 */
export default function RemindersList({ reminders = [], loading = false, onAdd, onEdit, onDelete }) {
  const handleAdd = () => {
    onAdd?.('', null)
  }

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map(i => (
          <div key={i} className="h-8 bg-surface-border/30 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {reminders.length === 0 ? (
        <p className="text-xs text-slate-600 italic py-2">
          Sin recordatorios — añade para no olvidar
        </p>
      ) : (
        <ul aria-label="Lista de recordatorios">
          {reminders.map(reminder => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      <button
        onClick={handleAdd}
        className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent transition-colors"
        aria-label="Añadir recordatorio"
      >
        <PlusIcon />
        Añadir recordatorio
      </button>
    </div>
  )
}
