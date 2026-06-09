export default function ContactBadge({ contact }) {
  if (!contact) return null

  return (
    <div className="flex items-center gap-3">
      {/* Avatar initials */}
      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-accent">
          {contact.name
            ? contact.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?'}
        </span>
      </div>

      <div className="min-w-0">
        {contact.name && (
          <p className="text-sm font-medium text-white truncate">{contact.name}</p>
        )}
        {contact.title && (
          <p className="text-xs text-slate-500 truncate">{contact.title}</p>
        )}
      </div>

      {/* Clickable phone */}
      {contact.phone && (
        <a
          href={`tel:${contact.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto flex items-center gap-1.5 text-xs font-mono text-accent hover:text-accent-light transition-colors duration-150 flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
          </svg>
          {contact.phone}
        </a>
      )}
    </div>
  )
}
