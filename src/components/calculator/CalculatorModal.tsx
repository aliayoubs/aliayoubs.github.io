import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ArrowRight, Calculator, Download, Droplets, FileText, Info, Package, ShieldAlert, ShoppingBasket, Users, Waves, X } from 'lucide-react';
import type { AidInputs, DataMode, Village, VillageAssessment } from '../../types';
import { calculateAidRequirements } from '../../utils/calculate';
import { exportCSV, exportPDF } from '../../services/reportService';

const number = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
type StockId = 'water' | 'food' | 'shelter' | 'hygiene';
const emptyStocks = (): Record<StockId, string> => ({ water: '', food: '', shelter: '', hygiene: '' });

function NumberField({ label, value, onChange, unit, min = 0, step = 1 }: {
  label: string; value: number; onChange: (value: number) => void; unit?: string; min?: number; step?: number;
}) {
  return <label className="calc-field"><span>{label}</span><div className="calc-input-row">
    <input type="number" inputMode="numeric" min={min} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))} />{unit && <small>{unit}</small>}
  </div></label>;
}

export default function CalculatorModal({ open, onClose, village, assessment, mode }: {
  open: boolean; onClose: () => void; village: Village; assessment: VillageAssessment | null; mode: DataMode;
}) {
  const [days, setDays] = useState(7);
  const [people, setPeople] = useState(assessment?.populationInNeed ?? 0);
  const [households, setHouseholds] = useState(assessment?.affectedHouseholds ?? 0);
  const [shelterHouseholds, setShelterHouseholds] = useState(assessment?.shelterHouseholds ?? 0);
  const [waterRate, setWaterRate] = useState(15);
  const [shelterCoverage, setShelterCoverage] = useState(1);
  const [hygieneCoverage, setHygieneCoverage] = useState(1);
  const [stocks, setStocks] = useState<Record<StockId, string>>(emptyStocks);
  const [supplySource, setSupplySource] = useState('');
  const [supplyDate, setSupplyDate] = useState('');
  const [hasCalculated, setCalculated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDays(7);
    setPeople(assessment?.populationInNeed ?? 0);
    setHouseholds(assessment?.affectedHouseholds ?? 0);
    setShelterHouseholds(assessment?.shelterHouseholds ?? 0);
    setWaterRate(15);
    setShelterCoverage(1);
    setHygieneCoverage(1);
    setStocks(emptyStocks());
    setSupplySource('');
    setSupplyDate('');
    setCalculated(false);
    setExpanded(false);
  }, [open, village.id, assessment]);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', key); };
  }, [open, onClose]);

  const stockEntered = Object.values(stocks).some(value => value.trim() !== '');
  // Source and date are mandatory for gap estimation. Users' claims are NOT independently verified.
  const stockAttributed = stockEntered && supplySource.trim().length > 0 && !!supplyDate;
  const inputs: AidInputs = useMemo(() => {
    const next: AidInputs = {
      people, days, households, shelterHouseholds,
      waterLitersPerPersonDay: waterRate,
      shelterKitHouseholds: shelterCoverage,
      hygieneKitHouseholds: hygieneCoverage
    };
    if (stockAttributed) {
      if (stocks.water.trim() !== '') next.availableWaterLiters = Number(stocks.water);
      if (stocks.food.trim() !== '') next.availableFoodPersonDays = Number(stocks.food);
      if (stocks.shelter.trim() !== '') next.availableShelterKits = Number(stocks.shelter);
      if (stocks.hygiene.trim() !== '') next.availableHygieneKits = Number(stocks.hygiene);
      next.supplySource = supplySource.trim();
      next.supplyReportingDate = supplyDate;
    }
    return next;
  }, [people, days, households, shelterHouseholds, waterRate, shelterCoverage, hygieneCoverage, stocks, stockAttributed, supplySource, supplyDate]);

  const calculated = useMemo(() => {
    try { return { value: calculateAidRequirements(inputs), error: '' }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : 'Invalid scenario inputs.' }; }
  }, [inputs]);
  const preview = [7, 14, 30].map(d => ({ period: `${d} days`, liters: people * waterRate * d }));
  const stockWarning = stockEntered && !stockAttributed;
  const stockItems = calculated.value ? [
    { label: 'Water', amount: calculated.value.unmetWaterLiters, unit: 'liters' },
    { label: 'Food assistance', amount: calculated.value.unmetFoodPersonDays, unit: 'person-days' },
    { label: 'Shelter', amount: calculated.value.unmetShelterKits, unit: 'kits' },
    { label: 'Hygiene', amount: calculated.value.unmetHygieneKits, unit: 'kits' }
  ] : [];

  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section role="dialog" aria-modal="true" aria-label="Humanitarian resource assessment" className="calculator-modal"
      initial={{ opacity: 0, y: 36, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 22, scale: 0.98 }} transition={{ duration: 0.22 }}>
      <div className="modal-titlebar"><div className="modal-title-group"><span className="kicker"><Calculator size={15} /> RESOURCE PLANNING ENGINE / 02</span>
        <h2>Humanitarian Resource Assessment</h2>
        <p><span>{village.name}</span> · {village.district} District · <strong>{mode === 'demo' ? 'Illustrative demo' : 'Verified data unavailable'}</strong></p>
      </div><button className="icon-button modal-close" onClick={onClose} aria-label="Close calculator"><X size={22} /></button></div>
      <div className="calc-content">
        <div className="calc-inputs">
          <div className="calc-section-title"><span>01</span><h3>Select assistance period</h3></div>
          <div className="period-tabs">{[7, 14, 30].map(d => <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>{d} DAYS</button>)}</div>
          <div className="calc-section-title"><span>02</span><h3>Set basic aid coverage</h3></div>
          <div className="calc-field-grid">
            <NumberField label="People assumed to need assistance" value={people} onChange={setPeople} unit="people" />
            <NumberField label="Affected households" value={households} onChange={setHouseholds} unit="households" />
            <NumberField label="Households requiring shelter" value={shelterHouseholds} onChange={setShelterHouseholds} unit="households" />
            <NumberField label="Water per person per day" value={waterRate} onChange={setWaterRate} unit="liters" step={0.5} min={0.5} />
          </div>
          {assessment && <button className="calc-population-option" onClick={() => setPeople(assessment.baselinePopulation)}>
            <Users size={13} /> Use baseline population ({number(assessment.baselinePopulation)}) as a 100%-coverage scenario
          </button>}
          <p className="calc-hint">Baseline population is not necessarily the current population or number needing aid. Adjust for people currently present, displacement, and locally established needs.</p>
          <button className="advanced-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            <Package size={15} /> {expanded ? 'Hide' : 'Show'} kit coverage & available aid inputs <span>{expanded ? '−' : '+'}</span>
          </button>
          {expanded && <div className="calc-advanced">
            <div className="calc-field-grid">
              <NumberField label="Households served per shelter kit" value={shelterCoverage} onChange={setShelterCoverage} min={1} />
              <NumberField label="Households served per hygiene kit" value={hygieneCoverage} onChange={setHygieneCoverage} min={1} />
            </div>
            <div className="calc-section-title calc-supply-heading"><span>03</span><h3>Available aid (optional)</h3></div>
            <p className="calc-hint">Only enter resources already available to this community for the same planning period. No supply data means the unmet gap is unknown, not zero.</p>
            <div className="calc-field-grid">
              {([
                ['water', 'Available water', 'liters'],
                ['food', 'Available food assistance', 'person-days'],
                ['shelter', 'Available shelter kits', 'kits'],
                ['hygiene', 'Available hygiene kits', 'kits']
              ] as [StockId, string, string][]).map(([key, label, unit]) => <label key={key} className="calc-field">
                <span>{label}</span><div className="calc-input-row"><input type="number" min="0" step={key === 'water' || key === 'food' ? 'any' : '1'} value={stocks[key]} placeholder="Unknown" onChange={event => setStocks(old => ({ ...old, [key]: event.target.value }))} /><small>{unit}</small></div>
              </label>)}
            </div>
            <div className="calc-field-grid calc-supply-provenance">
              <label className="calc-field"><span>Supply source (required for gap)</span><div className="calc-input-row"><input type="text" value={supplySource} placeholder="Organization / report" onChange={event => setSupplySource(event.target.value)} /></div></label>
              <label className="calc-field"><span>Reporting date (required for gap)</span><div className="calc-input-row"><input type="date" value={supplyDate} max={new Date().toISOString().slice(0, 10)} onChange={event => setSupplyDate(event.target.value)} /></div></label>
            </div>
            <p className="calc-hint">TON 618 does not independently verify entered supply records. Review source, date, location and units before operational use.</p>
            {stockWarning && <p className="calc-error">Add a source and reporting date to calculate provisional unmet aid quantities.</p>}
          </div>}
          <div className="calc-note"><Info size={17} /><p>All demo population and damage figures are fictional. 15 L/person/day is a configurable initial water planning benchmark. Nighttime lights and FIRMS detections are contextual indicators, not numerical multipliers in the aid calculation.</p></div>
          <button className="button button-primary calculate-run" disabled={!assessment || !!calculated.error} onClick={() => setCalculated(true)}>
            <Calculator size={18} /> {hasCalculated ? 'UPDATE ESTIMATES' : 'CALCULATE AID ESTIMATES'} <ArrowRight size={18} />
          </button>
          {calculated.error && <p className="calc-error">{calculated.error}</p>}
        </div>
        <div className="calc-results">
          <div className="results-top"><div><span className="kicker">04 / RESOURCE OUTPUT</span><h3>Two separate estimates</h3></div><span className="data-chip demo">SCENARIO ONLY</span></div>
          {hasCalculated && calculated.value ? <>
            <p className="results-context">Scenario for <strong>{number(people)} people</strong> over <strong>{days} days</strong>. Calculations update when inputs change.</p>
            <div className="results-subhead"><span>ESTIMATE A · BASIC AID REQUIREMENTS</span><small>Before subtracting supplies</small></div>
            <div className="results-grid">
              <div className="result-card"><div><Droplets size={19} /> WATER REQUIRED</div><strong>{number(calculated.value.waterLiters)} <small>L</small></strong><p>{number(calculated.value.waterCubicMeters)} cubic meters</p></div>
              <div className="result-card"><div><ShoppingBasket size={19} /> FOOD ASSISTANCE</div><strong>{number(calculated.value.foodPersonDays)}</strong><p>person-days · {number(calculated.value.foodEnergyKcalTarget)} kcal planning target, not kilograms</p></div>
              <div className="result-card"><div><Package size={19} /> SHELTER SUPPORT</div><strong>{number(calculated.value.shelterKits)}</strong><p>kits for eligible households</p></div>
              <div className="result-card"><div><Waves size={19} /> HYGIENE KITS</div><strong>{number(calculated.value.hygieneKits)}</strong><p>estimated household kits</p></div>
            </div>
            <div className="chart-result"><div className="chart-result-head"><span>WATER REQUIRED BY PLANNING PERIOD</span><span>LITERS</span></div>
              <ResponsiveContainer width="100%" height={135}><BarChart data={preview} margin={{ top: 8, left: -15, right: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="#264155" strokeDasharray="3 5" /><XAxis dataKey="period" stroke="#7892a7" fontSize={11} axisLine={false} tickLine={false} /><YAxis stroke="#7892a7" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} /><Tooltip formatter={v => [`${Number(v).toLocaleString()} liters`, 'Water']} contentStyle={{ background: '#0b1f35', border: '1px solid #244560', borderRadius: 8 }} /><Bar dataKey="liters" radius={[4, 4, 0, 0]}>{preview.map((point, index) => <Cell key={point.period} fill={([7, 14, 30][index] === days) ? '#00c8ff' : '#28516c'} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
            <div className="results-subhead gap-subhead"><span>ESTIMATE B · UNMET AID GAP</span><small>Only where stock is provided</small></div>
            {stockAttributed ? <>
              <p className="calc-hint">Provisional gaps from user-entered data: {supplySource} · {supplyDate}. The platform has not independently verified this source.</p>
              <div className="gap-grid">{stockItems.map(item => <div key={item.label} className="gap-row">
                <span>{item.label}</span><strong>{item.amount === undefined ? 'Unknown' : `${number(item.amount)} ${item.unit}`}</strong>
              </div>)}</div>
            </> : <div className="gap-empty"><Info size={17} /><p><strong>Unmet aid: unknown.</strong> {stockWarning ? 'Add the supply source and reporting date in the advanced section.' : 'Add sourced, dated available-supply figures to estimate what remains. Total required aid is not the same as unmet need.'}</p></div>}
            <div className="result-actions"><button className="button button-primary" onClick={() => exportPDF(village, assessment, inputs, calculated.value!, mode)}><FileText size={17} /> Download PDF</button><button className="button button-outline" onClick={() => exportCSV(village, assessment, inputs, calculated.value!, mode)}><Download size={17} /> Export CSV</button></div>
          </> : <div className="results-placeholder"><div className="result-placeholder-icon"><Users size={35} /></div><h4>Ready to assess</h4><p>Calculate basic population-based assistance first. Then optionally enter sourced, dated available supplies to estimate unmet requirements.</p><span><ShieldAlert size={14} /> Not for operational allocation</span></div>}
        </div>
      </div>
      <div className="calc-footnote"><ShieldAlert size={15} /> Scenario calculations must be validated locally. No missing data are silently treated as zero; satellite indicators do not prove humanitarian shortages.</div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}
