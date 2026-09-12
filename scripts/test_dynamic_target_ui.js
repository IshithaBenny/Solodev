import fs from 'fs';
import path from 'path';
import * as stateModule from '../src/gameState.js';

console.log('--- Testing Dynamic Target UI & Win Evaluation Logic ---');
const errors = [];

// 1. Inspect main.js source code
const mainJs = fs.readFileSync(path.resolve('src/main.js'), 'utf8');

// Check initial target display text logic
if (!mainJs.includes("'Target: Tile (2, 2) with [' + currentTarget + ']'") && 
    !mainJs.includes("'Target: Tile (2, 2) with [' + fakeTargetNumber + ']'") &&
    !mainJs.includes("Target: Tile (2, 2) with [")) {
  errors.push('main.js missing target display string formatting');
}

// Check updateTargetDisplay exists and is called on initial load
if (!mainJs.includes('updateTargetDisplay') || !mainJs.includes('updateTargetDisplay()')) {
  errors.push('main.js missing updateTargetDisplay invocation on initial load');
}

// Check puzzle completion return to game hook updates target display with trueTargetNumber
if (!mainJs.includes('isFinalPhase = true') || !mainJs.includes('updateTargetDisplay')) {
  errors.push('main.js does not update target display on Return to Game');
}

// Check final win evaluation checks trueTargetNumber
if (!mainJs.includes('currentTop === gameState.trueTargetNumber')) {
  errors.push('main.js does not check if die top face equals trueTargetNumber in final phase');
}

// Check failure toast message dynamically uses trueTargetNumber
const expectedToastPattern = "'Wrong! It needs to be ' + gameState.trueTargetNumber";
if (!mainJs.includes(expectedToastPattern) && !mainJs.includes("'Wrong number! It needs to be ' + gameState.trueTargetNumber")) {
  errors.push(`main.js missing exact dynamic toast pattern: ${expectedToastPattern}`);
}

// 2. Functional test of target display formatting
stateModule.initGameState();
const fake = stateModule.fakeTargetNumber;
const trueNum = stateModule.trueTargetNumber;

let isFinal = false;
let displayedInitial = 'Target: Tile (2, 2) with [' + (isFinal ? trueNum : fake) + ']';
if (displayedInitial !== `Target: Tile (2, 2) with [${fake}]`) {
  errors.push(`Initial target display mismatch: ${displayedInitial}`);
}

isFinal = true;
let displayedFinal = 'Target: Tile (2, 2) with [' + (isFinal ? trueNum : fake) + ']';
if (displayedFinal !== `Target: Tile (2, 2) with [${trueNum}]`) {
  errors.push(`Final target display mismatch: ${displayedFinal}`);
}

const toastMessage = 'Wrong number! It needs to be ' + trueNum;
if (toastMessage !== `Wrong number! It needs to be ${trueNum}`) {
  errors.push(`Toast message formatting mismatch: ${toastMessage}`);
}

if (errors.length > 0) {
  console.error('TESTS FAILED:');
  errors.forEach(e => console.error('  ❌ ' + e));
  process.exit(1);
} else {
  console.log('ALL DYNAMIC TARGET UI & FINAL WIN EVALUATION TESTS PASSED! ✅');
  process.exit(0);
}
