import fs from 'fs';
import path from 'path';
import gameState, { activeMemeFolder } from '../src/gameState.js';
import { PIECE_CONFIG } from '../src/puzzle.js';

console.log('--- Verifying Reverted Standard Drag-and-Drop Puzzle Logic ---');

const errors = [];

// 1. Static Source Inspection of src/puzzle.js
const puzzleSource = fs.readFileSync(path.resolve('src/puzzle.js'), 'utf8');

if (puzzleSource.includes('clip-path') || puzzleSource.includes('clipPath')) {
  errors.push('src/puzzle.js should NOT include complex clip-path logic');
}
if (puzzleSource.includes('puzzle-handle') || puzzleSource.includes('attachHandleDrag')) {
  errors.push('src/puzzle.js should NOT include transparent handle logic');
}
if (!puzzleSource.includes("cursor = 'grab'") && !puzzleSource.includes('cursor: grab')) {
  errors.push('src/puzzle.js missing grab cursor for draggable pieces');
}
if (!puzzleSource.includes('40')) {
  errors.push('src/puzzle.js missing 40px snap threshold');
}
if (!puzzleSource.includes('Yas diva ur halfway there!')) {
  errors.push('src/puzzle.js missing completion text "Yas diva ur halfway there!"');
}
if (!puzzleSource.includes('Return to Game')) {
  errors.push('src/puzzle.js missing Return to Game button');
}

// 2. Verify PIECE_CONFIG
if (PIECE_CONFIG.length !== 9) {
  errors.push(`Expected 9 pieces in PIECE_CONFIG, got ${PIECE_CONFIG.length}`);
}

const expectedSlots = [
  { index: 1, top: 0, left: 0 },
  { index: 2, top: 0, left: 280 },
  { index: 3, top: 0, left: 560 },
  { index: 4, top: 200, left: 0 },
  { index: 5, top: 200, left: 280 },
  { index: 6, top: 200, left: 560 },
  { index: 7, top: 400, left: 0 },
  { index: 8, top: 400, left: 280 },
  { index: 9, top: 400, left: 560 },
];

expectedSlots.forEach((slot, i) => {
  const actual = PIECE_CONFIG[i];
  if (!actual || actual.top !== slot.top || actual.left !== slot.left) {
    errors.push(`Piece ${slot.index}: expected top: ${slot.top}, left: ${slot.left}; got ${actual?.top}, ${actual?.left}`);
  }
});

// 3. Simulated DOM Test
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...names) { names.forEach(n => this.classes.add(n)); }
  remove(...names) { names.forEach(n => this.classes.delete(n)); }
  contains(name) { return this.classes.has(name); }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.classList = new MockClassList();
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this._rect = { left: 100, top: 100, width: 840, height: 600, right: 940, bottom: 700 };
    this._innerHTML = '';
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    if (typeof val === 'string') {
      const idMatches = [...val.matchAll(/id=["']([^"']+)["']/g)];
      idMatches.forEach(m => {
        const child = new MockElement('div');
        child.id = m[1];
        child.parentNode = this;
        this.children.push(child);
      });
    }
  }

  get innerHTML() { return this._innerHTML; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  querySelector(sel) {
    if (sel.startsWith('#')) return this.findById(sel.slice(1));
    return null;
  }

  querySelectorAll(sel) {
    const res = [];
    const walk = (node) => {
      if (sel.startsWith('.') && node.className.includes(sel.slice(1))) res.push(node);
      node.children.forEach(walk);
    };
    walk(this);
    return res;
  }

  findById(id) {
    if (this.id === id) return this;
    for (const c of this.children) {
      const f = c.findById(id);
      if (f) return f;
    }
    return null;
  }

  addEventListener(type, h) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(h);
  }

  dispatchEvent(e) {
    (this.listeners[e.type] || []).forEach(h => h(e));
  }

  getBoundingClientRect() { return { ...this._rect }; }
  setPointerCapture() {}
  releasePointerCapture() {}
}

const mockOverlay = new MockElement('div');
mockOverlay.id = 'puzzle-overlay';

global.document = {
  getElementById: (id) => id === 'puzzle-overlay' ? mockOverlay : null,
  createElement: (tag) => new MockElement(tag),
};
global.window = { innerWidth: 1920, innerHeight: 1080 };

const { initPuzzle, snapPiece } = await import('../src/puzzle.js');

let returnToGameFired = false;
initPuzzle(() => {
  returnToGameFired = true;
});

const dropZone = mockOverlay.querySelector('#drop-zone');
if (!dropZone) errors.push('Missing #drop-zone');

const pieces = mockOverlay.querySelectorAll('.puzzle-piece');
if (pieces.length !== 9) {
  errors.push(`Expected 9 .puzzle-piece elements, found ${pieces.length}`);
}

pieces.forEach((piece, i) => {
  const cfg = PIECE_CONFIG[i];
  if (piece.style.pointerEvents !== 'auto') {
    errors.push(`Piece ${cfg.index} must have pointerEvents: 'auto' for direct dragging`);
  }
  if (piece.style.width !== '280px' || piece.style.height !== '200px') {
    errors.push(`Piece ${cfg.index} dimensions must be 280px x 200px, got ${piece.style.width} x ${piece.style.height}`);
  }
  if (piece.children.length > 0) {
    errors.push(`Piece ${cfg.index} should NOT have child elements (no transparent handles)`);
  }
});

// Test snapping all 9 pieces
const successModal = mockOverlay.querySelector('#puzzle-success-modal');
pieces.forEach((piece, i) => {
  const cfg = PIECE_CONFIG[i];
  snapPiece(piece, cfg, dropZone, successModal);

  if (piece.style.left !== `${cfg.left}px` || piece.style.top !== `${cfg.top}px`) {
    errors.push(`Piece ${cfg.index} snapped position: expected (${cfg.left}px, ${cfg.top}px), got (${piece.style.left}, ${piece.style.top})`);
  }
  if (piece.style.clipPath) {
    errors.push(`Piece ${cfg.index} should NOT have clipPath applied`);
  }
  if (piece.dataset.locked !== 'true') {
    errors.push(`Piece ${cfg.index} not locked`);
  }
});

// Test completion & return to game
const returnBtn = successModal.querySelector('#return-to-game-btn');
if (returnBtn) {
  returnBtn.dispatchEvent({ type: 'click' });
  if (!gameState.isFinalPhase) errors.push('isFinalPhase was not set to true');
  if (!returnToGameFired) errors.push('Return to Game callback was not fired');
}

if (errors.length > 0) {
  console.error('\n❌ REVERTED PUZZLE TESTS FAILED:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\n🎉 ALL REVERTED PUZZLE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
