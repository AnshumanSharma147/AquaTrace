import { evidenceLabels } from '../data/investigation'

export default function EvidenceSection({ evidence }) {
  return (
    <section className="ot-card">
      <div className="ot-card-kicker">EVIDENCE</div>
      <ul className="ot-evidence-list">
        {evidenceLabels.map((item) => {
          const value = evidence[item.key]
          return (
            <li key={item.key}>
              <div className="ot-evidence-head">
                <span>{item.label}</span>
                <span className="ot-mono">{value}%</span>
              </div>
              <div className="ot-bar" aria-hidden="true">
                <div className="ot-bar-fill" style={{ width: `${value}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
