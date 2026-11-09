import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
export function Logo(){return <Link to="/" className="brand" aria-label="TON 618 home"><img className="ton-global-logo" src="/assets/ton618-brand-transparent.png" alt="TON 618"/></Link>}
export function Navbar(){const [open,setOpen]=useState(false);const loc=useLocation();const onDashboard=loc.pathname.startsWith('/dashboard');return <header className={`nav ${onDashboard?'nav-dashboard':''}`}>
 <div className="nav-inner"><Logo/><nav className={open?'nav-links open':'nav-links'} aria-label="Primary">
 {[['/','Home'],['/dashboard/lebanon','Intelligence Map'],['/methodology','Methodology'],['/sources','Data Sources'],['/references','References'],['/about','About']].map(([url,name])=><NavLink key={url} to={url} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'nav-item active':'nav-item'} end={url==='/'}>{name}</NavLink>)}
 </nav><Link to="/dashboard/lebanon" className="button button-primary nav-cta">Launch Platform <ArrowUpRight size={16}/></Link><button className="nav-toggle icon-button" onClick={()=>setOpen(v=>!v)} aria-label={open?'Close navigation':'Open navigation'}>{open?<X size={22}/>:<Menu size={22}/>}</button></div>
 </header>}
export function Footer(){return <footer className="footer"><div className="footer-inner"><div><Logo/><p>From Earth Observation to Humanitarian Action.</p></div><div className="footer-links"><Link to="/methodology">Methodology</Link><Link to="/sources">Sources</Link><Link to="/references">References</Link><Link to="/about">About</Link></div><p className="footer-note">Independent hackathon prototype. Not affiliated with or endorsed by NASA. All demo scenario values are fictional.</p></div></footer>}
