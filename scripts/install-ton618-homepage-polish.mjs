#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourceDir = path.join(root, 'scripts', 'ton618-home-refresh', 'src', 'pages');
const destinationDir = path.join(root, 'src', 'pages');
const homeTarget = path.join(destinationDir, 'Home.tsx');
const cssTarget = path.join(destinationDir, 'home-refresh.css');
const expectedArchivedBaseline = '0a59473c31fcbf7433751c9f8b370ad8c11f7b6b790d0c85d2408b4b59d2438a';
const hash = (s) => crypto.createHash('sha256').update(s.replace(/\r\n/g, '\n').trimEnd()).digest('hex');
const die = (message) => { console.error(`TON 618 homepage installer: ${message}`); process.exitCode = 1; };

if (!fs.existsSync(homeTarget)) {
  die(`Cannot find ${homeTarget}. Run this from the project that contains src/pages/Home.tsx.`);
} else if (!fs.existsSync(path.join(sourceDir, 'Home.tsx')) || !fs.existsSync(path.join(sourceDir, 'home-refresh.css'))) {
  die('Patch payload missing. Extract the entire ZIP into your ton618 project and retry.');
} else {
  const before = fs.readFileSync(homeTarget, 'utf8');
  const updatedHome = fs.readFileSync(path.join(sourceDir, 'Home.tsx'), 'utf8');
  const updatedCss = fs.readFileSync(path.join(sourceDir, 'home-refresh.css'), 'utf8');
  const oldCss = fs.existsSync(cssTarget) ? fs.readFileSync(cssTarget, 'utf8') : null;
  if (hash(before) === hash(updatedHome) && oldCss !== null && hash(oldCss) === hash(updatedCss)) {
    console.log('TON 618 homepage is already up to date; no files changed.');
  } else if (hash(before) !== expectedArchivedBaseline && hash(before) !== hash(updatedHome)) {
    die('Your current Home.tsx differs from the archived homepage inspected for this patch. Nothing was overwritten. Share src/pages/Home.tsx to merge this design with your local changes safely.');
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(root, '.ton618-backups', `homepage-polish-${timestamp}`);
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(homeTarget, path.join(backupDir, 'Home.tsx'));
    if (oldCss !== null) fs.copyFileSync(cssTarget, path.join(backupDir, 'home-refresh.css'));
    fs.copyFileSync(path.join(sourceDir, 'Home.tsx'), homeTarget);
    fs.copyFileSync(path.join(sourceDir, 'home-refresh.css'), cssTarget);
    console.log('Homepage refreshed successfully.');
    console.log(`Backup saved to ${backupDir}`);
    console.log('Changed only src/pages/Home.tsx and src/pages/home-refresh.css.');
    console.log('Next: node scripts/check-ton618-homepage-polish.mjs && npm run build');
  }
}
