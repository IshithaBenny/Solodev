import fs from 'fs';
import path from 'path';

console.log('--- Running Project Verification Checks ---');

let errors = [];

// 1. Check index.html
const htmlPath = path.resolve('index.html');
if (!fs.existsSync(htmlPath)) {
  errors.push('index.html does not exist');
} else {
  const html = fs.readFileSync(htmlPath, 'utf8');

  const requiredIds = [
    'start-screen',
    'game-canvas',
    'error-screen',
    'puzzle-overlay',
    'end-screen',
  ];

  requiredIds.forEach((id) => {
    if (!html.includes(`id="${id}"`)) {
      errors.push(`Missing layer id: #${id}`);
    }
  });

  // Check rules text
  const expectedRules = 'Rules: Roll a six sided die across a series of 3d boards and reach the glowing tile with right number facing upward.';
  if (!html.replace(/\s+/g, ' ').includes(expectedRules)) {
    errors.push('Rules text missing or mismatched');
  }

  // Check Start Game button
  if (!html.includes('Start Game')) {
    errors.push('Missing "Start Game" button text');
  }

  // Check Error Screen text
  const expectedErrorText = '404 Error: Win Condition Not Found. Try again!';
  if (!html.includes(expectedErrorText)) {
    errors.push('Missing error screen text: ' + expectedErrorText);
  }

  // Check End Screen text
  const expectedEndText = 'Congratulations! You have successfully wasted 5 minutes of your life.';
  if (!html.includes(expectedEndText)) {
    errors.push('Missing end screen text: ' + expectedEndText);
  }

  // Check download link
  if (!html.includes('href="assets/certificate_of_wasting_time.png"') && !html.includes("href='assets/certificate_of_wasting_time.png'")) {
    errors.push('Missing download link for assets/certificate_of_wasting_time.png');
  }
  if (!html.includes('download')) {
    errors.push('Missing download attribute on certificate link');
  }
}

// 2. Check style.css
const cssPath = path.resolve('src/style.css');
if (!fs.existsSync(cssPath)) {
  errors.push('src/style.css does not exist');
} else {
  const css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes('position: absolute')) {
    errors.push('CSS missing position: absolute');
  }
  if (!css.includes('z-index')) {
    errors.push('CSS missing z-index properties');
  }
  const requiredLayerSelectors = ['#game-canvas', '#puzzle-overlay', '#start-screen', '#error-screen', '#end-screen'];
  requiredLayerSelectors.forEach((sel) => {
    if (!css.includes(sel)) {
      errors.push(`CSS missing selector for ${sel}`);
    }
  });
}

// 3. Check gameState.js
const gameStatePath = path.resolve('src/gameState.js');
if (!fs.existsSync(gameStatePath)) {
  errors.push('src/gameState.js does not exist');
} else {
  const state = await import('../src/gameState.js');
  if (state.errorsCommitted !== 0) {
    errors.push(`errorsCommitted expected 0, got ${state.errorsCommitted}`);
  }
  if (typeof state.maxErrors !== 'number' || state.maxErrors < 1 || state.maxErrors > 5) {
    errors.push(`maxErrors expected between 1 and 5, got ${state.maxErrors}`);
  }
  if (state.isFinalPhase !== false) {
    errors.push(`isFinalPhase expected false, got ${state.isFinalPhase}`);
  }
  if (!state.availableMemes.includes(state.trueTargetNumber)) {
    errors.push(`trueTargetNumber (${state.trueTargetNumber}) not in availableMemes`);
  }
  if (state.fakeTargetNumber === state.trueTargetNumber) {
    errors.push(`fakeTargetNumber (${state.fakeTargetNumber}) should not equal trueTargetNumber (${state.trueTargetNumber})`);
  }
  if (state.activeMemeFolder !== `meme${state.trueTargetNumber}`) {
    errors.push(`activeMemeFolder expected meme${state.trueTargetNumber}, got ${state.activeMemeFolder}`);
  }
}

// 4. Check main.js
const mainJsPath = path.resolve('src/main.js');
if (!fs.existsSync(mainJsPath)) {
  errors.push('src/main.js does not exist');
} else {
  const mainJs = fs.readFileSync(mainJsPath, 'utf8');
  if (!mainJs.includes('gameState')) {
    errors.push('main.js does not import or reference gameState');
  }
  if (!mainJs.includes('start-btn') && !mainJs.includes('start-screen')) {
    errors.push('main.js missing start button hook');
  }
}

// 5. Check certificate asset
const certPath = path.resolve('public/assets/certificate_of_wasting_time.png');
if (!fs.existsSync(certPath)) {
  errors.push('Certificate PNG does not exist in public/assets/');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED WITH ERRORS:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! ✅');
  process.exit(0);
}
