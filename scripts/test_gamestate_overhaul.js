import * as state from '../src/gameState.js';

console.log('--- Testing Overhauled gameState.js ---');

// 1. Verify availableMemes (strictly [1, 3, 5])
if (!Array.isArray(state.availableMemes) || state.availableMemes.length !== 3 || JSON.stringify(state.availableMemes) !== JSON.stringify([1, 3, 5])) {
  throw new Error(`availableMemes incorrect: expected [1, 3, 5], got ${JSON.stringify(state.availableMemes)}`);
}
console.log('✅ availableMemes strictly contains only [1, 3, 5]:', state.availableMemes);

// 2. Verify exports presence
const requiredExports = [
  'availableMemes',
  'totalLevels',
  'maxLevels',
  'activeMeme',
  'trueTargetNumber',
  'fakeTargetNumber',
  'maxErrors',
  'activeMemeFolder',
  'errorsCommitted',
  'isFinalPhase',
  'initGameState',
  'checkAndPatchSavedLevel',
];

requiredExports.forEach((key) => {
  if (state[key] === undefined) {
    throw new Error(`Missing export: ${key}`);
  }
});
console.log('✅ All requested variables and functions are exported.');

// 3. Test 100 iterations of initialization
let seenTrueTargets = new Set();
let seenFakeTargets = new Set();
let seenMaxErrors = new Set();

for (let i = 0; i < 100; i++) {
  state.initGameState();

  const { activeMeme, trueTargetNumber, fakeTargetNumber, maxErrors, activeMemeFolder, errorsCommitted, isFinalPhase } = state;

  if (!state.availableMemes.includes(trueTargetNumber) || [2, 4, 6].includes(trueTargetNumber)) {
    throw new Error(`trueTargetNumber (${trueTargetNumber}) is invalid (must be in [1, 3, 5] and never 2, 4, 6)`);
  }
  if (trueTargetNumber !== activeMeme) {
    throw new Error(`trueTargetNumber (${trueTargetNumber}) does not strictly match activeMeme (${activeMeme})`);
  }
  seenTrueTargets.add(trueTargetNumber);

  if (fakeTargetNumber < 1 || fakeTargetNumber > 6 || !Number.isInteger(fakeTargetNumber)) {
    throw new Error(`fakeTargetNumber (${fakeTargetNumber}) is not an integer between 1 and 6`);
  }
  if (fakeTargetNumber === trueTargetNumber) {
    throw new Error(`fakeTargetNumber (${fakeTargetNumber}) equals trueTargetNumber (${trueTargetNumber})`);
  }
  seenFakeTargets.add(fakeTargetNumber);

  if (maxErrors < 1 || maxErrors > 5 || !Number.isInteger(maxErrors)) {
    throw new Error(`maxErrors (${maxErrors}) is not an integer between 1 and 5`);
  }
  seenMaxErrors.add(maxErrors);

  if (activeMemeFolder !== `meme${trueTargetNumber}`) {
    throw new Error(`activeMemeFolder (${activeMemeFolder}) does not match meme${trueTargetNumber}`);
  }

  if (errorsCommitted !== 0) {
    throw new Error(`errorsCommitted expected 0, got ${errorsCommitted}`);
  }

  if (isFinalPhase !== false) {
    throw new Error(`isFinalPhase expected false, got ${isFinalPhase}`);
  }
}

console.log('✅ 100 iterations of initGameState passed:');
console.log('   - Distinct true targets observed:', [...seenTrueTargets]);
console.log('   - Distinct fake targets observed:', [...seenFakeTargets]);
console.log('   - Distinct maxErrors observed:', [...seenMaxErrors]);

// 3b. Test explicit active meme assignment strictly for [1, 3, 5]
for (const m of [1, 3, 5]) {
  state.initGameState(m);
  if (state.activeMeme !== m) {
    throw new Error(`initGameState(${m}) failed: activeMeme is ${state.activeMeme}, expected ${m}`);
  }
  if (state.trueTargetNumber !== m) {
    throw new Error(`initGameState(${m}) failed: trueTargetNumber is ${state.trueTargetNumber}, expected ${m}`);
  }
  if (state.activeMemeFolder !== `meme${m}`) {
    throw new Error(`initGameState(${m}) failed: activeMemeFolder is ${state.activeMemeFolder}, expected meme${m}`);
  }
  if (state.fakeTargetNumber === state.trueTargetNumber) {
    throw new Error(`initGameState(${m}) failed: fakeTargetNumber (${state.fakeTargetNumber}) equals trueTargetNumber (${m})`);
  }
  if (state.fakeTargetNumber < 1 || state.fakeTargetNumber > 6) {
    throw new Error(`initGameState(${m}) failed: fakeTargetNumber (${state.fakeTargetNumber}) out of range 1..6`);
  }
}
console.log('✅ Explicit active meme initialization passed for all memes [1, 3, 5]: trueTargetNumber strictly matches active meme, fakeTargetNumber strictly does not equal trueTargetNumber.');

// 3c. Test that levels 2, 4, 6 are strictly rejected
for (const forbidden of [2, 4, 6]) {
  state.initGameState(forbidden);
  if (state.trueTargetNumber === forbidden || state.activeMeme === forbidden) {
    throw new Error(`Forbidden level ${forbidden} was accepted!`);
  }
  if (!state.availableMemes.includes(state.trueTargetNumber)) {
    throw new Error(`Fallback level ${state.trueTargetNumber} is not in availableMemes [1, 3, 5]`);
  }
}
console.log('✅ Levels 2, 4, 6 are strictly rejected and reset to valid memes.');

// 3d. Test 1000 iterations guaranteeing fakeTargetNumber never equals trueTargetNumber
for (const m of [1, 3, 5]) {
  for (let i = 0; i < 334; i++) {
    state.initGameState(m);
    if (state.fakeTargetNumber === m) {
      throw new Error(`Loop failed: fakeTargetNumber was ${state.fakeTargetNumber} for trueTargetNumber ${m}`);
    }
  }
}
console.log('✅ 1000 iterations verified: loop strictly guarantees fakeTargetNumber never equals trueTargetNumber.');

// 4. Test error recording
state.recordError();
if (state.errorsCommitted !== 1) {
  throw new Error(`recordError failed: errorsCommitted is ${state.errorsCommitted}`);
}
console.log('✅ recordError increments properly.');

// 5. Test checkAndPatchSavedLevel patch logic (clearing localStorage on levels 2, 4, 6 or > 5)
const mockStorage = new Map();
global.window = {
  localStorage: {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
    key: (i) => [...mockStorage.keys()][i],
    get length() { return mockStorage.size; }
  }
};

for (const badLevel of ['2', '4', '6', '7']) {
  mockStorage.set('currentLevel', badLevel);
  state.checkAndPatchSavedLevel();
  if (mockStorage.size !== 0) {
    throw new Error(`checkAndPatchSavedLevel failed to clear localStorage containing forbidden level ${badLevel}`);
  }
}
console.log('✅ checkAndPatchSavedLevel clears localStorage when forbidden level (2, 4, 6, >5) is present.');

mockStorage.set('gameState', JSON.stringify({ level: 4 }));
state.checkAndPatchSavedLevel();
if (mockStorage.size !== 0) {
  throw new Error(`checkAndPatchSavedLevel failed to clear localStorage with JSON level 4`);
}
console.log('✅ checkAndPatchSavedLevel clears localStorage when JSON level 4.');

state.gameState.activeMeme = 4;
state.checkAndPatchSavedLevel();
if (state.gameState.trueTargetNumber === 4 || state.gameState.activeMeme === 4) {
  throw new Error(`checkAndPatchSavedLevel failed to reset level 4 in-memory`);
}
console.log('✅ checkAndPatchSavedLevel resets in-memory forbidden level 4.');

console.log('ALL GAMESTATE TESTS PASSED! 🎉');
