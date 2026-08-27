import { evidenceLabels } from '../data/investigation'

export default function EvidenceModal({ incident, vessel, onClose }) {
  return (
    <div className="ot-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ot-modal"
        role="dialog"
        aria-labelledby="evidence-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ot-modal-head">
          <h2 id="evidence-title">Evidence package · {incident.id}</h2>
          <button type="button" className="ot-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="ot-modal-lead">
          Mock correlation package for <strong>{vessel.name}</strong>. Replace with SAR, AIS, and
          drift model outputs later.
        </p>
        <ul className="ot-evidence-detail">
          {evidenceLabels.map((item) => (
            <li key={item.key}>
              <span>{item.label}</span>
              <span className="ot-mono">{vessel.evidence[item.key]}%</span>
            </li>
          ))}
        </ul>
        <p className="ot-note">{vessel.notes}</p>
        <dl className="ot-meta ot-meta-grid">
          <div>
            <dt>Course</dt>
            <dd className="ot-mono">{vessel.courseDeg}°</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd className="ot-mono">{vessel.speedKn} kn</dd>
          </div>
          <div>
            <dt>Last AIS</dt>
            <dd className="ot-mono">{vessel.lastAis}</dd>
          </div>
          <div>
            <dt>Flag</dt>
            <dd>{vessel.flag}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
