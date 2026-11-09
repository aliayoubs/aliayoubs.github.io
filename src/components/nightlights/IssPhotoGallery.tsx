import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,Camera,ExternalLink,ImageOff,Info,Maximize2,MoonStar,Search,ShieldCheck,Sun,X} from 'lucide-react';
import {ISS_ARCHIVE_URL,ISS_PHOTOS,ISS_TIMELAPSE_URL,type IssCategory,type IssPhoto} from '../../data/issPhotos';

type GalleryFilter='all'|IssCategory;
function RemotePhoto({photo,mode}:{photo:IssPhoto;mode:'thumb'|'large'}){
  const [failed,setFailed]=useState(false);
  const src=mode==='large'?photo.largeUrl:photo.thumbUrl;
  useEffect(()=>setFailed(false),[src]);
  return failed?<div className="ton-iss-photo-error"><ImageOff size={23}/><span>Image not available from NASA archive right now</span><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Open source record <ExternalLink size={12}/></a></div>
    :<img key={src} src={src} alt={`${photo.title} — astronaut photograph ${photo.photoId}, ${photo.captured}`} loading={mode==='thumb'?'lazy':'eager'} decoding="async" draggable={false} onError={()=>setFailed(true)}/>;
}
export default function IssPhotoGallery(){
  const [filter,setFilter]=useState<GalleryFilter>('all');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const photos=useMemo(()=>ISS_PHOTOS.filter(p=>{
    const ok=filter==='all'||filter===p.category;
    const q=query.trim().toLowerCase();
    return ok&&(!q||`${p.title} ${p.area} ${p.photoId} ${p.captured} ${p.description}`.toLowerCase().includes(q));
  }),[filter,query]);
  const current=ISS_PHOTOS.find(p=>p.id===selected)||null;
  const selectedIndex=current?photos.findIndex(p=>p.id===current.id):-1;
  const step=(delta:number)=>{
    if(photos.length<1)return;
    const index=selectedIndex<0?0:(selectedIndex+delta+photos.length)%photos.length;
    setSelected(photos[index].id);
  };
  useEffect(()=>{if(selected&&!photos.some(p=>p.id===selected))setSelected(null)},[photos,selected]);
  useEffect(()=>{
    if(!selected)return;
    const onKey=(e:KeyboardEvent)=>{
      if(!['Escape','ArrowLeft','ArrowRight'].includes(e.key))return;
      // Capture before the outer Nightlights dialog handles Escape.
      e.preventDefault();e.stopImmediatePropagation();
      if(e.key==='Escape')setSelected(null);
      else if(e.key==='ArrowLeft')step(-1);
      else step(1);
    };
    window.addEventListener('keydown',onKey,true);
    return()=>window.removeEventListener('keydown',onKey,true);
  },[selected,photos,selectedIndex]);
  return <div className="ton-iss-gallery">
    <div className="ton-iss-hero">
      <div className="ton-iss-hero-copy"><span className="ton-night-eyebrow"><Camera size={15}/> NASA / ISS CREW EARTH OBSERVATIONS</span>
        <h3>Lebanon <em>from orbit</em></h3>
        <p>Genuine astronaut photography from NASA's archive. Explore nighttime views of Beirut and the Levant, then open the original full-resolution images.</p>
        <div className="ton-iss-hero-stats"><span><strong>{ISS_PHOTOS.length}</strong> documented photos</span><span><strong>{ISS_PHOTOS.filter(p=>p.category!=='daylight').length}</strong> nighttime</span><span><strong>2006–2020</strong> archival range</span></div>
      </div>
      <div className="ton-iss-hero-photo"><RemotePhoto photo={ISS_PHOTOS[0]} mode="thumb"/><span>ISS053-E-50422 · 28 SEP 2017</span></div>
    </div>
    <div className="ton-iss-explainer"><Info size={18}/><p><strong>Historical photographs, not measurements.</strong> These are real astronaut camera images, but they are not calibrated radiance data or matched 2025–2026 before/after scenes. Many Lebanon-specific frames come from the same 8 December 2012 pass. Select <strong>NASA measurements</strong> for numerical Black Marble readings.</p></div>
    <div className="ton-iss-controls">
      <div className="ton-iss-filters" aria-label="Photograph filters">
        {([{id:'all',label:'All photos'},{id:'lebanon-night',label:'Lebanon at night'},{id:'region-night',label:'Regional night views'},{id:'daylight',label:'Daylight context'}] as {id:GalleryFilter;label:string}[]).map(item=><button key={item.id} className={filter===item.id?'active':''} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.id==='daylight'?<Sun size={14}/>:<MoonStar size={14}/>} {item.label}</button>)}
      </div>
      <label className="ton-iss-search"><Search size={15}/><input value={query} placeholder="Search area, date, NASA photo ID…" onChange={e=>setQuery(e.target.value)} aria-label="Search astronaut photos"/></label>
    </div>
    <div className="ton-iss-result-bar"><span>{photos.length} photographs · NASA/JSC photo records</span><span>Tap any image to explore</span></div>
    {photos.length===0?<div className="ton-iss-empty">No NASA photographs match this search.</div>:<div className="ton-iss-grid">
      {photos.map(photo=><button type="button" key={photo.id} className="ton-iss-card" onClick={()=>setSelected(photo.id)} aria-label={`Open ${photo.title}`}>
        <div className="ton-iss-card-media"><RemotePhoto photo={photo} mode="thumb"/><span className="ton-iss-card-view"><Maximize2 size={18}/></span><span className="ton-iss-photo-type">{photo.category==='daylight'? 'DAYLIGHT':'NIGHT'}</span></div>
        <div className="ton-iss-card-body"><span className="ton-iss-card-date">{photo.captured} · {photo.photoId}</span><h4>{photo.title}</h4><p>{photo.area}</p></div>
      </button>)}
    </div>}
    <div className="ton-iss-extra"><div><ShieldCheck size={19}/><span><strong>Original images, documented provenance.</strong> Photos are delivered from NASA's servers with their photo IDs, dates, and source links; individual villages cannot be geolocated reliably from the shots.</span></div><a href={ISS_ARCHIVE_URL} target="_blank" rel="noreferrer">NASA photo search <ExternalLink size={14}/></a><a href={ISS_TIMELAPSE_URL} target="_blank" rel="noreferrer">ISS nighttime time-lapses <ExternalLink size={14}/></a></div>
    {current&&createPortal(<div className="ton-iss-lightbox-backdrop" onPointerDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)setSelected(null)}}>
      <section className="ton-iss-lightbox" role="dialog" aria-modal="true" aria-label={`Astronaut photo: ${current.title}`} onPointerDown={e=>e.stopPropagation()}>
        <div className="ton-iss-lightbox-header"><span><Camera size={16}/> NASA · {current.photoId}</span><div><span>{selectedIndex+1} / {photos.length}</span><button aria-label="Close photo" onClick={()=>setSelected(null)}><X size={20}/></button></div></div>
        <div className="ton-iss-lightbox-image"><button onClick={()=>step(-1)} aria-label="Previous photograph"><ArrowLeft size={21}/></button><div><RemotePhoto key={current.id} photo={current} mode="large"/></div><button onClick={()=>step(1)} aria-label="Next photograph"><ArrowRight size={21}/></button></div>
        <div className="ton-iss-lightbox-meta"><div><h3>{current.title}</h3><p>{current.area} · {current.captured}</p><p>{current.description}</p><p className="ton-iss-lightbox-caveat"><Info size={14}/> {current.note}</p></div><a href={current.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> View NASA source / download</a></div>
      </section>
    </div>,document.body)}
  </div>;
}
