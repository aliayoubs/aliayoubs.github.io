import { jsPDF } from 'jspdf';
import type { AidInputs, AidResult, Village, VillageAssessment, DataMode } from '../types';
import { SPHERE_HANDBOOK_URL, UNDP_DAMAGE_FACTSHEET_URL, IOM_DTM_REPORT_URL, getPublishedCadastreDamage } from '../data/verifiedSources';

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const csvSafe = (s: string) => '"' + s.replace(/"/g, '""') + '"';
const unknown = (value: number | undefined, unit: string) => value === undefined ? 'Unknown (no sourced stock supplied)' : `${fmt(value)} ${unit}`;

/** The verified UNDP/IOM records are independent context, not input factors in this scenario. */
export function exportCSV(v: Village, a: VillageAssessment | null, i: AidInputs, r: AidResult, mode: DataMode) {
  const published = getPublishedCadastreDamage(v.id);
  const rows: [string, string][] = [
    ['Product', 'TON 618 — humanitarian resource planning scenario'],
    ['Community', v.name],
    ['Data mode', mode],
    ['Generated UTC', new Date().toISOString()],
    ['Population data quality', mode === 'demo' ? 'Illustrative fictional scenario' : 'No village population imported'],
    ['Population baseline (scenario only)', a ? String(a.baselinePopulation) : 'Unavailable'],
    ['People ASSUMED to require aid', String(i.people)],
    ['Affected households ASSUMED', String(i.households)],
    ['Shelter households ASSUMED', String(i.shelterHouseholds)],
    ['Planning days', String(i.days)],
    ['Water L per person/day', String(i.waterLitersPerPersonDay)],
    ['Households per shelter kit (user assumption)', String(i.shelterKitHouseholds)],
    ['Households per hygiene kit (user assumption)', String(i.hygieneKitHouseholds)],
    ['REQUIREMENT: water liters', String(r.waterLiters)],
    ['REQUIREMENT: water cubic meters', String(r.waterCubicMeters)],
    ['REQUIREMENT: food-assistance person-days', String(r.foodPersonDays)],
    ['REQUIREMENT: food-energy planning target (kcal)', String(r.foodEnergyKcalTarget)],
    ['REQUIREMENT: shelter kits', String(r.shelterKits)],
    ['REQUIREMENT: hygiene kits', String(r.hygieneKits)],
    ['Available supply source (user entered; unverified)', i.supplySource || 'Not provided'],
    ['Available supply reporting date', i.supplyReportingDate || 'Not provided'],
    ['GAP: water liters', unknown(r.unmetWaterLiters, 'L')],
    ['GAP: food person-days', unknown(r.unmetFoodPersonDays, 'person-days')],
    ['GAP: shelter kits', unknown(r.unmetShelterKits, 'kits')],
    ['GAP: hygiene kits', unknown(r.unmetHygieneKits, 'kits')],
    ['UNDP cadastral area', published?.cadastre ?? 'Not listed in the factsheet top ten'],
    ['UNDP affected buildings in cadastral area', published ? String(published.affectedBuildings) : 'Unavailable'],
    ['UNDP percent building stock affected', published ? String(published.affectedStockPercent) : 'Unavailable'],
    ['UNDP study imagery date', '2026-06-16'],
    ['UNDP damage source (not an input to aid formula)', UNDP_DAMAGE_FACTSHEET_URL],
    ['IOM displacement context', 'Only national counts published in this imported source; not assigned to this village'],
    ['IOM source', IOM_DTM_REPORT_URL],
    ['Sphere planning source', SPHERE_HANDBOOK_URL],
    ['Limitations', 'All basic needs estimates are assumptions, not observed shortages. UNDP building damage does not establish destroyed households. Local validation required.']
  ];
  const csv = '\ufeff' + rows.map(row => row.map(csvSafe).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const element = document.createElement('a');
  element.href = url;
  element.download = `TON618_${v.id}_planning_scenario.csv`;
  element.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPDF(v: Village, _a: VillageAssessment | null, i: AidInputs, r: AidResult, mode: DataMode) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ink: [number, number, number] = [18, 41, 65];
  const blue: [number, number, number] = [11, 115, 186];
  const muted: [number, number, number] = [91, 112, 134];
  const published = getPublishedCadastreDamage(v.id);

  function header(title: string, subtitle: string) {
    doc.setFillColor(5, 13, 26); doc.rect(0, 0, 210, 43, 'F');
    doc.setTextColor(0, 200, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(21); doc.text('TON 618', 15, 19);
    doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.text('GLOBAL HUMANITARIAN RESOURCE INTELLIGENCE', 15, 28);
    doc.text('Independent hackathon prototype - no NASA or UN endorsement', 15, 35);
    doc.setTextColor(...ink); doc.setFontSize(16); doc.text(title, 15, 57);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...muted); doc.text(subtitle, 15, 65);
  }
  function title(text: string, y: number) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...blue); doc.text(text.toUpperCase(), 15, y);
  }
  function line(label: string, value: string, y: number) {
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...muted); doc.text(label, 16, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ink); doc.text(value, 194, y, { align: 'right' });
  }
  function paragraph(text: string, y: number, maxWidth = 180): number {
    doc.setTextColor(...ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    doc.text(lines, 15, y); return y + lines.length * 5;
  }
  function footer(page: number) {
    doc.setFontSize(7.5); doc.setTextColor(...muted);
    doc.text('Not an operational needs assessment. Validation with affected communities required.', 15, 288);
    doc.text(`Page ${page}`, 194, 288, { align: 'right' });
  }

  header('Humanitarian Planning Scenario', `${v.name} | ${v.district} district | ${new Date().toLocaleDateString('en-GB')}`);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(140, 78, 18);
  doc.text(mode === 'demo' ? 'ILLUSTRATIVE DEMO POPULATION - FICTIONAL DATA' : 'POPULATION NOT VERIFIED - USER PLANNING INPUT ONLY', 15, 75);
  title('A. Scenario assumptions', 89);
  line('People assumed to need aid', fmt(i.people), 99);
  line('Planning period', `${i.days} days`, 108);
  line('Affected households', fmt(i.households), 117);
  line('Households requiring shelter', fmt(i.shelterHouseholds), 126);
  line('Water per person / day', `${i.waterLitersPerPersonDay} liters`, 135);

  title('B. Basic resource requirements (not shortages)', 149);
  line('Water', `${fmt(r.waterLiters)} L (${fmt(r.waterCubicMeters)} m3)`, 159);
  line('Food assistance', `${fmt(r.foodPersonDays)} person-days`, 168);
  line('Food energy reference', `${fmt(r.foodEnergyKcalTarget)} kcal total`, 177);
  line('Shelter kits', fmt(r.shelterKits), 186);
  line('Hygiene kits', fmt(r.hygieneKits), 195);

  title('C. Unmet needs, only where supply is entered', 209);
  line('Unmet water', unknown(r.unmetWaterLiters, 'L'), 219);
  line('Unmet food', unknown(r.unmetFoodPersonDays, 'person-days'), 228);
  line('Unmet shelter', unknown(r.unmetShelterKits, 'kits'), 237);
  line('Unmet hygiene', unknown(r.unmetHygieneKits, 'kits'), 246);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
  doc.text(`Supply source: ${i.supplySource || 'not supplied'} | reporting date: ${i.supplyReportingDate || 'not supplied'}`, 15, 262);
  doc.text('User-entered source metadata is not independently validated by TON 618.', 15, 270);
  footer(1);

  doc.addPage(); header('Methodology, Sources and Caveats', `${v.name} | source-linked context`);
  title('D. Explicit calculation methods', 80);
  let y = 91;
  y = paragraph(`Water: ${fmt(i.people)} people x ${i.waterLitersPerPersonDay} liters per person/day x ${i.days} days. Sphere describes 15 L/person/day as a contextual starting benchmark, not an automatic deficit.`, y) + 4;
  y = paragraph(`Food: ${fmt(i.people)} people x ${i.days} days = ${fmt(r.foodPersonDays)} person-days. Sphere's 2,100 kcal/day general ration planning reference is shown as an energy target only, not food kilograms.`, y) + 4;
  y = paragraph(`Shelter: ceil(${i.shelterHouseholds} shelter households / ${i.shelterKitHouseholds} households served per kit). Building damage is NOT converted into shelter households automatically.`, y) + 4;
  y = paragraph(`Hygiene: ceil(${i.households} affected households / ${i.hygieneKitHouseholds} households per kit). Kit-coverage figures are user planning assumptions, not Sphere-mandated universal kit sizes.`, y) + 8;
  title('E. Independently published contextual evidence', y); y += 10;
  y = paragraph(published ? `UNDP South Lebanon issue 2: ${fmt(published.affectedBuildings)} affected buildings (${published.affectedStockPercent}% of building stock) in the ${published.cadastre} cadastral area, with ${published.imageryCoveragePercent}% imagery coverage. Satellite assessment was office-reviewed, not field-verified. It is not an input to this resource formula.` : `UNDP South Lebanon issue 2: no affected-building count for ${v.name} appears in the factsheet's ten highlighted cadastres. This does not indicate zero damage.`, y) + 4;
  y = paragraph('IOM DTM Round 119 records national IDP and returnee totals as of 28 October 2026. It does not provide a verified settlement count here and has NOT been used to estimate this community population.', y) + 8;
  title('F. Source links', y); y += 8;
  for (const [name, url] of [
    ['UNDP South Lebanon, July 2026', UNDP_DAMAGE_FACTSHEET_URL],
    ['IOM DTM Round 119, October 2026', IOM_DTM_REPORT_URL],
    ['Sphere Handbook, 2018', SPHERE_HANDBOOK_URL]
  ]) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...ink); doc.text(name, 15, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...blue);
    doc.text('Open source', 177, y); doc.link(177, y - 4, 20, 5, { url });
    y += 10;
  }
  y += 4;
  paragraph('Caution: UNDP damage figures exclude some infrastructure types and do not distinguish all residential buildings. Administrative boundaries, current population, quality-controlled satellite products, service gaps and available stocks require separate validation. Satellite fire/light observations are not direct multipliers in this calculation.', y);
  footer(2);
  doc.save(`TON618_${v.id}_planning_scenario.pdf`);
}
