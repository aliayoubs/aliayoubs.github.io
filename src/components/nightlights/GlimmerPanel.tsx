import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeftRight,BookOpen,ExternalLink,Info,Layers3,Loader2,UploadCloud,ShieldCheck} from 'lucide-react';
import type {GeoBounds} from '../../services/blackMarble';
import {
  boundsIntersect,parseGlimmerManifest,scenePlacement,SDGSAT_DATA,SDGSAT_MANIFEST,
  SDGSAT_PORTAL,SDGSAT_PROGRAM,SDGSAT_SENSOR,SDGSAT_TERMS,
  type GlimmerBand,type GlimmerScene
} from '../../services/sdgsat';

type Props={scopeName:string;viewport:GeoBounds;referenceBefore:string;referenceAfter:string};
function GlimmerFrame({scene,viewport,label}:{scene:GlimmerScene|null;viewport:GeoBounds;label:string}){
  const [loaded,setLoaded]=useState<'pending'|'ready'|'error'>('pending');
  useEffect(()=>setLoaded('pending'),[scene?.imageUrl]);
  return <div className="ton-night-frame ton-glimmer-frame">
    <div className="ton-glimmer-grid"/>
    {scene?<>
      <img key={scene.id} src={scene.imageUrl} style={scenePlacement(scene.bbox,viewport)} alt={`SDGSAT-1 ${label} Glimmer scene acquired ${scene.acquisition_date}`} draggable={false} onLoad={()=>setLoaded('ready')} onError={()=>setLoaded('error')}/>
      {loaded==='pending'&&<div className="ton-night-image-notice"><Loader2 size={19} className="ton-night-spin"/> Loading authorized Glimmer preview…</div>}
      {loaded==='error'&&<div className="ton-night-image-notice error"><Info size={19}/>Preview could not load. Check the PNG filename and manifest.</div>}
      <div className="ton-night-image-label"><b>{label}</b><span>{scene.acquisition_date} · {scene.band} · {scene.resolution_m} m sensor</span></div>
      <div className="ton-glimmer-product">{scene.product_id}</div>
    </>:<div className="ton-glimmer-missing"><Layers3 size={29}/><strong>No {label.toLowerCase()} acquisition</strong><span>Import an authorized Glimmer scene with a georeferenced preview.</span></div>}
  </div>;
}

export default function GlimmerPanel({scopeName,viewport,referenceBefore,referenceAfter}:Props){
  const [bundled,setBundled]=useState<GlimmerScene[]>([]);
  const [sessions,setSessions]=useState<GlimmerScene[]>([]);
  const urlsRef=useRef<string[]>([]);
  const inputRef=useRef<HTMLInputElement>(null);
  const [loadError,setLoadError]=useState('');
  const [loading,setLoading]=useState(true);
  const [band,setBand]=useState<GlimmerBand>('P');
  const [layout,setLayout]=useState<'swipe'|'split'>('swipe');
  const [swipe,setSwipe]=useState(50);
  const [beforeId,setBeforeId]=useState('');
  const [afterId,setAfterId]=useState('');
  useEffect(()=>{
    let cancelled=false;
    fetch(SDGSAT_MANIFEST,{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw new Error(`Unable to load project manifest (${r.status})`);
      const value=parseGlimmerManifest(await r.json());
      if(!cancelled)setBundled(value.scenes.map(s=>({...s,origin:'project' as const,imageUrl:`/data/sdgsat1/${encodeURIComponent(s.filename)}`})));
    }).catch(e=>{if(!cancelled)setLoadError(e instanceof Error?e.message:String(e))}).finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[]);
  useEffect(()=>()=>{urlsRef.current.forEach(u=>URL.revokeObjectURL(u));urlsRef.current=[]},[]);

  const allScenes=useMemo(()=>[...bundled,...sessions],[bundled,sessions]);
  const candidates=useMemo(()=>allScenes.filter(s=>s.band===band&&boundsIntersect(s.bbox,viewport)).sort((a,b)=>a.acquisition_date.localeCompare(b.acquisition_date)),[allScenes,band,viewport]);
  const beforeScene=candidates.find(s=>s.id===beforeId)||candidates.filter(s=>s.acquisition_date<=referenceBefore).at(-1)||candidates[0]||null;
  const afterDefault=candidates.find(s=>s.id!==beforeScene?.id&&s.acquisition_date>=referenceAfter)||candidates.find(s=>s.id!==beforeScene?.id)||null;
  const afterScene=candidates.find(s=>s.id===afterId&&s.id!==beforeScene?.id)||afterDefault;
  const validPair=!!beforeScene&&!!afterScene&&beforeScene.acquisition_date<afterScene.acquisition_date;
  const currentCoverage=!!beforeScene&&!!afterScene&&boundsIntersect(beforeScene.bbox,viewport)&&boundsIntersect(afterScene.bbox,viewport);
  const noSource=allScenes.length===0;

  async function importScenes(files:FileList|null){
    if(!files?.length)return;
    setLoadError('');
    const provided=[...files];
    const manifestFile=provided.find(f=>f.name.toLowerCase().endsWith('.json'));
    if(!manifestFile){setLoadError('Select a JSON manifest together with its matching PNG/JPEG image files.');return;}
    if(manifestFile.size>250_000){setLoadError('Scene manifest is too large.');return;}
    const urls:string[]=[];
    try{
      const doc=parseGlimmerManifest(JSON.parse(await manifestFile.text()));
      if(doc.scenes.length===0)throw new Error('Manifest does not contain any scenes.');
      if(doc.scenes.length>12)throw new Error('Import 12 or fewer scenes at a time.');
      const rows=doc.scenes.map(s=>{
        const img=provided.find(f=>f.name===s.filename);
        if(!img)throw new Error(`${s.filename}: missing image. Choose the manifest and all named previews together.`);
        if(img.size>35_000_000)throw new Error(`${s.filename}: exceeds 35 MB; reduce preview dimensions.`);
        if(!['image/png','image/jpeg'].includes(img.type))throw new Error(`${s.filename}: only PNG/JPEG previews are supported.`);
        const imageUrl=URL.createObjectURL(img);urls.push(imageUrl);
        return {...s,imageUrl,origin:'session' as const};
      });
      urlsRef.current.push(...urls);
      setSessions(rows);
      setBeforeId('');setAfterId('');setBand(rows[0]?.band||'P');
    }catch(err){urls.forEach(u=>URL.revokeObjectURL(u));setLoadError(err instanceof Error?err.message:'Unable to import files.');}
  }
  return <div className="ton-glimmer-panel">
    <div className="ton-glimmer-headline">
      <div><span className="ton-night-eyebrow">CBAS / SDGSAT-1 / GLIMMER IMAGER</span><h3>Sharper nightlights, real acquisitions.</h3><p>10 m panchromatic / 40 m RGB sensor data · georeferenced, authorized local scenes only</p></div>
      <span className="ton-glimmer-hd-pill">HIGH-DETAIL SOURCE</span>
    </div>
    <div className="ton-glimmer-info"><Info size={16}/><span><strong>NASA remains the measurement baseline.</strong> Glimmer is an independent sensor, not an upscaled NASA layer. Only compare dates from actual Glimmer acquisitions. No Lebanon imagery has been supplied with this project.</span></div>
    <div className="ton-glimmer-controls">
      <div className="ton-night-segment"><button className={band==='P'?'active':''} onClick={()=>{setBand('P');setBeforeId('');setAfterId('')}}>Panchromatic · 10 m</button><button className={band==='RGB'?'active':''} onClick={()=>{setBand('RGB');setBeforeId('');setAfterId('')}}>RGB · 40 m</button></div>
      <div className="ton-night-segment"><button className={layout==='swipe'?'active':''} onClick={()=>setLayout('swipe')}><ArrowLeftRight size={14}/> Swipe</button><button className={layout==='split'?'active':''} onClick={()=>setLayout('split')}>Side by side</button></div>
      <span className="ton-glimmer-count">{candidates.length} scenes intersect {scopeName}</span>
    </div>
    <div className="ton-glimmer-scene-selects">
      <label>BEFORE SCENE<select value={beforeScene?.id||''} onChange={e=>{setBeforeId(e.target.value);setAfterId('')}} disabled={!candidates.length}>
        {candidates.length===0&&<option value="">No imported scenes</option>}
        {candidates.map(s=><option value={s.id} key={s.id}>{s.acquisition_date} · {s.id}</option>)}
      </select></label>
      <label>AFTER SCENE<select value={afterScene?.id||''} onChange={e=>setAfterId(e.target.value)} disabled={candidates.length<2}>
        {candidates.length<2&&<option value="">Need another acquisition</option>}
        {candidates.filter(s=>s.id!==beforeScene?.id).map(s=><option value={s.id} key={s.id}>{s.acquisition_date} · {s.id}</option>)}
      </select></label>
    </div>
    {candidates.length>0&&(!validPair||!currentCoverage)&&<div className="ton-night-alert"><Info size={16}/>{!validPair?'Select two different dates in chronological order before interpreting a change.':'Scenes may not fully cover this viewport; empty areas are not zero radiance.'}</div>}
    <div className={layout==='split'?'ton-night-comparison ton-night-split ton-glimmer-comparison':'ton-night-comparison ton-night-swipe ton-glimmer-comparison'}>
      <GlimmerFrame scene={beforeScene} viewport={viewport} label="BEFORE"/>
      <div className="ton-night-after-layer" style={layout==='swipe'?{clipPath:`inset(0 0 0 ${swipe}%)`}:undefined}><GlimmerFrame scene={afterScene} viewport={viewport} label="AFTER"/></div>
      {layout==='swipe'&&<><div className="ton-night-divider" style={{left:`${swipe}%`}}><span><ArrowLeftRight size={20}/></span></div><input className="ton-night-slider" type="range" aria-label="Swipe between imported SDGSAT-1 acquisitions" min={8} max={92} value={swipe} onChange={e=>setSwipe(Number(e.target.value))} onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId)}} onClick={e=>e.stopPropagation()}/></>}
    </div>
    {layout==='swipe'&&<div className="ton-night-swipe-bar"><span>BEFORE</span><input type="range" min={8} max={92} value={swipe} onChange={e=>setSwipe(Number(e.target.value))} aria-label="Glimmer comparison position"/><span>AFTER</span></div>}
    <div className="ton-glimmer-import">
      <div><h4><UploadCloud size={18}/> Add approved Glimmer imagery</h4><p>Upload <code>manifest.json</code> together with its corresponding georeferenced PNG/JPEG preview files. Preview raster must be north-up EPSG:4326 with accurately measured geographic bounds. Session imports disappear after refreshing; the included converter can save scenes permanently in <code>public/data/sdgsat1/</code>.</p></div>
      <input hidden ref={inputRef} type="file" multiple accept=".json,.png,.jpg,.jpeg,application/json,image/png,image/jpeg" onChange={e=>{void importScenes(e.target.files);e.currentTarget.value=''}}/>
      <button className="ton-night-import-button" onClick={()=>inputRef.current?.click()}><UploadCloud size={16}/> Import scenes</button>
    </div>
    {loading&&<p className="ton-night-file-status"><Loader2 size={15} className="ton-night-spin"/> Checking locally bundled scene manifest…</p>}
    {!loading&&noSource&&<p className="ton-glimmer-availability"><Info size={15}/> No approved Southern Lebanon scenes loaded. NASA Black Marble continues to work in its tab. The SDGSAT-1 data catalogue requires login and research approval.</p>}
    {loadError&&<p role="alert" className="ton-night-alert"><Info size={15}/>{loadError}</p>}
    <div className="ton-glimmer-bottom-grid"><div><strong><ShieldCheck size={16}/> Source & measurement integrity</strong><p>Display previews are contrast-stretched for visualization. Their image brightness is <em>not</em> a calibrated radiance measurement; no numerical values are generated from them. For scientific comparisons, process the source DN/radiance values with CBAS calibration, cloud/quality checks, and consistent acquisition conditions. Do not merge NASA and Glimmer radiance scales.</p></div><div><strong><BookOpen size={16}/> Licensing & coverage</strong><p>CBAS authorizes use through its Open Science Program subject to approval and a user agreement. Do not redistribute imagery or derivative products without permission. NASA images and measurements remain separate and publicly sourced.</p></div></div>
    <div className="ton-night-links"><a href={SDGSAT_PORTAL} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Request scenes</a><a href={SDGSAT_PROGRAM} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open Science Program</a><a href={SDGSAT_SENSOR} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Sensor specs</a><a href={SDGSAT_DATA} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Level-4 format</a><a href={SDGSAT_TERMS} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Usage terms</a></div>
  </div>;
}
