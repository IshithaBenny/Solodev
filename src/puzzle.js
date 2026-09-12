/**
 * puzzle.js
 * Logic for #puzzle-overlay 2D drag-and-drop puzzle.
 * - Dynamic asset routing using activeMemeFolder from gameState.js
 * - Background image of #drop-zone set to ${activeMemeFolder}/stencil.png (840x600)
 * - 9 individual cropped piece divs (280x200), directly draggable
 * - Standard pointer events drag-and-drop
 * - Snap logic: when dropped within 40px of original 3x3 position on #drop-zone grid,
 *   snaps piece to (cfg.left, cfg.top) and locks it
 * - When all 9 are locked, reveals full meme, shows 'Yas diva ur halfway there!', and 'Return to Game' button
 */

import gameState, { activeMeme, activeMemeFolder, checkAndPatchSavedLevel, totalLevels } from './gameState.js';

const TOTAL_PIECES = 9;

/**
 * Dynamic image path format:
 * /meme${activeMeme}/${activeMeme}piece${index}.png
 * With ternary operator for meme1 exception:
 * activeMeme === 1 ? `/meme1/piece${index}.png` : `/meme${activeMeme}/${activeMeme}piece${index}.png`
 */
export function getPuzzlePieceSrc(memeNum, pieceIndex) {
  return memeNum === 1
    ? `/meme1/piece${pieceIndex}.png`
    : `/meme${memeNum}/${memeNum}piece${pieceIndex}.png`;
}

// 3x3 Grid Specifications for 840x600 Canvas (each tile 280x200)
export const PIECE_CONFIG = [
  { index: 1, row: 0, col: 0, top: 0, left: 0 },
  { index: 2, row: 0, col: 1, top: 0, left: 280 },
  { index: 3, row: 0, col: 2, top: 0, left: 560 },
  { index: 4, row: 1, col: 0, top: 200, left: 0 },
  { index: 5, row: 1, col: 1, top: 200, left: 280 },
  { index: 6, row: 1, col: 2, top: 200, left: 560 },
  { index: 7, row: 2, col: 0, top: 400, left: 0 },
  { index: 8, row: 2, col: 1, top: 400, left: 280 },
  { index: 9, row: 2, col: 2, top: 400, left: 560 },
];

let lockedCount = 0;

export function initPuzzle(onReturnToGame) {
  const overlay = document.getElementById('puzzle-overlay');
  if (!overlay) {
    console.error('Missing #puzzle-overlay element');
    return;
  }

  // Clear previous puzzle markup
  overlay.innerHTML = '';
  lockedCount = 0;

  // Run patch to verify localStorage and state are capped at 4
  if (typeof checkAndPatchSavedLevel === 'function') {
    checkAndPatchSavedLevel();
  }

  // Resolve active meme dynamically from gameState (strictly [1, 3, 5])
  const validMemes = (gameState.availableMemes && gameState.availableMemes.length > 0) ? gameState.availableMemes : [1, 3, 5];
  let currentActiveMeme = activeMeme || gameState.activeMeme;
  if (!currentActiveMeme || !validMemes.includes(currentActiveMeme)) {
    let folder = activeMemeFolder || gameState.activeMemeFolder || 'meme1';
    let folderNum = parseInt(folder.replace(/\D/g, ''), 10) || 1;
    currentActiveMeme = validMemes.includes(folderNum) ? folderNum : validMemes[0];
  }
  const activeFolder = `meme${currentActiveMeme}`;
  console.log(`[Puzzle Init] Using dynamic activeMemeFolder: "${activeFolder}" (activeMeme: ${currentActiveMeme})`);

  // 1. Alert Banner at top
  const alertBox = document.createElement('div');
  alertBox.className = 'puzzle-alert-box';
  alertBox.id = 'puzzle-alert-box';
  alertBox.innerHTML = `
    <span class="alert-icon">⚠️</span>
    <span class="alert-text">Fooled ya! Solve the puzzle to get the REAL number</span>
  `;
  overlay.appendChild(alertBox);

  // 2. Drop Zone (#drop-zone) centered with ${activeFolder}/stencil.png
  const dropZone = document.createElement('div');
  dropZone.id = 'drop-zone';
  dropZone.className = 'drop-zone';
  dropZone.style.backgroundImage = `url('${activeFolder}/stencil.png')`;
  overlay.appendChild(dropZone);

  // 3. Completion Success Modal (Hidden initially)
  const successModal = document.createElement('div');
  successModal.id = 'puzzle-success-modal';
  successModal.className = 'puzzle-success-modal hidden';
  const revealedMemeSrc = getPuzzlePieceSrc(currentActiveMeme, 9);
  successModal.innerHTML = `
    <div class="success-card glass-panel">
      <div class="diva-badge">✨ PROGRESS UNLOCKED ✨</div>
      <h2 class="diva-title">Yas diva ur halfway there!</h2>
      <div class="full-meme-preview" id="full-meme-preview">
        <img src="${revealedMemeSrc}" alt="Full Meme Revealed" class="revealed-meme-img" />
      </div>
      <button id="return-to-game-btn" class="action-btn glow-btn" type="button">
        <span>Return to Game</span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `;
  overlay.appendChild(successModal);

  // Hook Return to Game button
  const returnBtn = successModal.querySelector('#return-to-game-btn');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      console.log("[Puzzle] Return to Game clicked. Setting isFinalPhase = true.");
      gameState.isFinalPhase = true;
      if (typeof onReturnToGame === 'function') {
        onReturnToGame();
      } else {
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
          overlay.classList.add('hidden');
          gameCanvas.classList.remove('hidden');
        }
      }
    });
  }

  // 4. Generate 9 directly draggable piece divs and scatter them randomly
  setupDraggablePieces(overlay, dropZone, successModal, activeFolder, currentActiveMeme);
}

/**
 * Generate 9 piece divs (280x200), scatter them, and attach drag-and-drop
 */
function setupDraggablePieces(overlay, dropZone, successModal, activeFolder, currentActiveMeme) {
  const pieceWidth = 280;
  const pieceHeight = 200;

  // Window bounds for scattering
  const maxLeft = Math.max(20, (typeof window !== 'undefined' ? window.innerWidth : 1200) - pieceWidth - 20);
  const maxTop = Math.max(40, (typeof window !== 'undefined' ? window.innerHeight : 800) - pieceHeight - 20);

  PIECE_CONFIG.forEach((cfg) => {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.id = `puzzle-piece-${cfg.index}`;
    piece.dataset.pieceIndex = cfg.index;
    piece.dataset.locked = 'false';

    piece.style.width = `${pieceWidth}px`;
    piece.style.height = `${pieceHeight}px`;

    // Dynamic image src format: /meme${activeMeme}/${activeMeme}piece${index}.png
    // With ternary operator for meme1: activeMeme === 1 ? `/meme1/piece${index}.png` : `/meme${activeMeme}/${activeMeme}piece${index}.png`
    const pieceSrc = getPuzzlePieceSrc(currentActiveMeme, cfg.index);
    piece.style.backgroundImage = `url('${pieceSrc}')`;
    piece.style.backgroundSize = '100% 100%';
    piece.style.backgroundRepeat = 'no-repeat';
    piece.style.position = 'absolute';
    piece.style.cursor = 'grab';
    piece.style.pointerEvents = 'auto'; // directly draggable!

    // Scatter randomly around window bounds
    let randomLeft, randomTop, distToDrop;
    let attempts = 0;
    do {
      randomLeft = Math.floor(Math.random() * maxLeft);
      randomTop = Math.floor(Math.random() * maxTop);
      const dx = randomLeft - (dropZone.offsetLeft || 0);
      const dy = randomTop - (dropZone.offsetTop || 0);
      distToDrop = Math.hypot(dx, dy);
      attempts++;
    } while (distToDrop < 140 && attempts < 25);

    piece.style.left = `${randomLeft}px`;
    piece.style.top = `${randomTop}px`;
    piece.style.zIndex = 100 + cfg.index;

    // Attach direct pointer events for dragging
    attachPieceDrag(piece, cfg, dropZone, successModal);

    overlay.appendChild(piece);
  });
}

/**
 * Direct drag-and-drop handling for each puzzle piece
 */
function attachPieceDrag(piece, cfg, dropZone, successModal) {
  let isDragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startPieceLeft = 0;
  let startPieceTop = 0;

  piece.addEventListener('pointerdown', (e) => {
    if (piece.dataset.locked === 'true') return;

    isDragging = true;
    piece.setPointerCapture(e.pointerId);
    piece.style.cursor = 'grabbing';
    piece.classList.add('dragging');
    piece.style.zIndex = 500; // Bring to front while dragging

    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startPieceLeft = piece.offsetLeft;
    startPieceTop = piece.offsetTop;

    e.preventDefault();
  });

  piece.addEventListener('pointermove', (e) => {
    if (!isDragging || piece.dataset.locked === 'true') return;

    const deltaX = e.clientX - startPointerX;
    const deltaY = e.clientY - startPointerY;

    piece.style.left = `${startPieceLeft + deltaX}px`;
    piece.style.top = `${startPieceTop + deltaY}px`;

    // Calculate proximity to its correct 3x3 drop-zone grid slot
    const dropRect = dropZone.getBoundingClientRect();
    const pieceRect = piece.getBoundingClientRect();
    const targetLeft = dropRect.left + cfg.left;
    const targetTop = dropRect.top + cfg.top;

    const dist = Math.hypot(pieceRect.left - targetLeft, pieceRect.top - targetTop);

    if (dist < 40) {
      piece.classList.add('snap-ready');
      dropZone.classList.add('snap-ready');
    } else {
      piece.classList.remove('snap-ready');
      dropZone.classList.remove('snap-ready');
    }
  });

  const onPointerUp = (e) => {
    if (!isDragging || piece.dataset.locked === 'true') return;
    isDragging = false;
    piece.style.cursor = 'grab';
    piece.classList.remove('dragging');
    piece.classList.remove('snap-ready');
    dropZone.classList.remove('snap-ready');

    try {
      piece.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Snap Check: distance to correct 3x3 slot on #drop-zone grid
    const dropRect = dropZone.getBoundingClientRect();
    const pieceRect = piece.getBoundingClientRect();
    const targetLeft = dropRect.left + cfg.left;
    const targetTop = dropRect.top + cfg.top;

    const distance = Math.hypot(pieceRect.left - targetLeft, pieceRect.top - targetTop);

    console.log(`[Piece ${cfg.index}] Distance to target grid slot (${cfg.left}, ${cfg.top}): ${distance.toFixed(1)}px (Threshold: 40px)`);

    if (distance < 40) {
      snapPiece(piece, cfg, dropZone, successModal);
    } else {
      piece.style.zIndex = 100 + cfg.index;
    }
  };

  piece.addEventListener('pointerup', onPointerUp);
  piece.addEventListener('pointercancel', onPointerUp);
}

/**
 * Snap piece into #drop-zone at its exact 3x3 grid position and lock it
 */
export function snapPiece(piece, cfg, dropZone, successModal) {
  piece.dataset.locked = 'true';
  piece.classList.add('locked');
  piece.classList.remove('dragging', 'snap-ready');
  piece.style.cursor = 'default';
  piece.style.pointerEvents = 'none'; // Locked piece no longer draggable

  // Snap directly to #drop-zone grid location
  dropZone.appendChild(piece);
  piece.style.left = `${cfg.left}px`;
  piece.style.top = `${cfg.top}px`;
  piece.style.zIndex = 10 + cfg.index;

  lockedCount++;
  console.log(`[Puzzle Locked] Piece ${cfg.index} snapped at (${cfg.left}px, ${cfg.top}px) (${lockedCount}/${TOTAL_PIECES})`);

  // Once all 9 pieces are snapped, complete image forms and triggers reveal
  if (lockedCount >= TOTAL_PIECES) {
    onAllPiecesLocked(dropZone, successModal);
  }
}

/**
 * When all 9 pieces are locked, display overlay text 'Yas diva ur halfway there!',
 * reveal full meme image, and show 'Return to Game' button.
 */
export function onAllPiecesLocked(dropZone, successModal) {
  console.log("🎉 All 9 pieces locked! Complete image assembled. Revealing 'Yas diva ur halfway there!'");
  dropZone.classList.add('all-locked');

  setTimeout(() => {
    successModal.classList.remove('hidden');
  }, 450);
}

if (typeof window !== 'undefined') {
  window.__SOLODEV_PUZZLE__ = {
    PIECE_CONFIG,
    initPuzzle,
    snapPiece,
    onAllPiecesLocked,
    getLockedCount: () => lockedCount,
    TOTAL_PIECES,
  };
}

export default initPuzzle;
