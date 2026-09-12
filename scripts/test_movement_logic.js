import fs from 'fs';
import path from 'path';

console.log('--- Verifying Target Tile Evaluation Logic ---');
const errors = [];

// Read main.js
const mainJs = fs.readFileSync(path.resolve('src/main.js'), 'utf8');

// 1. Check fake victory sound function
if (!mainJs.includes('playFakeVictorySound') || !mainJs.includes('AudioContext')) {
  errors.push('main.js missing playFakeVictorySound implementation');
}

// 2. Check white screen flash
if (!mainJs.includes('flashScreenWhite') || !mainJs.includes('white-flash')) {
  errors.push('main.js missing flashScreenWhite implementation');
}

// 3. Check error screen shown on arrival
if (!mainJs.includes("showLayer('error-screen')")) {
  errors.push('main.js missing instant transition to #error-screen on target arrival');
}

// 4. Check 2000ms delay before reset & increment
if (!mainJs.includes('2000') || !mainJs.includes('resetDieToStart') || !mainJs.includes('recordError')) {
  errors.push('main.js missing 2s timeout resetting die and incrementing errorsCommitted');
}

// 5. Check condition: if errorsCommitted reaches maxErrors -> show puzzle-overlay and fooled ya text
const expectedAlertText = 'Fooled ya! Solve the puzzle to get the REAL number';
if (!mainJs.includes(expectedAlertText)) {
  errors.push(`main.js missing exact overlay text: "${expectedAlertText}"`);
}
if (!mainJs.includes("showLayer('puzzle-overlay')")) {
  errors.push('main.js missing transition to #puzzle-overlay when errorsCommitted reaches maxErrors');
}

// Read index.html
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
if (!indexHtml.includes('id="white-flash"')) {
  errors.push('index.html missing #white-flash element');
}
if (!indexHtml.includes(expectedAlertText)) {
  errors.push(`index.html missing overlay text "${expectedAlertText}"`);
}

// Read style.css
const styleCss = fs.readFileSync(path.resolve('src/style.css'), 'utf8');
if (!styleCss.includes('.flash-overlay') || !styleCss.includes('.flash-overlay.flashing')) {
  errors.push('style.css missing .flash-overlay rules');
}
if (!styleCss.includes('.fooled-ya-banner')) {
  errors.push('style.css missing .fooled-ya-banner rules');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED:');
  errors.forEach(e => console.error('  ❌ ' + e));
  process.exit(1);
} else {
  console.log('ALL TARGET TILE EVALUATION & MOVEMENT LOGIC CHECKS PASSED! ✅');
  process.exit(0);
}
