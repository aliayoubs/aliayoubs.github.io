/**
 * TON 618 production build fix (2026-11-09)
 * Applies only the three TypeScript errors reported by the user.
 * Keeps the user's latest local components and creates rollback copies.
 * Run from the TON 618 project root:
 *   node .\scripts\fix-ton618-publish-build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const targets = {
  map: 'src/components/map/IntelligenceMap.tsx',
  lights: 'src/components/nightlights/NightlightsModal.tsx',
  dashboard: 'src/pages/Dashboard.tsx',
  metricTypes: 'src/data/intelligenceLayers.ts',
};

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function stop(message) {
  console.error(`STOPPED — no changes made: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, 'package.json'))) {
  stop('Run this script from the main ton618 folder (the one containing package.json).');
}
for (const [key, rel] of Object.entries(targets)) {
  if (!fs.existsSync(path.join(root, rel))) stop(`Required file is missing: ${rel}`);
}
const typeFile = read(targets.metricTypes);
if (!/export\s+type\s+PopulationMapMetric\s*=\s*[^;]*['"]returned['"]/.test(typeFile)) {
  stop(`${targets.metricTypes} does not declare the 'returned' metric. No guesswork will be applied.`);
}

const original = Object.fromEntries(
  ['map', 'lights', 'dashboard'].map(key => [key, read(targets[key])]),
);
const updated = { ...original };
const notes = [];

// 1. IOM returnees are displayed through PopulationMapMetric='returned'.
// Only patch the map function call; don't replace unrelated data fields named 'returnees'.
const wrongMetric = /getPopulationValue\s*\(\s*district\s*,\s*(['"])returnees\1\s*\)/g;
const wrongCount = [...original.map.matchAll(wrongMetric)].length;
if (wrongCount === 1) {
  updated.map = updated.map.replace(wrongMetric, "getPopulationValue(district,'returned')");
  notes.push('Corrected district returnee metric to returned');
} else if (wrongCount === 0 && /getPopulationValue\s*\(\s*district\s*,\s*(['"])returned\1\s*\)/.test(original.map)) {
  notes.push('District returnee metric already correct');
} else {
  stop(`Expected one invalid district 'returnees' metric; found ${wrongCount}.`);
}

// 2. In the images/method branch, 'trend' is not a possible active tab.
// Remove only that unreachable sub-expression, preserving published & GIBS text.
const unreachableTrend = /activeTab\s*===\s*(['"])trend\1\s*\?\s*(['"])PUBLISHED DATA\s*·\s*separate sources\2\s*:\s*(['"])NASA GIBS visual layer, not calibrated measurements\3/g;
const trendCount = [...original.lights.matchAll(unreachableTrend)].length;
if (trendCount === 1) {
  updated.lights = updated.lights.replace(unreachableTrend, "'NASA GIBS visual layer, not calibrated measurements'");
  notes.push('Removed unreachable Nightlights trend comparison');
} else if (trendCount === 0 && original.lights.includes('ton-night-source-chip') &&
           original.lights.includes('NASA GIBS visual layer, not calibrated measurements')) {
  notes.push('Nightlights conditional already corrected');
} else {
  stop(`Could not uniquely locate the unreachable Nightlights comparison (found ${trendCount}).`);
}

// 3. Remove only the unused import. Do not remove the actual FIRMS layer.
const unusedImport = /^[ \t]*import[ \t]+VillageFirmsEvidence[ \t]+from[ \t]+['"]\.\.\/components\/firms\/VillageFirmsEvidence['"];?[ \t]*(?:\r?\n|$)/gm;
const importCount = [...original.dashboard.matchAll(unusedImport)].length;
if (importCount === 1) {
  updated.dashboard = updated.dashboard.replace(unusedImport, '');
  notes.push('Removed unused VillageFirmsEvidence import');
} else if (importCount === 0 && !/\bimport\s+VillageFirmsEvidence\b/.test(original.dashboard)) {
  notes.push('Unused FIRMS import already removed');
} else {
  stop(`Unexpected VillageFirmsEvidence import format/count (${importCount}).`);
}

// All checks above passed. Back up first; only now touch source files.
const changed = ['map', 'lights', 'dashboard'].filter(k => updated[k] !== original[k]);
if (changed.length) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(root, '.ton618-backups', `publish-build-fix-${timestamp}`);
  for (const key of changed) {
    const rel = targets[key];
    const dest = path.join(backupRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, rel), dest);
  }
  for (const key of changed) fs.writeFileSync(path.join(root, targets[key]), updated[key], 'utf8');
  console.log(`Updated ${changed.length} source file(s). Backups: ${path.relative(root, backupRoot)}`);
} else console.log('All three reported fixes were already applied.');
for (const note of notes) console.log(`  ✓ ${note}`);

console.log('\nRunning the production build...');
const child = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], { cwd: root, stdio: 'inherit' })
  : spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
if (child.error || child.status !== 0) {
  console.error('\nBuild is still failing. The three reported errors were patched; any new compiler output needs a separate fix.');
  if (child.error) console.error(String(child.error));
  process.exit(1);
}
console.log('\nPASS — TON 618 production build completed. Ready for deployment setup.');
