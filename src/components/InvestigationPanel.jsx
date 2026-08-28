import CandidateList from './CandidateList'
import EvidenceSection from './EvidenceSection'
import VesselCard from './VesselCard'
import { useRef, useState } from 'react'

export default function InvestigationPanel({
  incident,
  dynamicTime,
  dynamicLocation,
  vessels,
  selectedVessel,
  onSelectVessel,
  onScanImage,
  onCalculateDrift,
  onFindSuspects,
  isDetecting,
  isCalculating,
  isFindingSuspects,
}) {
  const imageInputRef = useRef(null)
  const maskInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [maskFile, setMaskFile] = useState(null)

  const handleSubmitScan = () => {
    if (!imageFile) return alert("Please select a Satellite Image.")
    onScanImage(imageFile, maskFile)
  }

  return (
    <aside className="ot-panel">
      <section className="ot-card">
        <div className="ot-card-kicker">ACTIVE INVESTIGATION</div>
        
        {/* ML Workflow Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <input 
            type="file" 
            accept=".tif,.tiff" 
            ref={imageInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => setImageFile(e.target.files[0])} 
          />
          <input 
            type="file" 
            accept=".tif,.tiff" 
            ref={maskInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => setMaskFile(e.target.files[0])} 
          />
          
          <button className="ot-button" onClick={() => imageInputRef.current?.click()} style={{ background: imageFile ? '#3b82f6' : '' }}>
            {imageFile ? `Image: ${imageFile.name}` : "1. Select Satellite Image (.tif)"}
          </button>
          
          <button className="ot-button" onClick={() => maskInputRef.current?.click()} style={{ background: maskFile ? '#10b981' : '' }}>
            {maskFile ? `Mask: ${maskFile.name}` : "2. Select Ground Truth Mask (Optional)"}
          </button>
          
          <button className="ot-button" onClick={handleSubmitScan} disabled={!imageFile || isDetecting} style={{ marginTop: '8px', background: '#f59e0b', color: '#000', opacity: isDetecting ? 0.7 : 1 }}>
            {isDetecting ? "Detecting Oil Spill..." : "Run U-Net Inference"}
          </button>
          
          <button className="ot-button" onClick={onCalculateDrift} disabled={isCalculating} style={{ marginTop: '16px', opacity: isCalculating ? 0.7 : 1 }}>
            {isCalculating ? "Calculating Drift Physics..." : "Calculate Drift"}
          </button>
          <button className="ot-button" onClick={onFindSuspects} disabled={isFindingSuspects} style={{ opacity: isFindingSuspects ? 0.7 : 1 }}>
            {isFindingSuspects ? "Querying GFW API..." : "Find Suspects"}
          </button>
        </div>

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
            <dd style={{ fontSize: '0.85em', lineHeight: '1.4' }}>{dynamicLocation}</dd>
          </div>
          <div>
            <dt>Detection time</dt>
            <dd className="ot-mono">{dynamicTime}</dd>
          </div>
          <div className="ot-span-2">
            <dt>Estimated spill area</dt>
            <dd>{incident.estimatedAreaKm2} km²</dd>
          </div>
        </dl>
      </section>

      {selectedVessel && <VesselCard vessel={selectedVessel} />}
      {selectedVessel?.evidence && <EvidenceSection evidence={selectedVessel.evidence} />}
      <CandidateList
        vessels={vessels}
        selectedId={selectedVessel?.id}
        onSelect={onSelectVessel}
      />
    </aside>
  )
}
