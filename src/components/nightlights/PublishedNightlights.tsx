import {useMemo,useState,type ReactNode} from 'react';
import {
  Activity,ArrowUpRight,BarChart3,BookOpen,CalendarDays,Download,
  ExternalLink,Info,MapPin,ShieldCheck,TrendingDown
} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Cell,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {
  AABER_STUDY_URL,WORLD_BANK_2026_URL,DISTANCE_BANDS,PUBLISHED_TOWNS,publishedVillage
} from '../../data/blackMarblePublishedFindings';

type PublishedView='south'|'bank';
const labelClass='ton-pub-kicker';
function SourceLink({href,children}:{href:string;children:ReactNode}){
  return <a className="ton-pub-source-link" href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={14}/></a>;
}
function StudyFact({title,value,sub,kind}:{title:string;value:string;sub:string;kind?:'positive'|'negative'}){
  return <div className={`ton-pub-stat ${kind||''}`}><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>;
}
function DistanceBeltChart(){
  const data=useMemo(()=>DISTANCE_BANDS.map(d=>({label:d.label,change:d.change})),[]);
  return <div className="ton-pub-chart" role="img" aria-label="September 2025 to September 2026 nighttime-light change by distance from border: 0 to 5 km minus 32 percent; 5 to 10 km minus 45 percent; 10 to 20 km minus 23 percent; above 20 km plus 3 percent">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{top:8,right:28,bottom:8,left:0}} barSize={23}>
        <CartesianGrid stroke="#25455b" strokeDasharray="3 6" horizontal={false}/>
        <XAxis type="number" domain={[-50,10]} ticks={[-50,-40,-30,-20,-10,0,10]} tick={{fontSize:10,fill:'#9dbdce'}} tickFormatter={v=>`${v}%`}/>
        <YAxis type="category" dataKey="label" width={93} tick={{fontSize:11,fill:'#def1fb'}} axisLine={false} tickLine={false}/>
        <ReferenceLine x={0} stroke="#d3e8f8" strokeWidth={1.5}/>
        <Tooltip cursor={{fill:'#ffffff0a'}} contentStyle={{background:'#102b43',border:'1px solid #40627b',color:'#e5f4fa',borderRadius:7,fontSize:12}} formatter={(value)=>[`${Number(value)>0?'+':''}${value}%`,'Published change']}/>
        <Bar dataKey="change" name="Percent change" radius={[4,4,4,4]}>
          {data.map(d=><Cell key={d.label} fill={d.change<0?'#d67675':'#62c1b3'}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
export default function PublishedNightlights({scopeName,scopeKind}:{scopeName:string;scopeKind:'country'|'district'|'village'}){
  const [active,setActive]=useState<PublishedView>('south');
  const focus=scopeKind==='village'?publishedVillage(scopeName):undefined;
  return <div className="ton-pub-root">
    <header className="ton-pub-hero">
      <div><span className={labelClass}><BookOpen size={15}/> CURATED RESEARCH / NASA BLACK MARBLE</span>
        <h3>Published <em>nightlight findings</em></h3>
        <p>Real results already calculated by researchers. No Earth Engine account, no made-up radiance curves.</p>
      </div>
      <a className="ton-pub-download" href="/data/blackMarblePublishedFindings.json" download="ton618_published_black_marble_findings.json"><Download size={14}/> Download source data</a>
    </header>
    <div className="ton-pub-select" role="tablist" aria-label="Published nighttime lights studies">
      <button role="tab" aria-selected={active==='south'} className={active==='south'?'active':''} onClick={()=>setActive('south')}><MapPin size={16}/> Southern Lebanon · 2025–26</button>
      <button role="tab" aria-selected={active==='bank'} className={active==='bank'?'active':''} onClick={()=>setActive('bank')}><BarChart3 size={16}/> World Bank · 2026</button>
    </div>
    {active==='south'?<>
      <div className="ton-pub-study-header"><span><CalendarDays size={15}/> SEP 2025 → SEP 2026</span><span>376 cadastres in South + Nabatieh</span><span>VNP46A2 · NASA Black Marble</span></div>
      {scopeKind==='village'&&<div className="ton-pub-focus"><MapPin size={17}/><div><span>Selected on TON 618 map: <b>{scopeName}</b></span><strong>{focus?focus.exactLabel:'No numeric village result published in this article’s narrative for this selection.'}</strong><small>{focus?'Published September-to-September change · not a monthly trend':'Not reported does not mean no change. See the source for the study’s wider maps.'}</small></div></div>}
      <div className="ton-pub-kpis">
        <StudyFact title="STUDY AREA" value="376" sub="South Lebanon + Nabatieh cadastres"/>
        <StudyFact title="BINT JBEIL" value=">99%" sub="Reported loss of nighttime illumination" kind="negative"/>
        <StudyFact title="AAYNATA" value=">99%" sub="Reported loss of nighttime illumination" kind="negative"/>
        <StudyFact title="KHIAM" value="76%" sub="Reported loss; outside TON 618's ten UNDP top-ten cadastres" kind="negative"/>
      </div>
      <div className="ton-pub-two">
        <section className="ton-pub-card">
          <div className="ton-pub-card-title"><span className={labelClass}>BORDER-DISTANCE ANALYSIS</span><h4>Change in nighttime illumination</h4><p>Published September 2025–September 2026 percentage changes grouped by distance from the southern border.</p></div>
          <DistanceBeltChart/>
          <p className="ton-pub-smallnote">Negative values mean less observed illumination; the 5–10 km band had the largest reported decline. These are published aggregate percentages, not pixel-level radiance measurements for our map.</p>
        </section>
        <section className="ton-pub-card">
          <div className="ton-pub-card-title"><span className={labelClass}>PUBLISHED LOCAL EXAMPLES</span><h4>Places named in the investigation</h4><p>A <b>more than 99%</b> reduction is a lower-bound statement; it is not an exact −99% measurement.</p></div>
          <div className="ton-pub-towns">
            {PUBLISHED_TOWNS.map(t=><div key={t.name}><div><b>{t.name}</b><small>{t.sourceVillageId?'TON 618 study village':'Additional reference area'}</small></div><strong>{t.exactLabel}</strong></div>)}
          </div>
          <p className="ton-pub-smallnote">The source also reports increased light in Naqoura and Qlayaa without publishing percentages in its narrative.</p>
        </section>
      </div>
      <section className="ton-pub-provenance"><ShieldCheck size={18}/><div><strong>How the journalist calculated these figures</strong><p>Median observations from valid September nights in each year, using NASA VNP46A2 (approximately 500 m pixels), with a reported 1 nW/cm²/sr background deduction and aggregation over cadastral boundaries. The investigation also checked August observations and alternate thresholds. The raw per-village monthly time series was not included in the narrative.</p></div></section>
      <div className="ton-pub-source-row"><div><span>PRIMARY REFERENCE · AABER · NOVEMBER 2, 2026</span><b>Amr Al-Iraqi · عودة مؤجلة</b></div><SourceLink href={AABER_STUDY_URL}>Read original investigation and see maps</SourceLink></div>
    </>:<>
      <div className="ton-pub-study-header"><span><CalendarDays size={15}/> Updated 5 NOV 2026</span><span>Lebanon · national and regional observations</span><span>World Bank Development Data Group</span></div>
      <div className="ton-pub-bank-intro"><Activity size={22}/><div><h4>Lebanon's nighttime-light trend, already analyzed</h4><p>The World Bank publishes its graphs and interpretation. Its 2026 update does not expose a downloadable table of the plotted monthly numeric values, so we show the reported direction of change rather than invent a numerical line.</p></div></div>
      <div className="ton-pub-bank-grid">
        <article><span>2025 COMPARED WITH 2024</span><div className="ton-pub-bank-change positive"><ArrowUpRight size={26}/><strong>Increase</strong></div><p>The World Bank reports higher nighttime brightness across Lebanon in 2025 than in 2024.</p></article>
        <article><span>MAR 2026 VS FEB 2026</span><div className="ton-pub-bank-change negative"><TrendingDown size={26}/><strong>Decline</strong></div><p>Significant decline reported in regions outside Beirut. The text does not specify exact percentages.</p></article>
        <article><span>BEIRUT EXCEPTION</span><div className="ton-pub-bank-change neutral"><ArrowUpRight size={26}/><strong>No decline reported</strong></div><p>The Beirut region did not show the same March 2026 decrease as other regions.</p></article>
        <article><span>JUNE 2025 DATA QUALITY</span><div className="ton-pub-bank-change warning"><Info size={26}/><strong>Check anomaly</strong></div><p>The World Bank flags a June 2025 spike as a possible data issue that needs investigation.</p></article>
      </div>
      <div className="ton-pub-world-note"><BarChart3 size={20}/><div><strong>Why there is no World Bank numerical curve here</strong><p>Without the underlying plotted values, recreating its curve would require guessing. Open the original page to view its two published charts. If a licensed table becomes available, we can replace this summary with an exact interactive time series.</p></div></div>
      <div className="ton-pub-source-row"><div><span>PRIMARY REFERENCE · WORLD BANK · NOVEMBER 5, 2026</span><b>Nighttime Lights in Lebanon (2026)</b></div><SourceLink href={WORLD_BANK_2026_URL}>Open published charts and findings</SourceLink></div>
    </>}
    <footer className="ton-pub-disclaimer"><Info size={16}/><span>These two independent analyses cover different dates, geographic levels, and processing methods. They are not one continuous time series. Light change may reflect power disruption, lighting choices, seasonal effects, or observation conditions; it does not directly measure destroyed buildings, population, or verified aid needs.</span></footer>
  </div>;
}
