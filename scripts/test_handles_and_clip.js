import fs from 'fs';
import path from 'path';
import { PIECE_CONFIG } from '../src/puzzle.js';

console.log('--- Verifying Transparent Handles and Clip-Path Puzzle Architecture ---');

const errors = [];

// 1. Verify PIECE_CONFIG (9 tiles, 280x200 each on 840x600 canvas)
if (!PIECE_CONFIG || PIECE_CONFIG.length !== 9) {
  errors.push(`Expected PIECE_CONFIG to have 9 entries, but got ${PIECE_CONFIG?.length}`);
} else {
  const expectedConfigs = [
    { index: 1, top: 0, left: 0, clip: 'inset(0% 66.6% 66.6% 0%)' },
    { index: 2, top: 0, left: 280, clip: 'inset(0% 33.3% 66.6% 33.3%)' },
    { index: 3, top: 0, left: 560, clip: 'inset(0% 0% 66.6% 66.6%)' },
    { index: 4, top: 200, left: 0, clip: 'inset(33.3% 66.6% 33.3% 0%)' },
    { index: 5, top: 200, left: 280, clip: 'inset(33.3% 33.3% 33.3% 33.3%)' },
    { index: 6, top: 200, left: 560, clip: 'inset(33.3% 0% 33.3% 66.6%)' },
    { index: 7, top: 400, left: 0, clip: 'inset(66.6% 66.6% 0% 0%)' },
    { index: 8, top: 400, left: 280, clip: 'inset(66.6% 33.3% 0% 33.3%)' },
    { index: 9, top: 400, left: 560, clip: 'inset(66.6% 0% 0% 66.6%)' },
  ];

  expectedConfigs.forEach((expected, i) => {
    const actual = PIECE_CONFIG[i];
    if (!actual) {
      errors.push(`Missing configuration for piece index ${expected.index}`);
      return;
    }
    if (actual.index !== expected.index) {
      errors.push(`Piece ${i + 1}: expected index ${expected.index}, got ${actual.index}`);
    }
    if (actual.top !== expected.top || actual.left !== expected.left) {
      errors.push(`Piece ${expected.index}: expected position (top: ${expected.top}, left: ${expected.left}), got (top: ${actual.top}, left: ${actual.left})`);
    }
    if (actual.clip !== expected.clip) {
      errors.push(`Piece ${expected.index}: expected clip "${expected.clip}", got "${actual.clip}"`);
    }
  });
}

// 2. Verify source code requirements in src/puzzle.js
const puzzleSource = fs.readFileSync(path.resolve('src/puzzle.js'), 'utf8');

// Dynamic Assets: Import activeMemeFolder from gameState.js
if (!puzzleSource.includes("import") || !puzzleSource.includes("activeMemeFolder") || !puzzleSource.includes("./gameState.js")) {
  errors.push('src/puzzle.js does not import activeMemeFolder from gameState.js');
}

// Set background image of #drop-zone to ${activeMemeFolder}/stencil.png
if (!puzzleSource.includes('stencil.png') || !puzzleSource.includes('backgroundImage')) {
  errors.push('src/puzzle.js does not set #drop-zone background to stencil.png');
}

// Full pieces not draggable: pointerEvents = 'none'
if (!puzzleSource.includes("pointerEvents = 'none'")) {
  errors.push('src/puzzle.js missing pointerEvents = "none" on full image pieces');
}

// Transparent handles: 280x200, pointerEvents = 'auto', cursor = 'grab'
if (!puzzleSource.includes('280px') || !puzzleSource.includes('200px')) {
  errors.push('src/puzzle.js missing 280px by 200px handle dimensions');
}
if (!puzzleSource.includes("pointerEvents = 'auto'")) {
  errors.push('src/puzzle.js does not make handles draggable via pointerEvents = "auto"');
}
if (!puzzleSource.includes('puzzle-handle')) {
  errors.push('src/puzzle.js missing .puzzle-handle class');
}

// Append handle to piece
if (!puzzleSource.includes('piece.appendChild(handle)')) {
  errors.push('src/puzzle.js does not append handle to piece');
}

// Snapping logic: distance < 40px center-to-center
if (!puzzleSource.includes('targetTileCenterX') || !puzzleSource.includes('targetTileCenterY')) {
  errors.push('src/puzzle.js missing target tile center calculation');
}
if (!puzzleSource.includes('handleCenterX') || !puzzleSource.includes('handleCenterY')) {
  errors.push('src/puzzle.js missing handle center calculation');
}
if (!puzzleSource.includes('40')) {
  errors.push('src/puzzle.js missing 40px snap distance threshold');
}

// Positioning parent full image piece at top: 0, left: 0 in #drop-zone
if (!puzzleSource.includes("dropZone.appendChild(piece)") && !puzzleSource.includes("dropZone.appendChild")) {
  errors.push('src/puzzle.js does not append snapped piece to dropZone');
}
if (!puzzleSource.includes("piece.style.left = '0px'") && !puzzleSource.includes('piece.style.left = "0px"')) {
  errors.push('src/puzzle.js does not position snapped piece at left: 0');
}
if (!puzzleSource.includes("piece.style.top = '0px'") && !puzzleSource.includes('piece.style.top = "0px"')) {
  errors.push('src/puzzle.js does not position snapped piece at top: 0');
}

// Clip-Path application: clipPath = cfg.clip
if (!puzzleSource.includes('clipPath = cfg.clip')) {
  errors.push('src/puzzle.js does not assign clipPath = cfg.clip on snap');
}

// Yas diva completion reveal
if (!puzzleSource.includes('Yas diva ur halfway there!')) {
  errors.push('src/puzzle.js missing "Yas diva ur halfway there!" reveal text');
}
if (!puzzleSource.includes('Return to Game')) {
  errors.push('src/puzzle.js missing "Return to Game" button');
}

// 3. Verify CSS in src/style.css
const styleCss = fs.readFileSync(path.resolve('src/style.css'), 'utf8');
if (!styleCss.includes('width: 840px') || !styleCss.includes('height: 600px')) {
  errors.push('src/style.css does not specify 840px x 600px for #drop-zone / .puzzle-piece');
}
if (!styleCss.includes('.puzzle-handle')) {
  errors.push('src/style.css missing .puzzle-handle styling');
}

// 4. Output Results
if (errors.length > 0) {
  console.error('\n❌ TEST FAILED with errors:');
  errors.forEach(err => console.error('  - ' + err));
  process.exit(1);
} else {
  console.log('\n✅ ALL TRANSPARENT HANDLES AND CLIP-PATH ARCHITECTURE CHECKS PASSED!');
  process.exit(0);
}
