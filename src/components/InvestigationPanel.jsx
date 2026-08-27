import CandidateList from './CandidateList'
import EvidenceSection from './EvidenceSection'
import VesselCard from './VesselCard'

export default function InvestigationPanel({
  incident,
  vessels,
  selectedVessel,
  onSelectVessel,
}) {
  return (
    <aside className="ot-panel">
      <section className="ot-card">
        <div className="ot-card-kicker">ACTIVE INVESTIGATION</div>
        <dl className="ot-meta ot-meta-grid">
          <div>
            <dt>Incident ID</dt>
            <dd className="ot-mono">{incident.id}</dd>
          </div>
          <div>
            <dt>Spill status</dt>
            <dd>
              <span className="ot-badge ot-badge-detected">{incident.status}</span>
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{incident.location.label}</dd>
          </div>
          <div>
            <dt>Detection time</dt>
            <dd className="ot-mono">{incident.detectionTime}</dd>
          </div>
          <div className="ot-span-2">
            <dt>Estimated spill area</dt>
            <dd>{incident.estimatedAreaKm2} km²</dd>
          </div>
        </dl>
      </section>

      <VesselCard vessel={selectedVessel} />
      <EvidenceSection evidence={selectedVessel.evidence} />
      <CandidateList
        vessels={vessels}
        selectedId={selectedVessel.id}
        onSelect={onSelectVessel}
      />
    </aside>
  )
}
