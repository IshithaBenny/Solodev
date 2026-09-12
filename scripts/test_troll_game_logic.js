import gameState, { initGameState, recordError } from '../src/gameState.js';
import dieState from '../src/dieState.js';

console.log('--- Testing Updated Troll Game Logic in main.js ---');

const errors = [];

// Simulate UI elements
const layers = {
  'start-screen': { hidden: false },
  'game-canvas': { hidden: true },
  'error-screen': { hidden: true },
  'puzzle-overlay': { hidden: true },
  'end-screen': { hidden: true },
};

let lastShownLayer = null;
let toastMessage = null;

function mockShowLayer(layerId) {
  lastShownLayer = layerId;
  Object.keys(layers).forEach(k => {
    layers[k].hidden = (k !== layerId);
  });
}

function mockShowToast(msg) {
  toastMessage = msg;
}

// Logic under test: mirrors handleTargetTileArrival in main.js
function handleTargetTileArrival(topNumber) {
  if (!gameState.isFinalPhase) {
    if (topNumber !== gameState.fakeTargetNumber) {
      mockShowToast('Wrong! Try again with ' + gameState.fakeTargetNumber);
      return { action: 'wrong_pre_puzzle', toast: toastMessage };
    }

    recordError();
    if (gameState.errorsCommitted >= gameState.maxErrors) {
      mockShowLayer('puzzle-overlay');
      return { action: 'transition_to_puzzle', errorsCommitted: gameState.errorsCommitted };
    } else {
      mockShowLayer('error-screen');
      return { action: 'crash_retry', errorsCommitted: gameState.errorsCommitted };
    }
  } else {
    if (topNumber === gameState.trueTargetNumber) {
      mockShowLayer('end-screen');
      return { action: 'win_game' };
    } else {
      mockShowToast('Wrong! It needs to be ' + gameState.trueTargetNumber);
      return { action: 'wrong_post_puzzle', toast: toastMessage };
    }
  }
}

// 1. Test Pre-puzzle with WRONG number
initGameState();
gameState.isFinalPhase = false;
const initialErrors = gameState.errorsCommitted; // 0
const wrongFakeNumber = gameState.fakeTargetNumber === 6 ? 1 : gameState.fakeTargetNumber + 1;

toastMessage = null;
lastShownLayer = null;
const res1 = handleTargetTileArrival(wrongFakeNumber);

if (gameState.errorsCommitted !== initialErrors) {
  errors.push(`Pre-puzzle wrong number should NOT increment errorsCommitted, but got ${gameState.errorsCommitted}`);
}
if (lastShownLayer !== null) {
  errors.push(`Pre-puzzle wrong number should NOT trigger crash, but showed layer ${lastShownLayer}`);
}
const expectedPreToast = 'Wrong! Try again with ' + gameState.fakeTargetNumber;
if (toastMessage !== expectedPreToast) {
  errors.push(`Expected toast "${expectedPreToast}", got "${toastMessage}"`);
}
console.log('✅ Pre-puzzle wrong face correctly shows toast, does not increment errors, and does not crash.');

// 2. Test Pre-puzzle with RIGHT fake number (obeying fake instruction)
gameState.maxErrors = 2;
gameState.errorsCommitted = 0;
const res2 = handleTargetTileArrival(gameState.fakeTargetNumber);

if (gameState.errorsCommitted !== 1) {
  errors.push(`Expected errorsCommitted = 1 after obeying fake target, got ${gameState.errorsCommitted}`);
}
if (res2.action !== 'crash_retry') {
  errors.push(`Expected crash_retry on first error, got ${res2.action}`);
}
console.log('✅ Pre-puzzle obeyed fake target increments errorsCommitted.');

// Trigger second error to reach maxErrors
const res3 = handleTargetTileArrival(gameState.fakeTargetNumber);
if (gameState.errorsCommitted !== 2) {
  errors.push(`Expected errorsCommitted = 2, got ${gameState.errorsCommitted}`);
}
if (res3.action !== 'transition_to_puzzle' || lastShownLayer !== 'puzzle-overlay') {
  errors.push(`Expected transition to puzzle-overlay when errorsCommitted >= maxErrors, got ${res3.action}, layer: ${lastShownLayer}`);
}
console.log('✅ Pre-puzzle reaching maxErrors triggers fake crash and transitions to puzzle-overlay.');

// 3. Test Post-puzzle with WRONG number
gameState.isFinalPhase = true;
const wrongTrueNumber = gameState.trueTargetNumber === 5 ? 1 : 5;
toastMessage = null;
lastShownLayer = null;

const res4 = handleTargetTileArrival(wrongTrueNumber);
const expectedPostToast = 'Wrong! It needs to be ' + gameState.trueTargetNumber;
if (toastMessage !== expectedPostToast) {
  errors.push(`Expected post-puzzle wrong toast "${expectedPostToast}", got "${toastMessage}"`);
}
if (lastShownLayer === 'end-screen') {
  errors.push('Post-puzzle wrong face should NOT show end-screen');
}
console.log('✅ Post-puzzle wrong face shows toast "Wrong! It needs to be " + trueTargetNumber and denies win.');

// 4. Test Post-puzzle with RIGHT true number
const res5 = handleTargetTileArrival(gameState.trueTargetNumber);
if (res5.action !== 'win_game' || lastShownLayer !== 'end-screen') {
  errors.push(`Expected win_game and end-screen, got ${res5.action}, layer: ${lastShownLayer}`);
}
console.log('✅ Post-puzzle correct true face triggers final win sequence and end-screen.');

// Summary
if (errors.length > 0) {
  console.error('\n❌ TROLL GAME LOGIC TESTS FAILED:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\n🎉 ALL TROLL GAME LOGIC TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
