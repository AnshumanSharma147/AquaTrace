export default function ReportModal({ incident, vessel, onClose }) {
  return (
    <div className="ot-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ot-modal"
        role="dialog"
        aria-labelledby="report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ot-modal-head">
          <h2 id="report-title">Incident report draft</h2>
          <button type="button" className="ot-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <article className="ot-report">
          <p>
            <strong>OilTrace</strong> — classified simulation · not for operational use
          </p>
          <p>
            Incident <span className="ot-mono">{incident.id}</span> detected at{' '}
            {incident.detectionTime} near {incident.location.label} ({incident.region}). Estimated
            slick area {incident.estimatedAreaKm2} km². Sensor: {incident.sensor}.
          </p>
          <p>
            Highest-ranked candidate: <strong>{vessel.name}</strong> (MMSI {vessel.mmsi},{' '}
            {vessel.type}). Attribution score {vessel.attributionScore}% — {vessel.status}.
          </p>
          <p>{vessel.notes}</p>
          <p className="ot-text-muted">
            This draft is generated from mock data. Wire report export to the backend when APIs are
            available.
          </p>
        </article>
      </div>
    </div>
  )
}
