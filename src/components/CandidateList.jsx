export default function CandidateList({ vessels, selectedId, onSelect }) {
  return (
    <section className="ot-card">
      <div className="ot-card-kicker">CANDIDATE VESSELS</div>
      
      {!vessels || vessels.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8aa0b8', fontSize: '0.9em' }}>
          No candidate vessels found.
          <br/>
          <span style={{ opacity: 0.6, fontSize: '0.85em' }}>Scan an area or expand the search radius.</span>
        </div>
      ) : (
        <ol className="ot-candidates">
          {vessels.map((vessel) => (
            <li key={vessel.id}>
              <button
                type="button"
                className={`ot-candidate ${selectedId === vessel.id ? 'is-selected' : ''}`}
                onClick={() => onSelect(vessel.id)}
              >
                <span className="ot-candidate-rank">{vessel.rank}</span>
                <span className="ot-candidate-name">{vessel.name}</span>
                <span className="ot-mono ot-candidate-score">{vessel.attributionScore}%</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
