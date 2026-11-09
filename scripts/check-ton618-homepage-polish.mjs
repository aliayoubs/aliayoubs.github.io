#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homePath = path.join(root, 'src/pages/Home.tsx');
const cssPath = path.join(root, 'src/pages/home-refresh.css');
let errors = [];
if (!fs.existsSync(homePath)) errors.push('Home.tsx missing');
if (!fs.existsSync(cssPath)) errors.push('home-refresh.css missing');
if (!errors.length) {
  const home = fs.readFileSync(homePath,'utf8');
  const css = fs.readFileSync(cssPath,'utf8');
  for(const [label,match] of [
    ['rotating globe', '<Earth />'],
    ['Lebanon dashboard route','/dashboard/lebanon'],
    ['three main homepage actions','tonhome-main-actions'],
    ['standalone references route','/references'],
    ['all four regions','/flags/palestine.svg'],
    ['26 districts', '>26</strong>'],
    ['1,610 satellite village records','>1,610</strong>'],
    ['nighttime lights','NASA Black Marble'],
    ['thermal anomalies','NASA FIRMS'],
    ['displacement terminology','Individual displaced persons'],
    ['UNDP evidence','UNDP'],
    ['historical missingness','not interpreted as zero'],
    ['mobile layout','@media(max-width:700px)'],
  ]) {
    if (!(label === 'mobile layout' ? css : home).includes(match)) errors.push(`Missing ${label}`);
  }
  for(const outdated of ['ten UNDP-assessed','FIRMS under consideration','village population pending','VIDEO COMING SOON','304,520','arrival-aid-mission','Aid Requirements button']) {
    if (home.includes(outdated)) errors.push(`Outdated homepage content remains: ${outdated}`);
  }
  if ((home.match(/className="tonhome-action /g) || []).length !== 3) errors.push('The hero should offer exactly three primary actions');
  if (!home.includes("import './home-refresh.css'")) errors.push('Homepage style import missing');
}
if (errors.length) { console.error('Homepage audit failed:\n- '+errors.join('\n- ')); process.exit(1); }
console.log('Homepage audit PASSED: current data copy, 3 hero actions, references, globe, geographic scope, responsive design.');
console.log('Browser checks still required: globe rotation, region selector, mission scroll, Lebanon route, mobile layout.');
