import { ArrowRight, Calculator, CheckCircle2, Clock3, Database, Droplets, Info, PackageCheck, Users } from 'lucide-react';
import type { DataMode, Village } from '../../types';

/** A deliberately non-numeric priority block until the scientifically defensible model is approved. */
export default function AidPriorityCard({
  village, cadastralName, districtName, mode, onChooseVillage, onOpenDemo
}: {
  village: Village | null;
  cadastralName?: string | null;
  districtName: string;
  mode: DataMode;
  onChooseVillage: () => void;
  onOpenDemo: () => void;
}) {
  const canTryDemo = mode === 'demo' && Boolean(village);
  const hasCadastre = Boolean(village || cadastralName);
  const planningName = village?.name || cadastralName;
  return <section id="aid-planner" className="ton-aid-priority" aria-label="Aid requirements – primary mission">
    <div className="ton-aid-kicker"><Calculator size={16}/> PRIMARY MISSION <span><Clock3 size={12}/> MODEL IN DEVELOPMENT</span></div>
    <h2>Aid Requirements</h2>
    <p className="ton-aid-intro">The purpose of TON 618 is to translate evidence into transparent estimates of essential assistance for affected communities.</p>
    <div className="ton-aid-focus"><span>PLANNING AREA</span><strong>{planningName || (districtName === 'Southern Lebanon' ? 'All study areas' : `${districtName} District`)}</strong><small>{hasCadastre ? 'Selected ADM3 area · review available evidence above' : 'Choose any village for a community-level assessment'}</small></div>
    <div className="ton-aid-placeholder-grid" aria-label="Future resource output categories">
      <div><Droplets size={17}/><span>Water</span><strong>Pending</strong></div>
      <div><PackageCheck size={17}/><span>Food</span><strong>Pending</strong></div>
      <div><Users size={17}/><span>Shelter</span><strong>Pending</strong></div>
    </div>
    <div className="ton-aid-status"><Database size={16}/><p><strong>Calculation pending validation.</strong> The complete assistance formula and verified supply data are not yet ready. Modeled village population is available but is not a field-verified count of people needing aid. Missing data is never treated as zero.</p></div>
    {canTryDemo ? <button type="button" className="ton-aid-primary-action" onClick={onOpenDemo}><Calculator size={16}/> Open illustrative calculator <ArrowRight size={16}/></button> : <button type="button" className="ton-aid-primary-action" onClick={onChooseVillage}><CheckCircle2 size={16}/> {hasCadastre ? 'Review village evidence' : 'Select a village'} <ArrowRight size={16}/></button>}
    <div className="ton-aid-foot"><Info size={13}/> UNDP and IOM indicators are context, not a confirmed count of people needing aid.</div>
  </section>;
}
