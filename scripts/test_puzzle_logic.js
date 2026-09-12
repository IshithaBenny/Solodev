import fs from 'fs';
import path from 'path';

console.log('--- Verifying Puzzle.js Logic and Overlay Structure ---');
const errors = [];

// 1. Check puzzle.js existence
const puzzleSrcPath = path.resolve('src/puzzle.js');
const puzzleRootPath = path.resolve('puzzle.js');

if (!fs.existsSync(puzzleSrcPath) && !fs.existsSync(puzzleRootPath)) {
  errors.push('puzzle.js does not exist in src/ or root');
}

const puzzleContent = fs.readFileSync(puzzleSrcPath, 'utf8');

// 2. Check #drop-zone and stencil
if (!puzzleContent.includes('drop-zone') || !puzzleContent.includes('stencil.png')) {
  errors.push('puzzle.js missing #drop-zone creation with stencil.png');
}

// 3. Check 9 draggable pieces
if (!puzzleContent.includes('TOTAL_PIECES = 9') && !puzzleContent.includes('piece9.png')) {
  errors.push('puzzle.js does not generate 9 pieces');
}
if (!puzzleContent.includes('piece${i}.png') && !puzzleContent.includes('piece1.png')) {
  errors.push('puzzle.js missing piece image assignment');
}

// 4. Check random scattering within window bounds
if (!puzzleContent.includes('Math.random()') || !puzzleContent.includes('window.innerWidth')) {
  errors.push('puzzle.js missing random scattering within window bounds');
}

// 5. Check pointer events
if (!puzzleContent.includes('pointerdown') || !puzzleContent.includes('pointermove') || !puzzleContent.includes('pointerup')) {
  errors.push('puzzle.js missing pointer event listeners for dragging');
}

// 6. Check distance < 40px snap and lock logic
if (!puzzleContent.includes('40') || !puzzleContent.includes('Math.hypot') && !puzzleContent.includes('distance < 40')) {
  errors.push('puzzle.js missing distance < 40px snap calculation');
}
if (!puzzleContent.includes("left = '0px'") && !puzzleContent.includes('style.left = "0px"')) {
  errors.push('puzzle.js missing snap to (Top: 0, Left: 0)');
}

// 7. Check completion text 'Yas diva ur halfway there!', reveal full meme, and Return to Game button
const expectedText = 'Yas diva ur halfway there!';
if (!puzzleContent.includes(expectedText)) {
  errors.push(`puzzle.js missing completion text: "${expectedText}"`);
}
if (!puzzleContent.includes('return-to-game-btn') && !puzzleContent.includes('Return to Game')) {
  errors.push('puzzle.js missing Return to Game button');
}

// 8. Check Return to Game sets isFinalPhase = true and transitions to game-canvas
if (!puzzleContent.includes('isFinalPhase = true') && !puzzleContent.includes('isFinalPhase: true')) {
  errors.push('puzzle.js does not set isFinalPhase = true on Return to Game');
}

// 9. Check index.html integration
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
if (!indexHtml.includes('id="drop-zone"')) {
  errors.push('index.html missing #drop-zone element');
}
if (!indexHtml.includes(expectedText)) {
  errors.push(`index.html missing completion text: "${expectedText}"`);
}
if (!indexHtml.includes('Return to Game')) {
  errors.push('index.html missing Return to Game button');
}

// 10. Check main.js imports and hooks up puzzle
const mainJs = fs.readFileSync(path.resolve('src/main.js'), 'utf8');
if (!mainJs.includes('puzzle.js') && !mainJs.includes('initPuzzle')) {
  errors.push('main.js does not import or invoke puzzle.js');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED:');
  errors.forEach(e => console.error('  ❌ ' + e));
  process.exit(1);
} else {
  console.log('ALL PUZZLE.JS LOGIC & OVERLAY CHECKS PASSED! ✅');
  process.exit(0);
}
