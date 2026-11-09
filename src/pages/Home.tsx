import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Building2,
  ChevronDown, Compass, Flame, Globe2, Layers3, MapPinned,
  MoonStar, Satellite, ShieldCheck, UsersRound,
} from 'lucide-react';
import Earth from '../components/globe/Earth';
import './home-refresh.css';
import './ton618-final-polish.css';

type Region = { id: string; name: string; description: string; flag: string; available: boolean };

const regions: Region[] = [
  { id: 'lebanon', name: 'Lebanon', description: 'Nationwide data · Southern Lebanon focus', flag: '/flags/lebanon.svg', available: true },
  { id: 'ukraine', name: 'Ukraine', description: 'Future regional expansion', flag: '/flags/ukraine.svg', available: false },
  { id: 'sudan', name: 'Sudan', description: 'Future regional expansion', flag: '/flags/sudan.svg', available: false },
  { id: 'gaza', name: 'Gaza', description: 'Future regional expansion', flag: '/flags/palestine.svg', available: false },
];

const indicators = [
  {
    icon: UsersRound,
    index: '01',
    title: 'Population',
    tag: 'WorldPop · historical sources',
    detail: 'Modeled population for 2026 alongside distinctly labeled historical estimates. Different years and methods are never presented as the same measurement.',
  },
  {
    icon: MapPinned,
    index: '02',
    title: 'Displacement & return',
    tag: 'IOM DTM · Round 119',
    detail: 'Individual displaced persons, households and return movements where reported. Unavailable village records remain unavailable—not zero.',
  },
  {
    icon: Building2,
    index: '03',
    title: 'Building impacts',
    tag: 'UNDP · published assessments',
    detail: 'Source-backed building-damage findings, especially in Southern Lebanon. We do not infer destruction where an assessment does not exist.',
  },
  {
    icon: MoonStar,
    index: '04',
    title: 'Nighttime lights',
    tag: 'NASA Black Marble',
    detail: 'Quality-screened radiance comparisons for September 2025 and September 2026 at district and identifiable cadastral-area levels.',
  },
  {
    icon: Flame,
    index: '05',
    title: 'Thermal activity',
    tag: 'NASA FIRMS · VIIRS',
    detail: 'Satellite thermal-anomaly observations for the same two Septembers, with confidence information and warnings about limited spatial support.',
  },
];

const workflow = [
  { title: 'Choose a region', detail: 'Start with Lebanon, then open a district to see its cadastral areas.' },
  { title: 'Explore the evidence', detail: 'Switch intelligence layers and inspect measurements at the correct geographic level.' },
  { title: 'See what is known', detail: 'Compare sources, observation dates and data gaps without mistaking satellite indicators for confirmed impacts.' },
];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [choosing, setChoosing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!location.hash) return;
    const target = decodeURIComponent(location.hash.slice(1));
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);

  useEffect(() => {
    if (!choosing) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setChoosing(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [choosing]);

  useEffect(() => () => { if (launchTimer.current) clearTimeout(launchTimer.current); }, []);

  const openLebanon = () => {
    if (launching) return;
    setLaunching(true);
    if (reduceMotion) { navigate('/dashboard/lebanon'); return; }
    launchTimer.current = setTimeout(() => navigate('/dashboard/lebanon'), 600);
  };

  return (
    <main className="tonhome-root">
      <section className="tonhome-hero" aria-label="TON 618 humanitarian intelligence homepage">
        <div className="tonhome-ambient" aria-hidden="true" />
        <header className="tonhome-header">
          <Link to="/" className="tonhome-wordmark" aria-label="TON 618 home"><img className="tonhome-logo-img" src="/assets/ton618-brand-transparent.png" alt="TON 618" /></Link>
          <div className="tonhome-header-side"><span className="tonhome-live-dot" /> <span>LEBANON / ACTIVE CASE STUDY</span></div>
        </header>

        <div className="tonhome-intro">
          <motion.p className="tonhome-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
            <Satellite size={15} /> HUMANITARIAN EARTH-OBSERVATION INTELLIGENCE
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, delay: .07 }}>
            Understand the impact.<br/><span>See the evidence.</span>
          </motion.h1>
          <motion.p className="tonhome-intro-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .17 }}>
            TON 618 brings satellite observations, population movements and published infrastructure assessments together in one interactive humanitarian map.
          </motion.p>
        </div>

        <div className="tonhome-globe-wrap">
          <div className="tonhome-globe-orbit" aria-hidden="true" />
          <div className="tonhome-globe-scene"><Earth /></div>
          <span className="tonhome-globe-label tonhome-globe-label-left">EARTH / 01</span>
          <span className="tonhome-globe-label tonhome-globe-label-right">DRAG TO ROTATE</span>
        </div>

        <div className="tonhome-interact">
          <div className="tonhome-main-actions">
            <button type="button" className="tonhome-action tonhome-action-primary" onClick={() => setChoosing(v => !v)} aria-expanded={choosing} aria-controls="tonhome-region-selector">
              <Globe2 size={18}/>{choosing ? 'Close regions' : 'Select a region'}<ArrowRight size={17}/>
            </button>
            <a className="tonhome-action tonhome-action-secondary" href="#mission"><Layers3 size={18}/>Explore our mission<ArrowDown size={16}/></a>
            <Link className="tonhome-action tonhome-action-secondary" to="/references"><BookOpen size={18}/>Sources &amp; References<ArrowUpRight size={16}/></Link>
          </div>
          <AnimatePresence initial={false}>
            {choosing && (
              <motion.div id="tonhome-region-selector" className="tonhome-region-panel" initial={{opacity:0,height:0,y:-8}} animate={{opacity:1,height:'auto',y:0}} exit={{opacity:0,height:0,y:-8}} transition={{duration:.2}}>
                <div className="tonhome-region-heading"><strong>Explore a region</strong><span>1 ACTIVE · 3 PLANNED</span></div>
                <div className="tonhome-region-grid">
                  {regions.map((region) => (
                    <button key={region.id} type="button" className={`tonhome-region ${region.available ? 'tonhome-region-ready' : ''}`} onClick={() => region.available ? openLebanon() : navigate(`/regions/${region.id}`)}>
                      <img src={region.flag} alt="" />
                      <span><strong>{region.name}</strong><small>{region.description}</small></span>
                      {region.available ? <ArrowUpRight size={18}/> : <span className="tonhome-coming">PLANNED</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="tonhome-hero-footer">
          <span>INDEPENDENT RESEARCH PROTOTYPE</span>
          <span>NATIONWIDE COVERAGE · SOUTHERN LEBANON FOCUS</span>
          <a href="#mission">DISCOVER THE PLATFORM <ChevronDown size={14}/></a>
        </div>
      </section>

      <section className="tonhome-coverage" aria-label="Current Lebanon data coverage">
        <div className="tonhome-shell">
          <div className="tonhome-section-intro">
            <span className="tonhome-small-label">CURRENT PLATFORM / NOVEMBER 2026</span>
            <h2>From a Southern Lebanon case study<br/><em>to a nationwide intelligence map.</em></h2>
            <p>TON 618's active map covers Lebanon's administrative districts. The original humanitarian case study remains focused on Southern Lebanon, where published building-damage assessments add critical context.</p>
          </div>
          <div className="tonhome-stat-grid">
            <div className="tonhome-stat"><strong>26</strong><span>districts mapped</span><small>Administrative level 2</small></div>
            <div className="tonhome-stat"><strong>1,610</strong><span>cadastral areas with NASA comparisons</span><small>Identifiable ADM3 records</small></div>
            <div className="tonhome-stat"><strong>2</strong><span>NASA observational datasets</span><small>Black Marble + FIRMS</small></div>
            <div className="tonhome-stat"><strong>2025<span className="tonhome-stat-dash">—</span>26</strong><span>September comparison periods</span><small>Not a continuous monthly series</small></div>
          </div>
          <p className="tonhome-coverage-note"><ShieldCheck size={15}/> 17 boundary features have unresolved cadastral identifiers and are not assigned measurements. Missing information is not interpreted as zero.</p>
        </div>
      </section>

      <section id="mission" className="tonhome-mission">
        <div className="tonhome-shell">
          <div className="tonhome-mission-head">
            <div>
              <span className="tonhome-small-label">THE MISSION</span>
              <h2>One map. Multiple perspectives.<br/><em>Clearer humanitarian context.</em></h2>
            </div>
            <p>Satellite imagery cannot tell the whole story, and humanitarian reports rarely cover every community. TON 618 places each kind of evidence in its proper context so users can understand both the available information and its limitations.</p>
          </div>
          <div className="tonhome-focus-card">
            <div className="tonhome-focus-heading"><span className="tonhome-focus-icon"><MapPinned size={21}/></span><span>ACTIVE CASE STUDY</span></div>
            <h3>Lebanon <span>/ Southern Lebanon focus</span></h3>
            <p>Explore all 26 districts, double-click a district to view its villages, then select an area to open its intelligence panel. Verified UNDP building damage is shown where reported—not generalized to every village.</p>
            <div className="tonhome-focus-bottom"><span><span className="tonhome-focus-dot"/> DISTRICT → VILLAGE EXPLORATION</span><span>Population · displacement · damage · NASA observations</span></div>
          </div>
          <div className="tonhome-section-heading"><div><span className="tonhome-small-label">THE INTELLIGENCE LAYERS</span><h3>Five consistent views of each place.</h3></div><p>The right panel uses the same structure for every district and every village, including when measurements have not been collected.</p></div>
          <div className="tonhome-indicator-grid">
            {indicators.map((item) => (
              <article className="tonhome-indicator" key={item.title}>
                <div className="tonhome-indicator-top"><span>{item.index}</span><item.icon size={22} strokeWidth={1.65}/></div>
                <h4>{item.title}</h4><small>{item.tag}</small><p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tonhome-method" aria-label="How TON 618 works">
        <div className="tonhome-shell">
          <div className="tonhome-section-heading"><div><span className="tonhome-small-label">HOW IT WORKS</span><h3>Evidence first. Assumptions visible.</h3></div><p>Every satellite indicator, movement count and published damage record is linked to a geographic level and observation period.</p></div>
          <div className="tonhome-workflow">
            {workflow.map((item, index) => <article key={item.title}><span className="tonhome-workflow-number">0{index + 1}</span><div><h4>{item.title}</h4><p>{item.detail}</p></div>{index < workflow.length - 1 && <ArrowRight size={19} aria-hidden="true"/>}</article>)}
          </div>
          <div className="tonhome-principle"><div className="tonhome-principle-icon"><ShieldCheck size={24}/></div><div><strong>Satellite signals are not confirmed damage or unmet aid needs.</strong><p>Nighttime-light decline and thermal detections are contextual indicators. The aid calculator now provides 30-day resource coverage estimates for reported returnees and people displaced into each area. Verified unmet need requires evidence of actual shortages and aid delivered.</p></div><span>RESEARCH STANDARD</span></div>
        </div>
      </section>

      {/* TON618_FINAL_BRAND_AND_NAV_V1: intentionally reserved for the future project video. */}
      <section id="project-video" className="tonhome-video-section" aria-labelledby="tonhome-video-title">
        <div className="tonhome-shell tonhome-video-grid">
          <div className="tonhome-video-copy">
            <span className="tonhome-small-label">COMING NEXT / PROJECT FILM</span>
            <h2 id="tonhome-video-title">See the mission <em>in motion.</em></h2>
            <p>A space reserved for the TON 618 mission video. The finished film will explain the data, the Lebanon case study, and the humanitarian resource calculations.</p>
          </div>
          <div className="tonhome-video-placeholder" aria-label="Project video will be added later">
            <div className="tonhome-video-play" aria-hidden="true">▶</div>
            <strong>PROJECT VIDEO</strong><span>VIDEO WILL BE ADDED HERE</span>
          </div>
        </div>
      </section>

      <footer className="tonhome-footer"><div className="tonhome-shell"><div className="tonhome-footer-brand"><img className="tonhome-footer-logo" src="/assets/ton618-brand-transparent.png" alt="TON 618"/><span>Earth observation for humanitarian understanding.</span></div><p>Independent research prototype · Not affiliated with NASA · Coverage and quality vary by location.</p></div></footer>

      <AnimatePresence>
        {launching && !reduceMotion && <motion.div className="tonhome-transition" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} aria-live="polite"><Compass size={44}/><strong>OPENING LEBANON</strong><span>Loading the nationwide intelligence map</span></motion.div>}
      </AnimatePresence>
    </main>
  );
}
