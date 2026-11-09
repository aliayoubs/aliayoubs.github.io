import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = ['package.json', 'vite.config.ts', 'src', 'public'];
for (const name of required) {
  if (!fs.existsSync(path.join(root, name))) {
    console.error(`STOPPED: ${name} was not found. Run this inside your TON 618 project folder.`);
    process.exit(1);
  }
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts?.build) {
  console.error('STOPPED: package.json has no build command.');
  process.exit(1);
}
const vite = fs.readFileSync(path.join(root,'vite.config.ts'),'utf8');
if (/\bbase\s*:/.test(vite) && !/\bbase\s*:\s*['"]\/['"]/.test(vite)) {
  console.error('STOPPED: vite.config.ts specifies a custom base path. This setup expects base "/".');
  process.exit(1);
}

const workflow = `name: Publish TON 618 to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Check out source
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build website
        run: npm run build
      - name: Support direct links to React routes
        run: |
          cp dist/index.html dist/404.html
          touch dist/.nojekyll
      - name: Configure GitHub Pages
        uses: actions/configure-pages@v5
      - name: Upload website
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - name: Publish website
        id: deployment
        uses: actions/deploy-pages@v4
`;

const wfPath = path.join(root,'.github','workflows','deploy.yml');
if (fs.existsSync(wfPath) && fs.readFileSync(wfPath,'utf8') !== workflow) {
  console.error('STOPPED: .github/workflows/deploy.yml already exists with different contents. Nothing was changed.');
  process.exit(1);
}
const ignoreFile = path.join(root,'.gitignore');
const ignoreOld = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile,'utf8') : '';
const rules = [
  'node_modules/',
  'dist/',
  '.cache/',
  '.ton618-backups/',
  'exports/',
  '*.tsbuildinfo',
  '*.log',
  '.env',
  '.env.*',
  '!.env.example',
  '*.zip'
];
let ignoreNew = ignoreOld.trimEnd();
const existing = new Set(ignoreOld.split(/\r?\n/).map(s => s.trim()));
for (const rule of rules) if (!existing.has(rule)) ignoreNew += `\n${rule}`;
ignoreNew = ignoreNew.trimStart() + '\n';
fs.mkdirSync(path.dirname(wfPath), { recursive: true });
if (!fs.existsSync(wfPath)) fs.writeFileSync(wfPath,workflow);
if (ignoreNew !== ignoreOld) fs.writeFileSync(ignoreFile,ignoreNew);
console.log('PASS — GitHub Pages publishing files are ready.');
console.log('Files: .github/workflows/deploy.yml, .gitignore');
console.log('IMPORTANT: Publish this repository as YOUR-GITHUB-USERNAME.github.io (not ton618).');
console.log('GitHub: repository Settings > Pages > Build and deployment > Source: GitHub Actions');
console.log('Use GitHub Desktop if git is not installed.');
