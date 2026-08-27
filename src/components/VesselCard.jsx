export default function VesselCard({ vessel }) {
  return (
    <section className="ot-card ot-vessel-card">
      <div className="ot-card-kicker">
        {vessel.rank === 1 ? 'PROBABLE VESSEL' : 'SELECTED CANDIDATE'}
      </div>
      <h2 className="ot-vessel-name">{vessel.name}</h2>
      <dl className="ot-meta">
        <div>
          <dt>MMSI</dt>
          <dd>{vessel.mmsi}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{vessel.type}</dd>
        </div>
      </dl>
      <div className="ot-score-row">
        <div>
          <div className="ot-label">Attribution Score</div>
          <div className="ot-score">{vessel.attributionScore}%</div>
        </div>
        <span className={`ot-badge ot-badge-${vessel.status.replace(/\s+/g, '-').toLowerCase()}`}>
          {vessel.status}
        </span>
      </div>
    </section>
  )
}
