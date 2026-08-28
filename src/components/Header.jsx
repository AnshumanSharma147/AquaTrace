export default function Header({ system }) {
  return (
    <header className="ot-header">
      <div className="ot-brand">
        <svg className="ot-logo" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          <path
            d="M16 8c2.4 4.2 5.2 6.8 5.2 10.2A5.2 5.2 0 0 1 16 23.4 5.2 5.2 0 0 1 10.8 18.2C10.8 14.8 13.6 12.2 16 8Z"
            fill="currentColor"
          />
        </svg>
        <div>
          <div className="ot-name">{system.name}</div>
          <div className="ot-tagline">{system.tagline}</div>
        </div>
      </div>
    </header>
  )
}
