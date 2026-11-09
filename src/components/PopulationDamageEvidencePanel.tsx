/**
 * TON 618 population + multiple dated damage assessments. This is NOT a live
 * building destruction meter; no gap is filled with zero or satellite proxies.
 * Independent IOM, WorldPop, UNDP South April, UNDP South July and Beirut 2026
 * measures are deliberately never added together.
 */
import { useEffect, useState } from 'react';
import type { AdminLevel } from '../lib/ton618Iom';

type PopRow={status?:string;population?:number|null;density_people_per_km2?:number|null};
type PopulationDB={districts_by_pcode:Record<string,PopRow>;cadastres_by_pcode:Record<string,PopRow>};
type DamageRow={affected_buildings?:number|null;destroyed_buildings?:number|null;partially_damaged_buildings?:number|null;minor_damaged_buildings?:number|null;assessed_buildings?:number|null;affected_stock_percent?:number|null;imagery_coverage_percent?:number|null;assessment_date?:string;source?:string;evidence_status?:string;note?:string};
type DamageDB={by_pcode:Record<string,DamageRow>};
type HistoryRecord={dataset_id:string;source:string;source_url:string;observation_date:string;publication_date:string;destroyed_buildings:number|null;partially_damaged_buildings:number|null;targeted_apartments:number|null;cadastral_coverage:string;verification:string;note:string};
type DistrictHistory={district:string;observation_date:string;destroyed_buildings:number;partially_damaged_buildings:number;targeted_apartments:number;source:string;source_url:string;scope:string;verification:string};
type HistoryDB={coverage?:{source_rows:number;matched_rows:number};by_pcode:Record<string,{name:string;district:string;observations:HistoryRecord[]}>;district_by_pcode?:Record<string,DistrictHistory>};
type State={population:PopulationDB|null;damage:DamageDB|null;history:HistoryDB|null;loaded:boolean};
const panelStyle={padding:16,marginBottom:14,border:'1px solid #35627a',background:'#0a2133',borderRadius:11,color:'#e6f5ff'} as const;
const captionStyle={fontSize:11,lineHeight:1.5,color:'#aacfe0'} as const;
const number=(n?:number|null)=>n===null||n===undefined||!Number.isFinite(n)?'Not reported':Math.round(n).toLocaleString('en-US');
const fetchOptional=async <T,>(url:string):Promise<T|null>=>{
  try{
    const response=await fetch(url,{cache:'no-cache'});
    if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('json'))return null;
    return await response.json() as T;
  }catch{return null;}
};
let cached:Promise<[PopulationDB|null,DamageDB|null,HistoryDB|null]>|null=null;
function loadOnce(){
  if(!cached)cached=Promise.all([
    fetchOptional<PopulationDB>(`${import.meta.env.BASE_URL}data/worldpop-lebanon-2026.json`),
    fetchOptional<DamageDB>(`${import.meta.env.BASE_URL}data/ton618-building-damage-by-cadastre.json`),
    fetchOptional<HistoryDB>(`${import.meta.env.BASE_URL}data/ton618-damage-history-by-cadastre.json`)
  ]);
  return cached;
}
function Metric({label,value,sub}:{label:string;value:string;sub?:string}){
  return <div style={{display:'flex',justifyContent:'space-between',gap:12,borderTop:'1px solid #2a4d65',paddingTop:9}}>
    <div><div style={{fontSize:12,color:'#c1d8e4'}}>{label}</div>{sub&&<div style={{fontSize:10,color:'#94b1c4',marginTop:3}}>{sub}</div>}</div>
    <strong style={{fontSize:14,textAlign:'right',whiteSpace:'nowrap'}}>{value}</strong>
  </div>;
}
const sourceLinkStyle={color:'#9bd5f5',textDecoration:'underline'} as const;
export default function PopulationDamageEvidencePanel({level,pcode,name}:{level:AdminLevel;pcode:string;name:string}){
  const [state,setState]=useState<State>({population:null,damage:null,history:null,loaded:false});
  useEffect(()=>{
    let active=true;
    loadOnce().then(([population,damage,history])=>{if(active)setState({population,damage,history,loaded:true});});
    return ()=>{active=false;};
  },[]);
  const village=level==='village';
  const population=village?state.population?.cadastres_by_pcode[pcode]:state.population?.districts_by_pcode[pcode];
  const damage=village?state.damage?.by_pcode[pcode]:null;
  const history=village?state.history?.by_pcode[pcode]:null;
  const districtHistory=!village?state.history?.district_by_pcode?.[pcode]:null;
  const pct=damage?.affected_stock_percent;
  const validPct=typeof pct==='number'&&Number.isFinite(pct)&&pct>=0&&pct<=100;
  return <section aria-label="Population and building damage evidence" style={panelStyle}>
    <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'baseline',flexWrap:'wrap'}}>
      <h3 style={{margin:0,fontSize:15}}>Population &amp; Building Damage</h3>
      <span style={{color:'#9dd4e9',fontSize:11}}>ADM{village?'3':'2'} · {pcode||'No code'}</span>
    </div>
    <p style={{fontSize:12,margin:'8px 0 12px',color:'#c1d8e4'}}>{name}</p>
    <div style={{display:'grid',gap:9}}>
      <Metric label="2026 modeled population" value={state.loaded?number(population?.population):'Loading…'} sub="WorldPop · ~100 m grid model · not an official census"/>
      {population?.status==='estimated'&&<Metric label="Modeled population density" value={population.density_people_per_km2==null?'Not reported':`${Math.round(population.density_people_per_km2).toLocaleString('en-US')}/km²`}/>}
      {state.loaded&&!state.population&&<p style={{...captionStyle,margin:0,color:'#f6cf8c'}}>Population data not generated; run the existing WorldPop importer.</p>}
      {village?<>
        <div style={{borderTop:'1px solid #2a4d65',paddingTop:10,fontSize:12,fontWeight:700}}>Latest published affected-building evidence (South · June 2026 imagery)</div>
        <Metric label="Affected buildings" value={number(damage?.affected_buildings)} sub="All damage classes together. Available for 10 published hotspots."/>
        {damage?.destroyed_buildings!=null&&<Metric label="Destroyed buildings (dated source)" value={number(damage.destroyed_buildings)} sub={`Observation ${damage.assessment_date??'date not specified'}`}/>}
        {validPct&&<div style={{paddingTop:6}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:12}}><span>Affected share of assessed building stock</span><strong>{pct.toFixed(1)}%</strong></div>
          <div style={{height:9,borderRadius:8,marginTop:7,background:'#18394d',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:'#e6a65e'}}/></div>
        </div>}
        {damage?<p style={{...captionStyle,margin:'5px 0 0'}}>UNDP source: {damage.source}. Observation: {damage.assessment_date??'Not specified'}. {damage.note}</p>
          :<p style={{...captionStyle,margin:'5px 0 0',color:'#f6cf8c'}}>No newer cadastral affected-building count published in this extract. Not a zero-damage assessment.</p>}
        {history?.observations?.map(record=><div key={record.dataset_id} style={{paddingTop:10,borderTop:'1px solid #2a4d65',display:'grid',gap:8}}>
          <div style={{fontSize:12,fontWeight:700}}>Historical UNDP damage · {record.observation_date}</div>
          <Metric label="Completely destroyed buildings" value={number(record.destroyed_buildings)}/>
          {record.partially_damaged_buildings!=null&&<Metric label="Partially damaged buildings" value={number(record.partially_damaged_buildings)}/>}
          {record.targeted_apartments!=null&&<Metric label="Apartment-level impacts" value={number(record.targeted_apartments)} sub="Separate from destroyed buildings; do not add to structure counts"/>}
          <p style={{...captionStyle,margin:0,color:record.cadastral_coverage==='partial'?'#f6cf8c':'#aacfe0'}}>
            Coverage: {record.cadastral_coverage==='partial'?'PARTIAL satellite coverage (underestimate possible)':record.cadastral_coverage==='full'?'Full cadastral coverage reported':'Assessed area only'}. {record.verification}.
          </p>
          <p style={{...captionStyle,margin:0}}><a href={record.source_url} target="_blank" rel="noopener noreferrer" style={sourceLinkStyle}>UNDP source (PDF)</a>. Historical snapshot; not a current count or a cumulative sum with newer damage.</p>
        </div>)}
        {state.loaded&&state.history&&!history&&<p style={{...captionStyle,margin:0,color:'#f6cf8c'}}>No dated destroyed-building record matched this cadastre in the additional publications. Not reported ≠ zero.</p>}
        {state.loaded&&!state.history&&<p style={{...captionStyle,margin:0,color:'#f6cf8c'}}>Historic UNDP source not imported yet; run scripts/expand-verified-building-damage.mjs.</p>}
      </>:districtHistory?<>
        <div style={{paddingTop:9,borderTop:'1px solid #2a4d65',fontSize:12,fontWeight:700}}>UNDP assessed-area summary · {districtHistory.observation_date}</div>
        <Metric label="Destroyed buildings in assessed area" value={number(districtHistory.destroyed_buildings)}/>
        <Metric label="Partially damaged in assessed area" value={number(districtHistory.partially_damaged_buildings)}/>
        <Metric label="Targeted apartments" value={number(districtHistory.targeted_apartments)} sub="Apartment-level impacts, separate from buildings"/>
        <p style={{...captionStyle,margin:0}}>{districtHistory.scope}. <a href={districtHistory.source_url} target="_blank" rel="noopener noreferrer" style={sourceLinkStyle}>Read UNDP report</a>.</p>
      </>:<p style={{...captionStyle,margin:0}}>District destruction counts not published at this geographic level in the imported assessments. Cadastral record sums are not presented as district-wide totals.</p>}
      <p style={{...captionStyle,margin:0}}>Population, hosted IDPs, returnees, damaged buildings and destroyed buildings describe different measurements. Historical dates, source areas and categories are not interchangeable.</p>
    </div>
  </section>;
}
