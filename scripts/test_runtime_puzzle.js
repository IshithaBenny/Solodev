// Simulated DOM test for initPuzzle, handle dragging, and clip-path snapping
import gameState, { activeMemeFolder } from '../src/gameState.js';
import { PIECE_CONFIG } from '../src/puzzle.js';

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) {
    names.forEach(n => this.classes.add(n));
  }
  remove(...names) {
    names.forEach(n => this.classes.delete(n));
  }
  contains(name) {
    return this.classes.has(name);
  }
  toggle(name, force) {
    if (force !== undefined) {
      if (force) this.classes.add(name);
      else this.classes.delete(name);
    } else {
      if (this.classes.has(name)) this.classes.delete(name);
      else this.classes.add(name);
    }
  }
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
    this.parentNode = null;
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
      // Find elements with id
      const idMatches = [...val.matchAll(/id=["']([^"']+)["']/g)];
      idMatches.forEach(m => {
        const child = new MockElement('div');
        child.id = m[1];
        child.parentNode = this;
        this.children.push(child);
      });
      // Also match return-to-game-btn
      if (val.includes('id="return-to-game-btn"') && !this.findById('return-to-game-btn')) {
        const btn = new MockElement('button');
        btn.id = 'return-to-game-btn';
        btn.parentNode = this;
        this.children.push(btn);
      }
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.findById(id);
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.findByClass(cls);
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const search = (node) => {
      if (selector.startsWith('.') && node.className.includes(selector.slice(1))) {
        results.push(node);
      }
      node.children.forEach(search);
    };
    search(this);
    return results;
  }

  findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  findByClass(cls) {
    if (this.classList.contains(cls) || (typeof this.className === 'string' && this.className.includes(cls))) return this;
    for (const child of this.children) {
      const found = child.findByClass(cls);
      if (found) return found;
    }
    return null;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(h => h(event));
  }

  getBoundingClientRect() {
    return { ...this._rect };
  }

  setPointerCapture() {}
  releasePointerCapture() {}
}

const elementsById = {};
const mockOverlay = new MockElement('div');
mockOverlay.id = 'puzzle-overlay';
elementsById['puzzle-overlay'] = mockOverlay;

global.document = {
  getElementById: (id) => elementsById[id] || null,
  createElement: (tag) => new MockElement(tag),
};
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
};

// Now import initPuzzle and helpers
const { initPuzzle, snapAndClipPiece } = await import('../src/puzzle.js');

console.log('--- Testing initPuzzle and Full Clip-Path Snap Flow in Mock DOM ---');

let returnCallbackFired = false;
initPuzzle(() => {
  returnCallbackFired = true;
});

// 1. Verify Drop Zone
const dropZone = mockOverlay.querySelector('#drop-zone');
if (!dropZone) {
  throw new Error('#drop-zone was not created in #puzzle-overlay');
}
console.log('✅ #drop-zone created. Background image:', dropZone.style.backgroundImage);
const expectedBg = `url('${activeMemeFolder}/stencil.png')`;
if (dropZone.style.backgroundImage !== expectedBg) {
  throw new Error(`Expected drop-zone background "${expectedBg}", got "${dropZone.style.backgroundImage}"`);
}

// 2. Verify 9 pieces & transparent handles
const pieces = mockOverlay.querySelectorAll('.puzzle-piece');
if (pieces.length !== 9) {
  throw new Error(`Expected 9 .puzzle-piece elements, got ${pieces.length}`);
}
console.log('✅ 9 .puzzle-piece elements created.');

pieces.forEach((piece, i) => {
  const cfg = PIECE_CONFIG[i];
  if (piece.style.pointerEvents !== 'none') {
    throw new Error(`Piece ${cfg.index} has pointerEvents "${piece.style.pointerEvents}", expected "none"`);
  }
  const expectedImg = `url('${activeMemeFolder}/piece${cfg.index}.png')`;
  if (piece.style.backgroundImage !== expectedImg) {
    throw new Error(`Piece ${cfg.index} background is "${piece.style.backgroundImage}", expected "${expectedImg}"`);
  }

  // Handle
  const handle = piece.querySelector('.puzzle-handle');
  if (!handle) {
    throw new Error(`Piece ${cfg.index} is missing .puzzle-handle child!`);
  }
  if (handle.style.width !== '280px' || handle.style.height !== '200px') {
    throw new Error(`Handle ${cfg.index} dimensions are ${handle.style.width}x${handle.style.height}, expected 280px x 200px`);
  }
  if (handle.style.top !== `${cfg.top}px` || handle.style.left !== `${cfg.left}px`) {
    throw new Error(`Handle ${cfg.index} position is top:${handle.style.top} left:${handle.style.left}, expected top:${cfg.top}px left:${cfg.left}px`);
  }
  if (handle.style.pointerEvents !== 'auto') {
    throw new Error(`Handle ${cfg.index} pointerEvents is "${handle.style.pointerEvents}", expected "auto"`);
  }
});
console.log('✅ All 9 pieces verified: pointer-events: none, dynamic background images, 280x200 transparent handles correctly positioned.');

// 3. Test snap and clip-path for all 9 pieces
const successModal = mockOverlay.querySelector('#puzzle-success-modal');
if (!successModal) {
  throw new Error('Missing #puzzle-success-modal element');
}

pieces.forEach((piece, i) => {
  const cfg = PIECE_CONFIG[i];
  const handle = piece.querySelector('.puzzle-handle');
  snapAndClipPiece(piece, handle, cfg, dropZone, successModal);

  if (piece.dataset.locked !== 'true') throw new Error(`Piece ${cfg.index} not marked locked`);
  if (piece.style.left !== '0px' || piece.style.top !== '0px') {
    throw new Error(`Piece ${cfg.index} not snapped to (top: 0px, left: 0px)`);
  }
  if (piece.style.clipPath !== cfg.clip) {
    throw new Error(`Piece ${cfg.index} clipPath is "${piece.style.clipPath}", expected "${cfg.clip}"`);
  }
});
console.log('✅ All 9 pieces snapped at (0, 0) and clipped with exact inset(...) clip-paths.');

// 4. Verify completion reveal and return to game
if (!dropZone.classList.contains('all-locked')) {
  throw new Error('#drop-zone does not have all-locked class after 9 snaps');
}

const returnBtn = successModal.querySelector('#return-to-game-btn');
if (!returnBtn) throw new Error('Return to Game button not found in success modal');

// Simulate clicking Return to Game
returnBtn.dispatchEvent({ type: 'click' });
if (!gameState.isFinalPhase) {
  throw new Error('gameState.isFinalPhase was not set to true on Return to Game click');
}
if (!returnCallbackFired) {
  throw new Error('onReturnToGame callback was not invoked');
}
console.log('✅ Return to Game button correctly sets gameState.isFinalPhase = true and triggers return transition.');

console.log('\n🎉 ALL RUNTIME DOM PUZZLE TESTS PASSED WITH 100% SUCCESS!');
