import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookMarked, Database, Search, ShieldCheck } from 'lucide-react';
import { references, type ReferenceCategory, type WebReference } from '../data/references';
import { Link } from 'react-router-dom';

type ReferenceFilter = 'All' | 'NASA' | ReferenceCategory;
const groups: ReferenceFilter[] = ['All', 'NASA', 'Primary evidence', 'Published nightlight research', 'Satellite & imagery', 'Map & geography', 'Humanitarian planning', 'Evaluated / future'];

function ReferenceCard({reference, nasa = false}: {reference: WebReference; nasa?: boolean}) {
  return <a href={reference.url} target="_blank" rel="noopener noreferrer" className={`ton-ref-card${nasa ? ' ton-ref-card-nasa' : ''}`}>
    <div className="ton-ref-top"><span>{nasa ? reference.nasaConnection : reference.category}</span><ArrowUpRight size={17}/></div>
    <h2>{reference.title}</h2>
    <p className="ton-ref-org">{reference.organization}{reference.date ? ` · ${reference.date}` : ''}</p>
    <p className="ton-ref-description">{reference.details}</p>
    <div className="ton-ref-footer"><span className={reference.role === 'Figures integrated' ? 'integrated' : reference.role === 'Evaluated, not active' ? 'inactive' : ''}>{reference.role}</span><small>{reference.scope}</small></div>
  </a>;
}

export function ReferencesLibrary(){
  const [filter, setFilter] = useState<ReferenceFilter>('All');
  const [query, setQuery] = useState('');
  const results = useMemo(() => references.filter(r =>
    (filter === 'All' || (filter === 'NASA' ? !!r.nasaConnection : r.category === filter)) &&
    `${r.title} ${r.organization} ${r.details} ${r.scope} ${r.nasaConnection ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [filter, query]);
  const nasaOfficial = results.filter(r => r.nasaConnection === 'Official NASA resource');
  const nasaResearch = results.filter(r => r.nasaConnection === 'Independent NASA-data research');
  const otherSources = results.filter(r => !r.nasaConnection);
  const hasNASA = nasaOfficial.length > 0 || nasaResearch.length > 0;
  const nasaTotal = references.filter(r => r.nasaConnection).length;

  return <div className="ton-refs-inner">
    <div className="ton-refs-kicker"><BookMarked size={17}/> TON 618 / RESEARCH LIBRARY</div>
    <h1>Sources & <em>References.</em></h1>
    <p className="ton-refs-lede">Every entry links to an online source used or evaluated while developing TON 618. NASA resources and independent research using NASA data are featured first. Sources supplying figures are distinguished from imagery services, supporting research and proposed integrations.</p>
    <div className="ton-refs-stats">
      <span><Database size={17}/> <strong>{references.length}</strong> online references</span>
      <span><img src="/assets/nasa-logo.jpg" alt="" className="ton-nasa-stat-logo"/> <strong>{nasaTotal}</strong> NASA-related sources</span>
      <span><ShieldCheck size={17}/> <strong>{references.filter(r => r.role === 'Figures integrated').length}</strong> figure sources integrated</span>
    </div>
    <div className="ton-refs-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search NASA, UNDP, satellite, research, displacement..." aria-label="Search reference sources"/></div>
    <div className="ton-refs-filters" aria-label="Filter references by type">{groups.map(group => <button type="button" className={group === filter ? 'active' : ''} aria-pressed={group === filter} key={group} onClick={() => setFilter(group)}>{group === 'NASA' && <img src="/assets/nasa-logo.jpg" alt=""/>}{group}</button>)}</div>
    <div className="ton-refs-count">SHOWING {results.length} ONLINE SOURCES {filter !== 'All' ? `/ ${filter.toUpperCase()}` : ''}</div>

    {hasNASA && <section className="ton-nasa-refs" aria-labelledby="nasa-references-title">
      <header className="ton-nasa-refs-header">
        <img className="ton-nasa-refs-logo" src="/assets/nasa-logo.jpg" alt="NASA insignia"/>
        <div className="ton-nasa-refs-heading">
          <span className="ton-nasa-refs-eyebrow">FEATURED RESEARCH CATEGORY / EARTH OBSERVATION</span>
          <h2 id="nasa-references-title">NASA <em>& NASA-based research</em></h2>
          <p>Official NASA imagery, satellite products and data services, followed by published independent research that uses NASA observations.</p>
        </div>
      </header>
      {nasaOfficial.length > 0 && <div className="ton-nasa-refs-section">
        <div className="ton-nasa-refs-section-heading"><h3>Official NASA sources</h3><span>{nasaOfficial.length} references</span></div>
        <div className="ton-refs-grid">{nasaOfficial.map(r => <ReferenceCard key={r.id} reference={r} nasa/>)}</div>
      </div>}
      {nasaResearch.length > 0 && <div className="ton-nasa-refs-section">
        <div className="ton-nasa-refs-section-heading"><h3>Independent studies using NASA data</h3><span>{nasaResearch.length} references</span></div>
        <div className="ton-refs-grid">{nasaResearch.map(r => <ReferenceCard key={r.id} reference={r} nasa/>)}</div>
      </div>}
      <p className="ton-nasa-refs-disclaimer">The NASA insignia identifies the NASA-related source category. TON 618 is an independent academic prototype and is not sponsored, operated, affiliated with, or endorsed by NASA. Independent studies are not NASA publications.</p>
    </section>}

    {otherSources.length > 0 && <section className="ton-refs-other" aria-label="Other references">
      <div className="ton-refs-other-title"><h2>{hasNASA ? 'Other sources & references' : 'Sources & references'}</h2><span>{otherSources.length} references</span></div>
      <div className="ton-refs-grid">{otherSources.map(r => <ReferenceCard key={r.id} reference={r}/>)}</div>
    </section>}
    {!results.length && <div className="ton-refs-empty">No references match your search. Try another keyword or select All.</div>}
    <div className="ton-refs-notice"><ShieldCheck size={20}/><p><strong>Evidence standards.</strong> UNDP damage figures and IOM mobility statistics are dated evidence; not every district has the same coverage. NASA nighttime imagery and independent brightness research cannot alone establish destroyed buildings or unmet aid needs. Evaluated sources are labeled separately from data integrated into the map.</p></div>
  </div>;
}

export default function References(){return <main className="ton-refs-page ton-refs-standalone">
  <div className="ton-refs-back-wrap"><Link to="/" className="ton-refs-back"><ArrowLeft size={17}/> Back to TON 618</Link></div>
  <ReferencesLibrary/>
</main>;}
