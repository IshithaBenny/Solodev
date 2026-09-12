/**
 * gameState.js
 * Centralized state tracking with meme configuration and target numbers.
 * Strictly available memes: [1, 3, 5]. Levels 2, 4, 6 are removed.
 */

// 1. Configuration array for available meme sets (strictly [1, 3, 5])
export const availableMemes = [1, 3, 5];
export const totalLevels = 3;
export const maxLevels = 5;

// Core state variables (live exported bindings)
export let activeMeme = 1;
export let trueTargetNumber = 1;
export let fakeTargetNumber;
export let maxErrors;
export let activeMemeFolder = 'meme1';
export let errorsCommitted = 0;
export let isFinalPhase = false;

/**
 * Patch: Clear localStorage and reset state if user's current saved level is not in [1, 3, 5] (e.g. 2, 4, 6 or > 5)
 */
export function checkAndPatchSavedLevel() {
  const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
  if (storage) {
    try {
      let shouldClear = false;

      const isInvalid = (val) => {
        if (val === null || val === undefined) return false;
        const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
        return !isNaN(num) && (!availableMemes.includes(num) || [2, 4, 6].includes(num) || num > 5);
      };

      // 1. Check common direct keys
      const candidateKeys = [
        'level',
        'currentLevel',
        'savedLevel',
        'userLevel',
        'gameLevel',
        'current_level',
        'saved_level',
        'activeLevel',
        'active_level',
        'totalLevels',
        'memeLevel',
        'activeMeme',
        'trueTargetNumber',
      ];

      for (const key of candidateKeys) {
        const item = storage.getItem(key);
        if (item !== null && isInvalid(item)) {
          shouldClear = true;
          break;
        }
      }

      // 2. Scan all localStorage keys and stored JSON objects
      if (!shouldClear) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;
          const val = storage.getItem(key);
          if (!val) continue;

          if ((key.toLowerCase().includes('level') || key.toLowerCase().includes('meme') || key.toLowerCase().includes('target')) && isInvalid(val)) {
            shouldClear = true;
            break;
          }

          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
              if (
                isInvalid(parsed.level) ||
                isInvalid(parsed.currentLevel) ||
                isInvalid(parsed.savedLevel) ||
                isInvalid(parsed.activeMeme) ||
                isInvalid(parsed.trueTargetNumber) ||
                isInvalid(parsed.activeMemeFolder)
              ) {
                shouldClear = true;
                break;
              }
            }
          } catch (_) {}
        }
      }

      if (shouldClear) {
        console.warn('[GameState Patch] Invalid saved level detected (not in [1, 3, 5]). Clearing localStorage.');
        storage.clear();
      }
    } catch (err) {
      console.warn('[GameState Patch] Error checking localStorage:', err);
    }
  }

  // Reset in-memory state if current target, active meme, or meme folder is 2, 4, 6 or not in [1, 3, 5]
  if (trueTargetNumber !== undefined && (!availableMemes.includes(trueTargetNumber) || [2, 4, 6].includes(trueTargetNumber))) {
    console.warn(`[GameState Patch] Current trueTargetNumber (${trueTargetNumber}) is invalid. Resetting to 1.`);
    trueTargetNumber = 1;
    activeMeme = 1;
    activeMemeFolder = 'meme1';
  }
  if (activeMeme !== undefined && (!availableMemes.includes(activeMeme) || [2, 4, 6].includes(activeMeme))) {
    console.warn(`[GameState Patch] Current activeMeme (${activeMeme}) is invalid. Resetting to 1.`);
    activeMeme = 1;
    trueTargetNumber = 1;
    activeMemeFolder = 'meme1';
  }
  if (activeMemeFolder) {
    const num = parseInt(activeMemeFolder.replace(/\D/g, ''), 10);
    if (!isNaN(num) && (!availableMemes.includes(num) || [2, 4, 6].includes(num))) {
      console.warn(`[GameState Patch] Current activeMemeFolder (${activeMemeFolder}) is invalid. Resetting to meme1.`);
      activeMemeFolder = 'meme1';
      activeMeme = 1;
      trueTargetNumber = 1;
    }
  }
}

/**
 * Initialize / re-initialize the game state variables
 * @param {number|string} [meme] - Optional specific active meme (1, 3, or 5)
 */
export function initGameState(meme) {
  // Check and patch saved level / localStorage if invalid
  checkAndPatchSavedLevel();

  // Determine the numerical value of the currently active meme (strictly 1, 3, or 5)
  let activeMemeValue;

  if (typeof meme === 'number' && availableMemes.includes(meme)) {
    activeMemeValue = meme;
  } else if (typeof meme === 'string' && meme.trim() !== '') {
    const parsed = parseInt(meme.replace(/\D/g, ''), 10);
    if (availableMemes.includes(parsed)) {
      activeMemeValue = parsed;
    }
  } else if (typeof activeMeme === 'number' && availableMemes.includes(activeMeme)) {
    activeMemeValue = activeMeme;
  } else if (typeof activeMemeFolder === 'string' && activeMemeFolder.trim() !== '') {
    const parsed = parseInt(activeMemeFolder.replace(/\D/g, ''), 10);
    if (availableMemes.includes(parsed)) {
      activeMemeValue = parsed;
    }
  }

  // Fallback to first available meme (1) if not set or invalid (strictly avoiding levels 2, 4, or 6)
  if (!activeMemeValue || !availableMemes.includes(activeMemeValue)) {
    activeMemeValue = availableMemes[0] || 1;
  }

  // Ensure active meme variables strictly reflect the active meme (1, 3, or 5)
  activeMeme = activeMemeValue;
  activeMemeFolder = 'meme' + activeMemeValue;

  // Set trueTargetNumber to exactly match the value of the currently active meme (1, 3, or 5)
  trueTargetNumber = activeMemeValue;

  // Generate fakeTargetNumber as a random integer between 1 and 6
  // that strictly does not equal the trueTargetNumber
  do {
    fakeTargetNumber = Math.floor(Math.random() * 6) + 1;
  } while (fakeTargetNumber === trueTargetNumber);

  // Generate maxErrors as random integer between 1 and 5
  maxErrors = Math.floor(Math.random() * 5) + 1;

  // Reset counters & flags
  errorsCommitted = 0;
  isFinalPhase = false;

  console.log('[GameState Initialized]');
  console.log('  - activeMeme:', activeMeme);
  console.log('  - activeMemeFolder:', activeMemeFolder);
  console.log('  - trueTargetNumber:', trueTargetNumber);
  console.log('  - fakeTargetNumber:', fakeTargetNumber);
  console.log('  - maxErrors:', maxErrors);
  console.log('  - errorsCommitted:', errorsCommitted);
  console.log('  - isFinalPhase:', isFinalPhase);

  return gameState;
}

/**
 * Increment the error count
 */
export function recordError() {
  errorsCommitted += 1;
  return errorsCommitted;
}

/**
 * State container object for backward-compatibility & consolidated property access
 */
export const gameState = {
  get totalLevels() {
    return totalLevels;
  },
  get maxLevels() {
    return maxLevels;
  },
  get availableMemes() {
    return availableMemes;
  },
  get activeMeme() {
    return activeMeme;
  },
  set activeMeme(val) {
    const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
    const safeNum = availableMemes.includes(num) ? num : 1;
    activeMeme = safeNum;
    activeMemeFolder = 'meme' + safeNum;
    trueTargetNumber = safeNum;
    if (fakeTargetNumber === trueTargetNumber) {
      do {
        fakeTargetNumber = Math.floor(Math.random() * 6) + 1;
      } while (fakeTargetNumber === trueTargetNumber);
    }
  },
  get trueTargetNumber() {
    return trueTargetNumber;
  },
  set trueTargetNumber(val) {
    const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
    const safeNum = availableMemes.includes(num) ? num : 1;
    trueTargetNumber = safeNum;
    activeMeme = safeNum;
    activeMemeFolder = 'meme' + safeNum;
    if (fakeTargetNumber === trueTargetNumber) {
      do {
        fakeTargetNumber = Math.floor(Math.random() * 6) + 1;
      } while (fakeTargetNumber === trueTargetNumber);
    }
  },
  get fakeTargetNumber() {
    return fakeTargetNumber;
  },
  set fakeTargetNumber(val) {
    fakeTargetNumber = val;
  },
  get maxErrors() {
    return maxErrors;
  },
  set maxErrors(val) {
    maxErrors = val;
  },
  get activeMemeFolder() {
    return activeMemeFolder;
  },
  set activeMemeFolder(val) {
    const num = parseInt((val || '').replace(/\D/g, ''), 10);
    const safeNum = availableMemes.includes(num) ? num : 1;
    activeMeme = safeNum;
    activeMemeFolder = 'meme' + safeNum;
    trueTargetNumber = safeNum;
    if (fakeTargetNumber === trueTargetNumber) {
      do {
        fakeTargetNumber = Math.floor(Math.random() * 6) + 1;
      } while (fakeTargetNumber === trueTargetNumber);
    }
  },
  get errorsCommitted() {
    return errorsCommitted;
  },
  set errorsCommitted(val) {
    errorsCommitted = val;
  },
  get isFinalPhase() {
    return isFinalPhase;
  },
  set isFinalPhase(val) {
    isFinalPhase = val;
  },
  // targetNumber returns fakeTargetNumber during initial phase, and trueTargetNumber during final phase
  get targetNumber() {
    return isFinalPhase ? trueTargetNumber : fakeTargetNumber;
  },
  set targetNumber(val) {
    if (isFinalPhase) {
      const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
      const safeNum = availableMemes.includes(num) ? num : 1;
      trueTargetNumber = safeNum;
      activeMeme = safeNum;
      activeMemeFolder = 'meme' + safeNum;
      if (fakeTargetNumber === trueTargetNumber) {
        do {
          fakeTargetNumber = Math.floor(Math.random() * 6) + 1;
        } while (fakeTargetNumber === trueTargetNumber);
      }
    } else {
      fakeTargetNumber = val;
    }
  },
};

// Run patch and auto-run initialization on module load
checkAndPatchSavedLevel();
initGameState();

export default gameState;
