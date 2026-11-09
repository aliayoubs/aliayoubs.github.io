import { useState } from 'react';
import { ExternalLink, Info, Search } from 'lucide-react';
import { nationalDistrictMovements, nationalDistrictCoverage, type NationalDistrict } from '../../data/nationalDistrictMovement';
import { officialSource, iom } from '../../data/officialEvidence';

function numberOrMissing(value: number | null): string {
  return value === null ? 'Not reported' : value.toLocaleString('en-US');
}
function changeOrMissing(value: number | null): string {
  return value === null ? 'Not reported' : `${value > 0 ? '+' : ''}${value.toLocaleString('en-US')}`;
}
function MovementMetric({ label, value, note }: { label: string; value: number | null; note: string }) {
  return <div className="evidence-metric"><span>{label}</span><strong>{numberOrMissing(value)}</strong><small>{note}</small></div>;
}

/** All 26 district rows, keeping missing entries null (never imputed or treated as zero). */
export default function NationalDistrictMovement() {
  const [query, setQuery] = useState('');
  const [governorate, setGovernorate] = useState('all');
  const [selectedName, setSelectedName] = useState('Bent Jbeil');
  const governors = Array.from(new Set(nationalDistrictMovements.map(d => d.governorate))).sort();
  const filtered = nationalDistrictMovements.filter(d =>
    (governorate === 'all' || d.governorate === governorate) &&
    (!query.trim() || `${d.district} ${d.governorate}`.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const selected: NationalDistrict | undefined = filtered.find(d => d.district === selectedName) ?? filtered[0];
  return <article className="evidence-card ton-all-districts" id="all-district-returns">
    <div className="evidence-section-head">
      <div className="ton-national-movement-kicker">IOM DTM · ROUND 119 · 28 OCTOBER 2026</div>
      <h3>Return and displacement figures · All 26 Lebanese districts</h3>
      <p>Select a district to see its four independently reported mobility measures. All 26 districts are now selectable directly on the Lebanon map; the 13 detailed cadastres remain in Village View.</p>
    </div>
    <div className="ton-national-movement-coverage">
      <span><strong>{nationalDistrictCoverage.districts}</strong> districts</span>
      <span><strong>{nationalDistrictCoverage.returnArrival}</strong> return destinations reported</span>
      <span><strong>{nationalDistrictCoverage.returnDeparture}</strong> previous displacement departures reported</span>
      <span><strong>{nationalDistrictCoverage.hosting}</strong> IDP hosting districts reported</span>
    </div>
    <div className="evidence-filters ton-national-movement-filters">
      <label>Find district
        <div className="ton-national-search"><Search size={14}/><input type="search" placeholder="Search district or governorate" value={query} onChange={e => setQuery(e.target.value)}/></div>
      </label>
      <label>Governorate
        <select value={governorate} onChange={e => setGovernorate(e.target.value)}>
          <option value="all">All governorates</option>
          {governors.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <p>{filtered.length} of 26 districts shown</p>
    </div>
    {selected && <div className="ton-national-selected">
      <div className="ton-national-selected-heading"><strong>{selected.district}</strong><span>{selected.governorate} · IOM ADM2</span></div>
      <div className="evidence-mini-grid">
        <MovementMetric label="IDPs FROM district" value={selected.displacedOrigin} note="People displaced from this home district"/>
        <MovementMetric label="IDPs currently HOSTED" value={selected.hostedIdps} note="Displaced persons currently staying here"/>
        <MovementMetric label="Returned TO district" value={selected.returnedToDistrict} note={`Change vs Round 118: ${changeOrMissing(selected.returnArrivalChange)}`}/>
        <MovementMetric label="Returnees departed FROM district" value={selected.returneesDepartedFromDisplacement} note={`Left here as previous displacement location · change: ${changeOrMissing(selected.returnDepartureChange)}`}/>
      </div>
    </div>}
    <div className="evidence-table-wrap ton-national-table-wrap">
      <table className="evidence-table ton-national-table">
        <thead><tr><th scope="col">Governorate</th><th scope="col">District</th><th scope="col">Returned TO</th><th scope="col">Change</th><th scope="col">Departed FROM prior displacement</th><th scope="col">Change</th><th scope="col">IDPs hosted</th><th scope="col">IDPs from origin</th></tr></thead>
        <tbody>
          {filtered.map(d => <tr key={d.district} className={d.district === selected?.district ? 'ton-national-row-selected' : ''}>
            <td>{d.governorate}</td>
            <td><button type="button" className="ton-national-district-pick" aria-pressed={d.district === selected?.district} onClick={() => setSelectedName(d.district)}>{d.district}</button></td>
            <td>{numberOrMissing(d.returnedToDistrict)}</td>
            <td>{changeOrMissing(d.returnArrivalChange)}</td>
            <td>{numberOrMissing(d.returneesDepartedFromDisplacement)}</td>
            <td>{changeOrMissing(d.returnDepartureChange)}</td>
            <td>{numberOrMissing(d.hostedIdps)}</td>
            <td>{numberOrMissing(d.displacedOrigin)}</td>
          </tr>)}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="ton-national-empty">No district matches this search.</p>}
    </div>
    <div className="evidence-caution ton-national-district-warning"><Info size={16}/><span>
      <strong>Not reported ≠ zero.</strong> IOM only lists 12 destination districts, 18 districts people left after displacement, 24 current hosting districts and 14 IDP origin districts. “Departed FROM” describes a <em>previous displacement location</em>, not the home district. The changes compare with Round 118 (29 Sep 2026); return is not proof of safe housing or verified unmet aid needs. Do not attribute district figures to individual villages.
      {' '}<a href={officialSource.iom.url} target="_blank" rel="noopener noreferrer">IOM source <ExternalLink size={12}/></a>
    </span></div>
    <p className="evidence-note">Source: {iom.metadata.required_source_citation}. Data observed 28 October 2026, published 29 October 2026. District names follow the published ADM2 tables; unlisted Bcharre has no inferred figures.</p>
  </article>;
}
