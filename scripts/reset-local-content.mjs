import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE_CONTENT, normalizeSiteContent } from '../src/data/siteData.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const dataDir = path.join(repoRoot, '.data');
const contentFile = path.join(dataDir, 'site-content.json');

await mkdir(dataDir, { recursive: true });
await writeFile(
  contentFile,
  JSON.stringify(normalizeSiteContent(DEFAULT_SITE_CONTENT), null, 2),
  'utf8'
);

console.log(`[reset:local-content] Wrote fresh defaults to ${contentFile}`);
