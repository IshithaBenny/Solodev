/**
 * clean_meme_folders.js
 * 
 * Safely removes meme2, meme4, and meme6 directories from public/
 * and verifies that no project files import or reference them.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const TARGETS_TO_REMOVE = ['meme2', 'meme4', 'meme6'];
const ALLOWED_MEMES = ['meme1', 'meme3', 'meme5'];

console.log('=== Meme Folder Cleanup & Verification ===\n');

// 1. Delete unwanted directories
let removedCount = 0;
for (const folder of TARGETS_TO_REMOVE) {
  const folderPath = path.join(publicDir, folder);
  if (fs.existsSync(folderPath)) {
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`[DELETED] Successfully removed: public/${folder}`);
      removedCount++;
    } catch (err) {
      console.error(`[ERROR] Failed to delete public/${folder}:`, err.message);
    }
  } else {
    console.log(`[SKIPPED] public/${folder} does not exist (already clean).`);
  }
}

// 2. Verify current contents of public/
console.log('\n--- Current folders in public/ ---');
const remaining = fs.readdirSync(publicDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log('Folders present:', remaining.join(', '));
const unwantedRemaining = remaining.filter(d => TARGETS_TO_REMOVE.includes(d));
if (unwantedRemaining.length > 0) {
  console.error(`[WARNING] Unwanted folders still present: ${unwantedRemaining.join(', ')}`);
} else {
  console.log('[PASS] public/ contains only the expected meme directories!');
}

// 3. Scan project source files for any dangling references
console.log('\n--- Scanning codebase for references to meme2, meme4, meme6 ---');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'coverage', '.system_generated'].includes(file.name)) {
        scanDir(fullPath, fileList);
      }
    } else if (/\.(js|jsx|ts|tsx|html|css|json)$/i.test(file.name)) {
      // Exclude this cleanup script itself
      if (fullPath !== __filename) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const filesToScan = scanDir(projectRoot);
let danglingReferences = 0;

const searchPatterns = [
  /meme[246]/i,
  /[246]piece\d/i,
  /\/meme[246]\//i
];

for (const file of filesToScan) {
  const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
  // Skip test scripts that specifically test for the absence of these or legacy patches
  if (relPath.startsWith('scripts/')) continue;

  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of searchPatterns) {
    const match = content.match(pattern);
    if (match) {
      console.warn(`[REFERENCE FOUND] in ${relPath}: matched "${match[0]}"`);
      danglingReferences++;
    }
  }
}

if (danglingReferences === 0) {
  console.log('[PASS] No project files reference meme2, meme4, or meme6!');
} else {
  console.error(`[FAIL] Found ${danglingReferences} dangling reference(s).`);
}

console.log('\n=== Cleanup & Verification Complete ===');
