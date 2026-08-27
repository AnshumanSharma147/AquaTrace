import { useState } from 'react'
import ActionBar from './components/ActionBar'
import EvidenceModal from './components/EvidenceModal'
import Header from './components/Header'
import InvestigationMap from './components/InvestigationMap'
import InvestigationPanel from './components/InvestigationPanel'
import ReportModal from './components/ReportModal'
import { getPrimaryVessel, getVesselById, incident, system, vessels } from './data/investigation'
import './App.css'

export default function App() {
  const [selectedId, setSelectedId] = useState(getPrimaryVessel().id)
  const [modal, setModal] = useState(null)
  const selectedVessel = getVesselById(selectedId)

  return (
    <div className="ot-shell">
      <Header system={system} />
      <div className="ot-body">
        <InvestigationMap
          vessels={vessels}
          selectedVessel={selectedVessel}
          onSelectVessel={setSelectedId}
        />
        <div className="ot-sidebar">
          <InvestigationPanel
            incident={incident}
            vessels={vessels}
            selectedVessel={selectedVessel}
            onSelectVessel={setSelectedId}
          />
          <ActionBar
            onViewEvidence={() => setModal('evidence')}
            onGenerateReport={() => setModal('report')}
          />
        </div>
      </div>

      {modal === 'evidence' && (
        <EvidenceModal
          incident={incident}
          vessel={selectedVessel}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'report' && (
        <ReportModal incident={incident} vessel={selectedVessel} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
