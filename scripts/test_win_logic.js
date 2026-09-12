import fs from 'fs';
import path from 'path';

console.log('--- Verifying Win & Final Phase Target Tile Logic ---');
const errors = [];

// 1. Check main.js
const mainJs = fs.readFileSync(path.resolve('src/main.js'), 'utf8');

// Check toast helper
if (!mainJs.includes('showToast') || !mainJs.includes('toast-notification')) {
  errors.push('main.js missing showToast implementation');
}

// Check toast message dynamically uses trueTargetNumber
if (!mainJs.includes("'Wrong number! It needs to be ' + gameState.trueTargetNumber") && !mainJs.includes("'Wrong number! It needs to be ' + trueTargetNumber")) {
  errors.push("main.js missing dynamic toast text: 'Wrong number! It needs to be ' + trueTargetNumber");
}

// Check final phase win branch checks trueTargetNumber
if (!mainJs.includes("currentTop === gameState.trueTargetNumber")) {
  errors.push("main.js missing check for top face === trueTargetNumber in final phase");
}
if (!mainJs.includes("showLayer('end-screen')")) {
  errors.push("main.js does not show #end-screen on win");
}

// Check final phase wrong number reset branch
if (!mainJs.includes('resetDieToStart()')) {
  errors.push('main.js does not reset die to start on wrong number in final phase');
}

// 2. Check index.html
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
if (!indexHtml.includes('id="toast-notification"')) {
  errors.push('index.html missing #toast-notification element');
}

// 3. Check style.css
const styleCss = fs.readFileSync(path.resolve('src/style.css'), 'utf8');
if (!styleCss.includes('.toast-notification') || !styleCss.includes('.toast-notification.hidden')) {
  errors.push('style.css missing .toast-notification styles');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED:');
  errors.forEach(e => console.error('  ❌ ' + e));
  process.exit(1);
} else {
  console.log('ALL WIN & FINAL PHASE LOGIC CHECKS PASSED! ✅');
  process.exit(0);
}
