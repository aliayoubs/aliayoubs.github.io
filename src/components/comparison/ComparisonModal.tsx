import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {AnimatePresence,motion} from 'framer-motion';
import {createPortal} from 'react-dom';
import {
  ArrowLeftRight,CalendarDays,CheckCircle2,ExternalLink,Expand,Info,
  Layers3,LoaderCircle,Minus,Move,Plus,RotateCcw,Satellite,ShieldAlert,X
} from 'lucide-react';
import {NASA_GIBS_DOCS,NASA_MAX_ZOOM,NASA_WORLDVIEW,isObservationDate,nasaTileUrl,worldPixel} from '../../services/imagery';
import {
  findSentinelScenes,renderedSceneTile,SENTINEL_DOCS,type SentinelScene
} from '../../services/sentinel';

const BEFORE_BASELINE='2025-10-23';
const AFTER_BASELINE='2026-06-16';
const TODAY=new Date().toISOString().slice(0,10);
const ESRI_URL='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
type Source='sentinel'|'nasa'|'reference';
type Focus={id:string;name:string;coordinates:[number,number]};
type Props={open:boolean;onClose:()=>void;focus:Focus};
type Drag={id:number;x:number;y:number;center:[number,number];zoom:number;action:'pan'|'swipe'};
type SearchState={status:'idle'|'loading'|'ready'|'empty'|'error';scenes:SentinelScene[];selectedId:string;message:string};
const initialSearch=():SearchState=>({status:'idle',scenes:[],selectedId:'',message:''});
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
function unproject(x:number,y:number,z:number):[number,number]{
  const full=256*2**z;
  return [(x/full*360)-180,Math.atan(Math.sinh(Math.PI*(1-2*y/full)))*180/Math.PI];
}
const bounds:Record<Source,[number,number]>={sentinel:[10,16],nasa:[6,11],reference:[10,17]};
function tiles(center:[number,number],width:number,height:number,zoom:number,source:Source,date:string,scene:SentinelScene|null){
  if(width<1||height<1||(source==='nasa'&&!isObservationDate(date))||(source==='sentinel'&&!scene))return [];
  const native=source==='nasa'?Math.min(zoom,NASA_MAX_ZOOM):zoom;
  const edge=256*2**(zoom-native),mid=worldPixel(center,zoom),limit=2**native;
  const minX=Math.floor((mid.x-width/2)/edge)-1,maxX=Math.floor((mid.x+width/2)/edge)+1;
  const minY=Math.floor((mid.y-height/2)/edge)-1,maxY=Math.floor((mid.y+height/2)/edge)+1;
  const out:{key:string;url:string;left:number;top:number;size:number}[]=[];
  for(let y=minY;y<=maxY;y++){
    if(y<0||y>=limit)continue;
    for(let x=minX;x<=maxX;x++){
      const col=(x%limit+limit)%limit;
      const url=source==='nasa'?nasaTileUrl(date,native,col,y):source==='reference'?`${ESRI_URL}/${native}/${y}/${col}`:renderedSceneTile(scene!,native,col,y);
      out.push({key:`${source}:${scene?.id||date}:${native}:${x}:${y}`,url,left:x*edge-mid.x+width/2,top:y*edge-mid.y+height/2,size:edge});
    }
  }
  return out;
}
const styles=`
.ton-cmp-modal{width:min(1150px,100%);max-height:calc(100dvh - 34px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #426680;box-shadow:0 32px 110px #000b}
.ton-cmp-modal .comparison-heading{padding:17px 24px;flex-shrink:0;background:linear-gradient(100deg,#0c263e,#112f47);align-items:center}
.ton-cmp-modal .comparison-heading h2{font-size:23px;margin:7px 0 2px}
.ton-cmp-modal .comparison-heading p{font-size:11px}
.ton-cmp-modal .comparison-body{padding:15px 22px 18px;overflow:auto;min-height:0}
.ton-cmp-headline{display:flex;justify-content:space-between;gap:10px;align-items:center}
.ton-cmp-headline-badge{padding:7px 10px;border:1px solid #3e7890;background:#103b50;color:#93e6ef;font-size:10px;font-weight:750;letter-spacing:.65px;border-radius:6px;white-space:nowrap}
.ton-cmp-sources{display:flex;align-items:stretch;gap:7px;flex-wrap:wrap;margin-bottom:13px}
.ton-cmp-sources button{padding:10px 12px;background:#0c2337;color:#b0cbdc;border:1px solid #30536b;border-radius:6px;font-size:11px;font-weight:750;cursor:pointer}
.ton-cmp-sources button.active{background:#13506d;color:white;border-color:#31cbe8;box-shadow:inset 0 0 0 1px #26c6e233}
.ton-cmp-sources button small{display:block;font-size:9px;color:#94bfd1;margin-top:3px;font-weight:450}
.ton-cmp-toolbar{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:12px}
.ton-cmp-dates{display:flex;gap:10px;flex-wrap:wrap;align-items:end}
.ton-cmp-dates label{display:flex;flex-direction:column;gap:5px;font-size:9px;letter-spacing:.55px;font-weight:800;color:#8ac5d8}
.ton-cmp-dates input{color-scheme:dark;background:#061b2c;color:#eaf9ff;border:1px solid #36617a;padding:9px 10px;border-radius:5px;font-size:12px;min-width:145px}
.ton-cmp-action{background:#102e44;border:1px solid #385c75;color:#d6ecf6;border-radius:6px;display:inline-flex;align-items:center;gap:6px;padding:9px 11px;font-weight:650;font-size:11px;cursor:pointer;white-space:nowrap}
.ton-cmp-action:hover{border-color:#68def2}.ton-cmp-action:disabled{opacity:.38;cursor:not-allowed}
.ton-cmp-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ton-cmp-control-label{font-size:11px;color:#c6d8e5;min-width:44px;text-align:center;font-variant-numeric:tabular-nums}
.ton-cmp-scene-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
.ton-cmp-scene{border:1px solid #2e4e66;border-radius:7px;background:#0c263a;padding:10px 12px;min-height:69px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.ton-cmp-scene strong{font-size:10px;letter-spacing:.5px;color:#cae2f0}.ton-cmp-scene small{color:#86adc3;font-size:10px;line-height:1.5}
.ton-cmp-scene select{margin-top:2px;width:100%;background:#071e32;color:#d1f5ff;border:1px solid #406b86;border-radius:5px;padding:8px;font-size:11px}
.ton-cmp-scene .observed{color:#77e9ca;font-weight:800}
.ton-cmp-loading{display:flex;gap:8px;align-items:center;color:#b6cddb;font-size:12px;line-height:1.6}
.ton-cmp-loading svg{animation:toncmp-spin 1.1s linear infinite}
@keyframes toncmp-spin{to{transform:rotate(360deg)}}
.ton-cmp-stage{height:clamp(340px,48vh,590px);min-height:340px;position:relative;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at center,#24445b,#091b2d);border:1px solid #385d75;border-radius:10px;touch-action:none;cursor:grab;box-shadow:0 6px 22px #0003}
.ton-cmp-stage.grabbing{cursor:grabbing}.ton-cmp-stage,.ton-cmp-divider{ -webkit-user-select:none;user-select:none }.ton-cmp-stage.expanded{height:clamp(380px,65vh,730px)}
.ton-cmp-raster{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.ton-cmp-raster>img{position:absolute;max-width:none;display:block;pointer-events:none;user-select:none}
.ton-cmp-layer-after{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}
.ton-cmp-stage.side-by-side{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px}
.ton-cmp-stage.side-by-side>.ton-cmp-raster{position:relative;min-width:0}
.ton-cmp-pin{position:absolute;z-index:1;width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:#f16470;box-shadow:0 0 0 5px #0a2834ad;transform:translate(-50%,-50%)}
.ton-cmp-tag{position:absolute;top:12px;left:12px;z-index:5;pointer-events:none;background:#061b2ce8;border:1px solid #56778c;padding:8px 10px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.5px;color:#effaff}
.ton-cmp-tag.right{left:auto;right:12px}.ton-cmp-stage.side-by-side .ton-cmp-tag.right{right:auto;left:calc(50% + 13px)}
.ton-cmp-divider{position:absolute;z-index:20;top:0;bottom:0;width:48px;margin-left:-24px;cursor:ew-resize;touch-action:none;pointer-events:auto;background:transparent;user-select:none}
.ton-cmp-divider::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:2px;transform:translateX(-50%);background:#fcfdff;box-shadow:0 0 8px #e4fcff;pointer-events:none}
.ton-cmp-divider>button{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;display:grid;place-items:center;border:0;border-radius:50%;background:#e7faff;color:#0c3044;cursor:ew-resize;box-shadow:0 5px 22px #0009;touch-action:none;pointer-events:none}
.ton-cmp-bottom-left{position:absolute;bottom:10px;left:12px;z-index:5;pointer-events:none;font-size:10px;color:#d1e8f5;background:#04192ddc;border-radius:5px;padding:7px 9px}
.ton-cmp-bottom-right{position:absolute;bottom:10px;right:12px;z-index:5;pointer-events:none;font-size:10px;color:#d1e8f5;background:#04192ddc;border-radius:5px;padding:7px 9px;display:flex;align-items:center;gap:5px}
.ton-cmp-empty{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;text-align:center;padding:26px;background:radial-gradient(ellipse at center,#153c52 0,#07192b 74%);z-index:4}
.ton-cmp-empty strong{font-size:17px}.ton-cmp-empty p{max-width:440px;color:#a8c3d4;font-size:12px;line-height:1.6;margin:0}
.ton-cmp-empty button{margin-top:4px;background:#155675;color:#fff;border:1px solid #40bedc;border-radius:6px;padding:11px 14px;cursor:pointer;font-weight:700;font-size:11px}
.ton-cmp-range{display:flex;align-items:center;gap:12px;margin-top:10px;font-size:10px;font-weight:750;color:#9ac4d5;letter-spacing:.5px}
.ton-cmp-range input{flex:1;accent-color:#46d3f1;min-width:0}
.ton-cmp-notes{display:flex;align-items:flex-start;gap:9px;line-height:1.5;margin-top:10px;padding:10px 12px;background:#0d2b3f;border:1px solid #2d506b;border-radius:6px;color:#aac6d8;font-size:11px}
.ton-cmp-notes svg{flex-shrink:0;margin-top:1px}.ton-cmp-notes a{color:#91e5fb;text-decoration:underline}
.ton-cmp-notes.warning{background:#33281f;border-color:#795b39;color:#eac997}
.ton-cmp-provenance{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px;color:#8aaabd;font-size:10px}
.ton-cmp-provenance span{display:inline-flex;align-items:center;gap:4px}
@media(max-width:760px){.ton-cmp-modal{max-height:calc(100dvh - 12px)}.ton-cmp-modal .comparison-heading{padding:14px}.ton-cmp-modal .comparison-heading h2{font-size:18px}.ton-cmp-modal .comparison-body{padding:12px}.ton-cmp-headline-badge{display:none}.ton-cmp-stage{min-height:290px;height:39vh}.ton-cmp-scene-row{grid-template-columns:1fr}.ton-cmp-sources button{flex:1}.ton-cmp-dates input{min-width:128px}.ton-cmp-tag{font-size:9px}.ton-cmp-bottom-right{display:none}}
`;

function Raster({source,date,scene,center,zoom,width,height,focus,onTileFailure}:{
  source:Source;date:string;scene:SentinelScene|null;center:[number,number];zoom:number;width:number;height:number;focus:Focus;onTileFailure:()=>void;
}){
  const cells=useMemo(()=>tiles(center,width,height,zoom,source,date,scene),[source,date,scene,center,zoom,width,height]);
  const mid=worldPixel(center,zoom),p=worldPixel(focus.coordinates,zoom);
  const left=p.x-mid.x+width/2,top=p.y-mid.y+height/2;
  return <div className="ton-cmp-raster">
    {cells.map(t=><img key={t.key} src={t.url} alt="" loading="eager" decoding="async" draggable={false}
      style={{left:t.left,top:t.top,width:t.size,height:t.size}} onError={onTileFailure}/>)}
    {left>=0&&top>=0&&left<width&&top<height&&<span className="ton-cmp-pin" style={{left,top}} aria-hidden="true"/>}
  </div>;
}

function SceneInfo({label,target,state,selected,onSelect}:{label:string;target:string;state:SearchState;selected:SentinelScene|null;onSelect:(id:string)=>void}){
  return <div className="ton-cmp-scene">
    <strong>{label} · TARGET {target}</strong>
    {state.status==='loading'?<span className="ton-cmp-loading"><LoaderCircle size={13}/>Finding nearby Sentinel-2 acquisitions…</span>:
     state.status==='ready'?<>
       <small>Actual observation: <span className="observed">{selected?.acquired||'—'}</span> · {selected?.platform||'Sentinel-2'} · scene clouds {selected?.cloudCover===null?'unknown':`${Math.round(selected?.cloudCover??0)}%`}</small>
       {state.scenes.length>1&&<select value={state.selectedId} onChange={e=>onSelect(e.target.value)} aria-label={`${label} Sentinel-2 image`}>
         {state.scenes.map(s=><option key={s.id} value={s.id}>{s.acquired} · clouds {s.cloudCover===null?'n/a':`${Math.round(s.cloudCover)}%`} · {s.platform}</option>)}
       </select>}
     </>:<small>{state.status==='error'?state.message:state.status==='empty'?'No scene found within 50 days of target date.':'Searching acquisition archive when you open the comparison.'}</small>}
  </div>;
}

export default function ComparisonModal({open,onClose,focus}:Props){
  const [source,setSource]=useState<Source>('sentinel');
  const [before,setBefore]=useState(BEFORE_BASELINE),[after,setAfter]=useState(AFTER_BASELINE);
  const [leftSearch,setLeftSearch]=useState<SearchState>(initialSearch);
  const [rightSearch,setRightSearch]=useState<SearchState>(initialSearch);
  const [center,setCenter]=useState<[number,number]>(focus.coordinates),[zoom,setZoom]=useState(13);
  const [slider,setSlider]=useState(50),[sideBySide,setSideBySide]=useState(false),[expanded,setExpanded]=useState(false);
  const [tileFailed,setTileFailed]=useState(false),[dragging,setDragging]=useState(false);
  const stageRef=useRef<HTMLDivElement>(null),dragRef=useRef<Drag|null>(null);
  const [size,setSize]=useState({width:990,height:470});
  const valid=isObservationDate(before)&&isObservationDate(after)&&before<after&&after<=TODAY;
  const [minZoom,maxZoom]=bounds[source];
  const leftScene=leftSearch.scenes.find(s=>s.id===leftSearch.selectedId)||null;
  const rightScene=rightSearch.scenes.find(s=>s.id===rightSearch.selectedId)||null;
  const ready=source!=='sentinel'||(leftSearch.status==='ready'&&rightSearch.status==='ready');
  const nonReference=source!=='reference';
  const onTileFailure=useCallback(()=>setTileFailed(true),[]);
  useEffect(()=>{if(open){setSource('sentinel');setCenter(focus.coordinates);setZoom(13);setSlider(50);setSideBySide(false);setExpanded(false);setTileFailed(false);setBefore(BEFORE_BASELINE);setAfter(AFTER_BASELINE)}},[open,focus.id]);
  useEffect(()=>{setTileFailed(false)},[source,before,after,leftSearch.selectedId,rightSearch.selectedId]);
  useEffect(()=>{
    if(!open||source!=='sentinel'||!valid)return;
    const controller=new AbortController();
    setLeftSearch({...initialSearch(),status:'loading'});setRightSearch({...initialSearch(),status:'loading'});
    const apply=(date:string,set:(state:SearchState)=>void)=>findSentinelScenes(focus.coordinates,date,controller.signal)
      .then(scenes=>{if(!controller.signal.aborted)set(scenes.length?{status:'ready',scenes,selectedId:scenes[0].id,message:''}:{status:'empty',scenes:[],selectedId:'',message:''})})
      .catch(e=>{if(!controller.signal.aborted)set({status:'error',scenes:[],selectedId:'',message:e instanceof Error?e.message:'Satellite catalog unavailable'})});
    void apply(before,setLeftSearch);void apply(after,setRightSearch);
    return()=>controller.abort();
  },[open,source,valid,before,after,focus.id,focus.coordinates[0],focus.coordinates[1]]);
  useEffect(()=>{if(!open)return;const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[open,onClose]);
  useEffect(()=>{if(!open)return;const el=stageRef.current;if(!el)return;const measure=()=>{const r=el.getBoundingClientRect();setSize({width:Math.round(r.width),height:Math.round(r.height)})};measure();const ob=new ResizeObserver(measure);ob.observe(el);return()=>ob.disconnect()},[open,sideBySide,expanded,source,ready]);
  useEffect(()=>{if(!open)return;const el=stageRef.current;if(!el)return;const fn=(e:WheelEvent)=>{e.preventDefault();setZoom(z=>clamp(z+(e.deltaY<0?1:-1),minZoom,maxZoom))};el.addEventListener('wheel',fn,{passive:false});return()=>el.removeEventListener('wheel',fn)},[open,minZoom,maxZoom]);
  const changeSource=(next:Source)=>{setSource(next);setZoom(next==='nasa'?8:next==='reference'?14:13);setCenter(focus.coordinates);setSlider(50);setTileFailed(false)};
  const reset=()=>{setCenter(focus.coordinates);setZoom(source==='nasa'?8:source==='reference'?14:13);setSlider(50);setTileFailed(false)};
  const resetDates=()=>{setBefore(BEFORE_BASELINE);setAfter(AFTER_BASELINE)};
  function pointerDown(e:ReactPointerEvent<HTMLDivElement>){
    e.stopPropagation();
    if(e.button!==0||!ready)return;
    const target=e.target as HTMLElement;
    if(target.closest('button, input, select')&&!target.closest('[data-cmp-handle]'))return;
    e.preventDefault();
    const rect=e.currentTarget.getBoundingClientRect();
    const nearDivider=!sideBySide&&nonReference&&Math.abs(e.clientX-rect.left-(slider/100)*rect.width)<=34;
    const action=target.closest('[data-cmp-handle]')||nearDivider?'swipe':'pan';
    dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,center,zoom,action};
    e.currentTarget.setPointerCapture(e.pointerId);setDragging(action==='pan');
  }
  function pointerMove(e:ReactPointerEvent<HTMLDivElement>){
    e.stopPropagation();
    const drag=dragRef.current;if(!drag||drag.id!==e.pointerId)return;
    if(drag.action==='swipe'){
      const rect=e.currentTarget.getBoundingClientRect();setSlider(clamp((e.clientX-rect.left)/rect.width*100,0,100));return;
    }
    const p=worldPixel(drag.center,drag.zoom);
    const next=unproject(p.x-(e.clientX-drag.x),p.y-(e.clientY-drag.y),drag.zoom);
    setCenter([clamp(next[0],-179.999,179.999),clamp(next[1],-85,85)]);
  }
  function pointerUp(e:ReactPointerEvent<HTMLDivElement>){
    e.stopPropagation();
    if(dragRef.current?.id!==e.pointerId)return;
    dragRef.current=null;setDragging(false);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const panelWidth=sideBySide&&nonReference?size.width/2:size.width;
  const render=(side:'before'|'after')=><Raster source={source} date={side==='before'?before:after}
    scene={side==='before'?leftScene:rightScene} center={center} zoom={zoom} width={panelWidth}
    height={size.height} focus={focus} onTileFailure={onTileFailure}/>;
  const pixelMeters=Math.round(40075016.686*Math.cos(center[1]*Math.PI/180)/(2**zoom*256));
  const beforeObserved=source==='sentinel'?leftScene?.acquired||before:before;
  const afterObserved=source==='sentinel'?rightScene?.acquired||after:after;
  const waiting=source==='sentinel'&&!ready;
  return createPortal(<AnimatePresence>{open&&<motion.div className="modal-backdrop" style={{zIndex:2147483000,pointerEvents:"auto"}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}} onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onDragStart={e=>e.preventDefault()}>
    <style>{styles}</style>
    <motion.div className="comparison-modal ton-cmp-modal" role="dialog" aria-modal="true" aria-label="Before and after satellite image comparison"
      initial={{y:18,opacity:0}} animate={{y:0,opacity:1}} exit={{y:18,opacity:0}}>
      <header className="comparison-heading"><div><span className="kicker"><Satellite size={15}/> EARTH OBSERVATION / CHANGE INSPECTION</span><h2>Before <ArrowLeftRight size={17} style={{verticalAlign:'middle',color:'#60d9ea'}}/> After · {focus.name}</h2><p>Aligned geographic extent · same map zoom · reported dates distinguished from image acquisitions</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close satellite comparison"><X size={23}/></button></header>
      <div className="comparison-body">
        <div className="ton-cmp-headline"><span style={{fontSize:10,letterSpacing:'.8px',fontWeight:750,color:'#8baec1',marginBottom:9}}>SELECT IMAGERY SOURCE</span><span className="ton-cmp-headline-badge">UNDP STUDY PERIOD · OCT 2025 – JUN 2026</span></div>
        <div className="ton-cmp-sources" role="group" aria-label="Comparison imagery source">
          <button className={source==='sentinel'?'active':''} aria-pressed={source==='sentinel'} onClick={()=>changeSource('sentinel')}>Sentinel-2 historical scenes<small>~10m · true color · dated</small></button>
          <button className={source==='nasa'?'active':''} aria-pressed={source==='nasa'} onClick={()=>changeSource('nasa')}>NASA daily observations<small>MODIS ~250m · dated</small></button>
          <button className={source==='reference'?'active':''} aria-pressed={source==='reference'} onClick={()=>changeSource('reference')}>High-detail reference only<small>Esri mosaic · undated</small></button>
        </div>
        <div className="ton-cmp-toolbar">
          {nonReference?<div className="ton-cmp-dates">
            <label>BEFORE · TARGET DATE<input type="date" value={before} min="2017-01-01" max={TODAY} onChange={e=>setBefore(e.target.value)}/></label>
            <label>AFTER · TARGET DATE<input type="date" value={after} min="2017-01-01" max={TODAY} onChange={e=>setAfter(e.target.value)}/></label>
            <button className="ton-cmp-action" type="button" onClick={resetDates}><CalendarDays size={14}/> UNDP dates</button>
          </div>:<div style={{fontSize:11,color:'#98c1d2',maxWidth:350,lineHeight:1.5}}>One up-to-date reference mosaic. Not a historical pair; imagery acquisition dates vary by location.</div>}
          <div className="ton-cmp-actions">
            {nonReference&&<button className="ton-cmp-action" type="button" onClick={()=>setSideBySide(x=>!x)}><ArrowLeftRight size={14}/>{sideBySide?'Swipe divider':'Side by side'}</button>}
            <button className="ton-cmp-action" aria-label="Zoom out" disabled={zoom<=minZoom} onClick={()=>setZoom(z=>clamp(z-1,minZoom,maxZoom))}><Minus size={16}/></button>
            <span className="ton-cmp-control-label">z {zoom}</span>
            <button className="ton-cmp-action" aria-label="Zoom in" disabled={zoom>=maxZoom} onClick={()=>setZoom(z=>clamp(z+1,minZoom,maxZoom))}><Plus size={16}/></button>
            <button className="ton-cmp-action" onClick={reset}><RotateCcw size={14}/> Reset</button>
            <button className="ton-cmp-action" onClick={()=>setExpanded(x=>!x)}><Expand size={14}/>{expanded?'Fit':'Expand'}</button>
          </div>
        </div>
        {source==='sentinel'&&valid&&<div className="ton-cmp-scene-row">
          <SceneInfo label="BEFORE" target={before} state={leftSearch} selected={leftScene} onSelect={id=>setLeftSearch(s=>({...s,selectedId:id}))}/>
          <SceneInfo label="AFTER" target={after} state={rightSearch} selected={rightScene} onSelect={id=>setRightSearch(s=>({...s,selectedId:id}))}/>
        </div>}
        {nonReference&&!valid&&<div className="ton-cmp-notes warning"><ShieldAlert size={16}/>Choose valid dates with the before date earlier than the after date, and the after date no later than today.</div>}
        <div className={`ton-cmp-stage${sideBySide&&nonReference?' side-by-side':''}${expanded?' expanded':''}${dragging?' grabbing':''}`}
          ref={stageRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
          aria-label="Satellite image comparison. Drag the imagery to pan, use the mouse wheel or zoom controls to zoom, and drag the white slider to reveal before and after imagery.">
          {source==='reference'?<>{render('before')}<span className="ton-cmp-tag">REFERENCE MOSAIC · NO ACQUISITION DATE</span></>:valid&&ready&&(
           sideBySide?<>{render('before')}{render('after')}<span className="ton-cmp-tag">BEFORE · {beforeObserved}</span><span className="ton-cmp-tag right">AFTER · {afterObserved}</span></>:<>
            {render('before')}<div className="ton-cmp-layer-after" style={{clipPath:`inset(0 0 0 ${slider}%)`}}>{render('after')}</div>
            <span className="ton-cmp-tag">BEFORE · {beforeObserved}</span><span className="ton-cmp-tag right">AFTER · {afterObserved}</span>
            <div className="ton-cmp-divider" data-cmp-handle style={{left:`${slider}%`}} role="slider" aria-label="Before and after divider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(slider)} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();setSlider(v=>clamp(v+5,0,100));}if(e.key==='ArrowLeft'){e.preventDefault();setSlider(v=>clamp(v-5,0,100));}}}><button type="button" tabIndex={-1} aria-hidden="true"><ArrowLeftRight size={20}/></button></div>
           </>)}
          {nonReference&&(!valid||waiting)&&<div className="ton-cmp-empty">
            {waiting?(leftSearch.status==='loading'||rightSearch.status==='loading')?<><LoaderCircle size={26} style={{color:'#62d9ee',animation:'toncmp-spin 1.1s linear infinite'}}/><strong>Finding dated Sentinel-2 imagery</strong><p>Searching actual satellite acquisitions near the UNDP assessment dates for {focus.name}.</p></>:
              <><ShieldAlert size={28} style={{color:'#f0bc78'}}/><strong>{leftSearch.status==='empty'||rightSearch.status==='empty'?'No matching scenes in this date window':'Historical imagery could not load'}</strong><p>Try another date, or switch to NASA's dated MODIS observations. An undated reference image will never be presented as historical evidence.</p><button onClick={()=>changeSource('nasa')}>Use NASA dated imagery</button></>:
              <><CalendarDays size={26}/><strong>Choose a valid date range</strong><p>The two requested dates must be valid and in chronological order.</p></>}
          </div>}
          <span className="ton-cmp-bottom-left">~{pixelMeters}m / display pixel · {source==='nasa'?'MODIS native ~250m':source==='sentinel'?'Sentinel-2 native ~10m':'reference mosaic'}</span>
          <span className="ton-cmp-bottom-right"><Move size={12}/> Drag to pan · scroll to zoom</span>
        </div>
        {nonReference&&!sideBySide&&<label className="ton-cmp-range">BEFORE<input type="range" min="0" max="100" value={slider} onChange={e=>setSlider(Number(e.target.value))} aria-label="Move before after satellite comparison slider"/>AFTER</label>}
        {tileFailed&&<div className="ton-cmp-notes warning"><ShieldAlert size={16}/><span>Some imagery tiles failed to load. Try zooming out, changing dates, or switching sources. Blank tiles are not evidence of damage. {source==='sentinel'&&<button className="ton-cmp-action" onClick={()=>changeSource('nasa')} style={{marginLeft:8}}>NASA fallback</button>}</span></div>}
        {source==='nasa'&&zoom>NASA_MAX_ZOOM&&<div className="ton-cmp-notes warning"><Info size={16}/>Above native zoom {NASA_MAX_ZOOM}, imagery is enlarged, not higher resolution. Individual building damage cannot be evaluated from MODIS.</div>}
        <div className="ton-cmp-notes"><Info size={16}/><div>{source==='sentinel'?<><strong>Sentinel-2 (Copernicus/ESA):</strong> True-color optical scenes, approximately 10m native resolution, catalogued by Microsoft Planetary Computer. Target dates can differ from actual acquisitions (shown above). Cloud percentage refers to the full scene, not necessarily the selected village. <a href={SENTINEL_DOCS} target="_blank" rel="noopener noreferrer">Source details <ExternalLink size={10}/></a></>:source==='nasa'?<><strong>NASA GIBS:</strong> MODIS Terra corrected-reflectance imagery (~250m). Requested dates are actual time-layer requests but may be cloudy or unavailable. <a href={NASA_GIBS_DOCS} target="_blank" rel="noopener noreferrer">GIBS documentation <ExternalLink size={10}/></a> · <a href={NASA_WORLDVIEW} target="_blank" rel="noopener noreferrer">Worldview <ExternalLink size={10}/></a>.</>:<><strong>Esri World Imagery:</strong> Undated high-detail reference mosaic. Its appearance cannot be used to infer before/after changes.</>}</div></div>
        <div className="ton-cmp-provenance"><span><CheckCircle2 size={13}/> Both sides share geographic alignment</span><span><Layers3 size={13}/> Historical imagery is not a damage classification</span><span><ShieldAlert size={13}/> UNDP building damage remains the published assessment</span></div>
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>,document.body);
}
