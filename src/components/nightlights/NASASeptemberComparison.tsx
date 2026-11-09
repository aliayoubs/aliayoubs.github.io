import type {RadiancePoint} from '../../services/blackMarble';
import './nasaSeptemberComparison.css';

/** Exactly two observed September composites. This is not a monthly time series. */
export default function NASASeptemberComparison({points}:{points:RadiancePoint[]}) {
  const available=points.filter(p=>['2025-09','2026-09'].includes(p.period));
  const byDate=new Map(available.map(p=>[p.period,p]));
  const values=['2025-09','2026-09'].map(period=>({period,point:byDate.get(period)}));
  const maximum=Math.max(0,...values.map(x=>typeof x.point?.radiance==='number' && Number.isFinite(x.point.radiance) ? x.point.radiance : 0));
  const prior=values[0].point?.radiance;
  const current=values[1].point?.radiance;
  const delta=typeof prior==='number'&&typeof current==='number'&&Number.isFinite(prior)&&Number.isFinite(current)&&prior>0 ? ((current-prior)/prior)*100 : null;
  return <div className="ton-sept-compare" aria-label="NASA Black Marble mean nighttime radiance, September 2025 versus September 2026">
    <div className="ton-sept-heading"><span>Observed September radiance</span><small>Mean · nW/cm²/sr</small></div>
    <div className="ton-sept-bars">
      {values.map(({period,point},index)=>{
        const value=point?.radiance;
        const valid=typeof value==='number'&&Number.isFinite(value);
        const fraction=valid&&maximum>0?Math.max(0,value/maximum):0;
        return <div key={period} className="ton-sept-column">
          <div className="ton-sept-value">{valid?value.toFixed(3):'Not measured'}</div>
          <div className="ton-sept-track">
            {valid&&<div className={'ton-sept-bar '+(index===0?'ton-sept-bar--before':'ton-sept-bar--after')} style={{height:`${maximum>0?Math.max(3,fraction*100):3}%`}}/>}
          </div>
          <strong>{index===0?'September 2025':'September 2026'}</strong>
          <span className="ton-sept-pixels">{typeof point?.validPixels==='number'?`${point.validPixels.toLocaleString()} sampled pixels`:'Pixel coverage not reported'}</span>
        </div>;
      })}
    </div>
    <div className="ton-sept-footer">
      <div><span>Change in mean radiance</span><strong>{delta===null?'Not calculable':`${delta>=0?'+':''}${delta.toFixed(1)}%`}</strong></div>
      <p>Two measured periods only. No observations are inferred for the months in between. Radiance change does not independently establish damage or displacement.</p>
    </div>
  </div>;
}
