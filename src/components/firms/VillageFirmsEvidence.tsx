import { useEffect, useState } from 'react';
import { findFirmsVillage, loadFirmsAdm3, type VillageFirmsRecord } from '../../lib/ton618FirmsAdm3';

function fmt(value: number | null): string {
  return value === null ? 'Insufficient spatial support' : value.toLocaleString('en-US');
}
function change(value: number | null): string {
  return value === null ? 'Not comparable' : `${value > 0 ? '+' : ''}${value.toLocaleString('en-US')}`;
}
function pixelSupport(r: VillageFirmsRecord): string {
  if (r.spatial_support === 'no_spatial_support') return 'No sampled spatial pixels; a zero in the source export is NOT treated as no fire activity.';
  if (r.spatial_support === 'very_low') return 'Very limited: fewer than 5 sampled spatial pixels.';
  if (r.spatial_support === 'limited') return 'Limited: fewer than 10 sampled spatial pixels.';
  return 'At least 10 sampled spatial pixels (not a guarantee of cloud-free observation or reliable detection).';
}

export default function VillageFirmsEvidence({adm3Code}: {adm3Code: string | number | null | undefined}) {
  const [record, setRecord] = useState<VillageFirmsRecord | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    setStatus('loading');
    loadFirmsAdm3().then(data => {
      if (!active) return;
      setRecord(findFirmsVillage(data, adm3Code));
      setStatus('loaded');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [adm3Code]);

  return <aside className="intel-panel ton-v2-panel" aria-label="NASA FIRMS village thermal anomaly evidence" style={{padding:'16px',marginTop:'12px'}}>
    <div className="ton-panel-top"><span>NASA FIRMS / VIIRS NOAA-20</span><span>ADM3 · 2025 → 2026</span></div>
    <h3 style={{margin:'10px 0 8px'}}>Thermal anomalies · selected village</h3>
    {status === 'loading' && <p>Loading village thermal observations…</p>}
    {status === 'error' && <p role="alert">Could not load FIRMS village observations. Check public/data.</p>}
    {status === 'loaded' && !record && <p>No matched FIRMS record for this cadastral P-code. Ambiguous boundary areas are not silently merged.</p>}
    {status === 'loaded' && record && <>
      <p style={{opacity:.8,fontSize:13,margin:'4px 0 10px'}}>{record.cadastre_name} · P-code {record.adm3_code}</p>
      <p style={{fontSize:12,opacity:.85,margin:'0 0 12px'}}>September monthly totals · nominal/high-confidence fire pixel-observations (primary indicator)</p>
      <dl style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:'8px 12px',fontSize:13,margin:0}}>
        <dt>September 2025</dt><dd style={{margin:0,fontWeight:600}}>{fmt(record.nominal_high_pixel_observations_2025)}</dd>
        <dt>September 2026</dt><dd style={{margin:0,fontWeight:600}}>{fmt(record.nominal_high_pixel_observations_2026)}</dd>
        <dt>Change (pixel-observations)</dt><dd style={{margin:0,fontWeight:700}}>{change(record.nominal_high_change)}</dd>
        <dt>All-confidence observations (2025 / 2026)</dt><dd style={{margin:0}}>{fmt(record.all_pixel_observations_2025)} / {fmt(record.all_pixel_observations_2026)}</dd>
        <dt>Low-confidence observations (2025 / 2026)</dt><dd style={{margin:0}}>{fmt(record.low_pixel_observations_2025)} / {fmt(record.low_pixel_observations_2026)}</dd>
        <dt>High-confidence subset (2025 / 2026)</dt><dd style={{margin:0}}>{fmt(record.high_pixel_observations_2025)} / {fmt(record.high_pixel_observations_2026)}</dd>
        <dt>Sampled 375 m spatial pixels</dt><dd style={{margin:0}}>{record.sampled_375m_pixels.toLocaleString('en-US')}</dd>
      </dl>
      <p style={{fontSize:12,margin:'12px 0 4px'}}><strong>Coverage warning:</strong> {pixelSupport(record)}</p>
      {record.spatial_support !== 'no_spatial_support' && record.all_pixel_observations_2025 === 0 && record.all_pixel_observations_2026 === 0 &&
        <p style={{fontSize:12,opacity:.85}}>No thermal anomalies were recorded in the sampled pixels for either selected month. This does not confirm no fire occurred.</p>}
      <p style={{fontSize:12,opacity:.75,margin:'10px 0 0'}}>Source: NASA FIRMS NOAA-20 VIIRS C2 NRT, September 2025 vs 2026; nominal 375 m. Values count satellite pixel-observations, NOT unique fires, events, damage, or conflict incidents. NRT observations are not science-quality; missed detections and geolocation errors are possible.</p>
    </>}
  </aside>;
}
