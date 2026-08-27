export default function ActionBar({ onViewEvidence, onGenerateReport }) {
  return (
    <div className="ot-actions">
      <button type="button" className="ot-btn ot-btn-ghost" onClick={onViewEvidence}>
        VIEW EVIDENCE
      </button>
      <button type="button" className="ot-btn ot-btn-primary" onClick={onGenerateReport}>
        GENERATE INCIDENT REPORT
      </button>
    </div>
  )
}
