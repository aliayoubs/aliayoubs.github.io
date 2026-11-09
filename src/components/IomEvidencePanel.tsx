import type { IomMetrics } from '../lib/ton618Iom';

const formatNumber = (value: number | null) => value === null ? 'Not reported' : value.toLocaleString('en-US');

/** IOM's four workbook tabs are separate populations, not one additive count. */
export default function IomEvidencePanel({ metrics }: { metrics: IomMetrics | null }) {
  if (!metrics) return null;
  const district = metrics.level === 'district';
  const entries: { name: string; value: number | null; note?: string }[] = [
    { name: district ? 'IDPs hosted (excluding collective sites)' : 'IDPs hosted in this cadastral area', value: metrics.hostedIdps },
    { name: 'Hosting households', value: metrics.hostedHouseholds },
    { name: district ? 'Returnees to this district' : 'Returnees to this cadastral area', value: metrics.returnees },
    { name: 'Returnee households', value: metrics.returneeHouseholds },
  ];
  if (district) {
    entries.push(
      { name: 'Currently displaced people from this origin district (nationwide)', value: metrics.originIdpsNationwide, note: 'Recorded outside collective sites' },
      { name: 'IDPs staying in collective sites in this district', value: metrics.collectiveSiteIdps, note: 'Separate Sites sheet; not assigned to villages' },
    );
  }
  return (
    <section aria-label="IOM displacement evidence" style={{ padding: 16, marginBottom: 14, border: '1px solid #35627a', background: '#0a2133', borderRadius: 11, color: '#e6f5ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>IOM DTM · Round 119</h3>
        <span style={{ fontSize: 11, color: '#9dd4e9' }}>29 OCT 2026</span>
      </div>
      <p style={{ margin: '7px 0 4px' }}>{metrics.name} · {district ? 'ADM2 district' : 'ADM3 cadastral area'}</p>
      <p style={{ margin: 0, fontSize: 11, color: '#a9c5d7' }}>P-code: {metrics.pcode || 'Not available'}</p>
      <dl style={{ display: 'grid', gap: 8, margin: '13px 0' }}>
        {entries.map(item => <div key={item.name} style={{ borderTop: '1px solid #2a4d65', paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <dt style={{ color: '#b3cfdf', fontSize: 12, maxWidth: '65%' }}>{item.name}{item.note && <small style={{ display: 'block', fontSize: 10, marginTop: 4 }}>{item.note}</small>}</dt>
          <dd style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', margin: 0 }}>{formatNumber(item.value)}</dd>
        </div>)}
      </dl>
      {metrics.joinWarning && <p role="alert" style={{ color: '#ffcc87', fontSize: 12 }}>{metrics.joinWarning}</p>}
      {!metrics.hasIomRecord && !metrics.joinWarning && <p style={{ color: '#ffcc87', fontSize: 12 }}>No matching IOM record for this location. Missing data does not mean zero.</p>}
      <p style={{ fontSize: 11, lineHeight: 1.5, color: '#aacfe0', margin: 0 }}>
        Source: IOM DTM Lebanon, Round 119, 29 October 2026. Hosted IDPs, returnees, origin-district counts and collective-site counts describe distinct movements or categories; they must not be summed as if they were unique people.
      </p>
    </section>
  );
}
