import './style.css';
import gameState, { recordError, checkAndPatchSavedLevel, totalLevels } from './gameState.js';
import dieState from './dieState.js';
import initPuzzle from './puzzle.js';
import * as THREE from 'three';

// Patch check: clear localStorage / reset state if saved level > 4
checkAndPatchSavedLevel();

console.log('--- SoloDev Game Engine Initializing ---');
console.log('Initial gameState:', gameState);
console.log('Initial dieState:', dieState.getState());

// ==========================================================================
// Layer Management
// ==========================================================================
const layers = {
  'start-screen': document.getElementById('start-screen'),
  'game-canvas': document.getElementById('game-canvas'),
  'error-screen': document.getElementById('error-screen'),
  'puzzle-overlay': document.getElementById('puzzle-overlay'),
  'end-screen': document.getElementById('end-screen'),
};

export function showLayer(targetLayerId) {
  Object.entries(layers).forEach(([id, element]) => {
    if (!element) return;
    if (id === targetLayerId) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  });

  if (targetLayerId === 'puzzle-overlay') {
    initPuzzle(() => {
      gameState.isFinalPhase = true;
      updateTargetDisplay();
      showLayer('game-canvas');
    });
  }

  document.querySelectorAll('.dev-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === targetLayerId);
  });
}

// ==========================================================================
// HUD Elements
// ==========================================================================
const hudDieFace = document.getElementById('hud-die-face');
const hudDiePos = document.getElementById('hud-die-pos');
const hudTargetNum = document.getElementById('hud-target-num');

/**
 * Update target display text in the DOM using dynamic gameState values
 */
export function updateTargetDisplay() {
  const currentTarget = gameState.isFinalPhase ? gameState.trueTargetNumber : gameState.fakeTargetNumber;
  const displayText = 'Target: Tile (2, 2) with [' + currentTarget + ']';
  if (hudTargetNum) {
    hudTargetNum.textContent = displayText;
  }
}

function updateHUD(x, z) {
  if (hudDieFace) hudDieFace.textContent = dieState.getTop();
  if (hudDiePos) hudDiePos.textContent = `(${x}, ${z})`;
  updateTargetDisplay();
}

// Initialize target display text in DOM on script load
updateTargetDisplay();

// ==========================================================================
// Procedural Die Textures (Standard Pips 1 through 6)
// ==========================================================================
function createDiceTexture(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Die Face Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  // Rounded Inner Border
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(7, 7, 242, 242);

  // Draw Pips
  const pipColor = number === 1 ? '#ef4444' : '#0f172a';
  ctx.fillStyle = pipColor;
  const radius = 22;

  const drawCircle = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const center = 128;
  const left = 68;
  const right = 188;
  const top = 68;
  const bottom = 188;

  switch (number) {
    case 1:
      drawCircle(center, center);
      break;
    case 2:
      drawCircle(left, top);
      drawCircle(right, bottom);
      break;
    case 3:
      drawCircle(left, top);
      drawCircle(center, center);
      drawCircle(right, bottom);
      break;
    case 4:
      drawCircle(left, top);
      drawCircle(right, top);
      drawCircle(left, bottom);
      drawCircle(right, bottom);
      break;
    case 5:
      drawCircle(left, top);
      drawCircle(right, top);
      drawCircle(center, center);
      drawCircle(left, bottom);
      drawCircle(right, bottom);
      break;
    case 6:
      drawCircle(left, top);
      drawCircle(left, center);
      drawCircle(left, bottom);
      drawCircle(right, top);
      drawCircle(right, center);
      drawCircle(right, bottom);
      break;
  }

  // Small Corner Numerals for instant clarity
  ctx.font = 'bold 24px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(number.toString(), 242, 246);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ==========================================================================
// Three.js Scene, Raycaster, & Movement System
// ==========================================================================
let scene, camera, renderer;
let dieMesh, targetTileMesh, hoverTileMesh, raycastPlane;
let threeInitialized = false;
let isRolling = false;

function initThreeScene() {
  if (threeInitialized) return;
  const container = document.getElementById('three-container');
  if (!container) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // 1. Scene & Atmosphere
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070913);
  scene.fog = new THREE.FogExp2(0x070913, 0.03);

  // 2. Camera Setup
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 8.5, 9.5);
  camera.lookAt(1, 0, 1);

  // 3. WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
  dirLight.position.set(6, 12, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  const rimLight = new THREE.PointLight(0x6366f1, 2, 25);
  rimLight.position.set(-6, 6, -6);
  scene.add(rimLight);

  // 5. 10x10 Grid (Using GridHelper)
  const gridHelper = new THREE.GridHelper(10, 10, 0x818cf8, 0x1e293b);
  gridHelper.position.set(0, 0, 0);
  scene.add(gridHelper);

  // Ground Base Board
  const groundGeo = new THREE.PlaneGeometry(10, 10);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9,
    metalness: 0.1,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.01;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Invisible plane for Raycasting
  const raycastGeo = new THREE.PlaneGeometry(10, 10);
  raycastGeo.rotateX(-Math.PI / 2);
  const raycastMat = new THREE.MeshBasicMaterial({ visible: false });
  raycastPlane = new THREE.Mesh(raycastGeo, raycastMat);
  raycastPlane.position.set(0, 0, 0);
  scene.add(raycastPlane);

  // 6. Yellow Glowing Plane at coordinate (2, 0, 2) as Target Tile
  const targetGeo = new THREE.PlaneGeometry(1, 1);
  targetGeo.rotateX(-Math.PI / 2);
  const targetMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  targetTileMesh = new THREE.Mesh(targetGeo, targetMat);
  targetTileMesh.position.set(2, 0.005, 2);
  scene.add(targetTileMesh);

  // Target Tile Border Indicator
  const targetEdgeGeo = new THREE.RingGeometry(0.48, 0.5, 4);
  targetEdgeGeo.rotateX(-Math.PI / 2);
  targetEdgeGeo.rotateY(Math.PI / 4);
  const targetEdgeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
  const targetEdge = new THREE.Mesh(targetEdgeGeo, targetEdgeMat);
  targetEdge.position.set(2, 0.008, 2);
  scene.add(targetEdge);

  // 7. Cursor Tile Hover Indicator
  const hoverGeo = new THREE.PlaneGeometry(0.96, 0.96);
  hoverGeo.rotateX(-Math.PI / 2);
  const hoverMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  hoverTileMesh = new THREE.Mesh(hoverGeo, hoverMat);
  hoverTileMesh.position.set(0, 0.006, 0);
  scene.add(hoverTileMesh);

  // 8. 1x1x1 Cube (The Die) at (0, 0.5, 0)
  // Standard dice face alignment matching pure JS state machine:
  // Face 0: Right (+X, East)  -> 3
  // Face 1: Left  (-X, West)  -> 4
  // Face 2: Top   (+Y, Up)    -> 1
  // Face 3: Bottom(-Y, Down)  -> 6
  // Face 4: Front (+Z, South) -> 5
  // Face 5: Back  (-Z, North) -> 2
  const dieMaterials = [
    new THREE.MeshStandardMaterial({ map: createDiceTexture(3), roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(4), roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(1), roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(6), roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(5), roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(2), roughness: 0.25 }),
  ];

  const dieGeo = new THREE.BoxGeometry(1, 1, 1);
  dieMesh = new THREE.Mesh(dieGeo, dieMaterials);
  dieMesh.position.set(0, 0.5, 0);
  dieMesh.castShadow = true;
  dieMesh.receiveShadow = true;
  scene.add(dieMesh);

  updateHUD(0, 0);

  // 9. Raycasting Setup for Click-to-Move & Hover
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function getIntersectedTile(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(raycastPlane);
    if (intersects.length > 0) {
      const p = intersects[0].point;
      return {
        x: Math.round(p.x),
        z: Math.round(p.z),
      };
    }
    return null;
  }

  // Pointer Move (Hover feedback)
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (isRolling) {
      hoverTileMesh.material.opacity = 0;
      return;
    }
    const tile = getIntersectedTile(e);
    if (tile && Math.abs(tile.x) <= 5 && Math.abs(tile.z) <= 5) {
      hoverTileMesh.position.set(tile.x, 0.006, tile.z);
      const currX = Math.round(dieMesh.position.x);
      const currZ = Math.round(dieMesh.position.z);
      const dx = tile.x - currX;
      const dz = tile.z - currZ;
      const isAdjacent = (Math.abs(dx) === 1 && dz === 0) || (dx === 0 && Math.abs(dz) === 1);

      if (isAdjacent) {
        hoverTileMesh.material.color.setHex(0x06b6d4); // Cyan for valid adjacent
        hoverTileMesh.material.opacity = 0.45;
      } else {
        hoverTileMesh.material.color.setHex(0x64748b); // Muted grey for non-adjacent
        hoverTileMesh.material.opacity = 0.15;
      }
    } else {
      hoverTileMesh.material.opacity = 0;
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    hoverTileMesh.material.opacity = 0;
  });

  // Pointer Click (Click-to-Move)
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (isRolling) return;
    const tile = getIntersectedTile(e);
    if (!tile) return;

    const currX = Math.round(dieMesh.position.x);
    const currZ = Math.round(dieMesh.position.z);
    const dx = tile.x - currX;
    const dz = tile.z - currZ;

    // PREVENT diagonal movement or clicking tiles far away:
    // Only allow adjacent tiles: North (0, -1), South (0, 1), East (1, 0), West (-1, 0)
    const isAdjacent = (Math.abs(dx) === 1 && dz === 0) || (dx === 0 && Math.abs(dz) === 1);

    if (!isAdjacent) {
      console.warn(`[Move Blocked] Clicked (${tile.x}, ${tile.z}) is not adjacent to die at (${currX}, ${currZ}). Only North, South, East, and West are permitted.`);
      return;
    }

    // Grid Bounds Check (-5 to +5)
    if (Math.abs(tile.x) > 5 || Math.abs(tile.z) > 5) {
      console.warn(`[Move Blocked] Target tile (${tile.x}, ${tile.z}) is outside the 10x10 board.`);
      return;
    }

    // Valid move! Execute rolling animation
    rollDie(dx, dz);
  });

  // 10. Animation Loop
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Pulse target tile glow
    if (targetTileMesh) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 3.5);
      targetTileMesh.material.emissiveIntensity = 0.6 + pulse * 0.6;
    }

    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  threeInitialized = true;
}

// ==========================================================================
// 90-Degree Edge-Tumbling Roll Animation using requestAnimationFrame
// ==========================================================================
function rollDie(dx, dz) {
  if (isRolling) return;
  isRolling = true;
  hoverTileMesh.material.opacity = 0;

  const startX = Math.round(dieMesh.position.x);
  const startZ = Math.round(dieMesh.position.z);
  const targetX = startX + dx;
  const targetZ = startZ + dz;

  // Pivot along the bottom edge touching the floor (y = 0)
  const pivot = new THREE.Vector3(
    startX + dx * 0.5,
    0,
    startZ + dz * 0.5
  );

  // Rotation axis in world coordinates
  let axis;
  if (dx === 1 && dz === 0) {
    axis = new THREE.Vector3(0, 0, -1); // East (+X)
  } else if (dx === -1 && dz === 0) {
    axis = new THREE.Vector3(0, 0, 1);  // West (-X)
  } else if (dx === 0 && dz === -1) {
    axis = new THREE.Vector3(-1, 0, 0); // North (-Z)
  } else if (dx === 0 && dz === 1) {
    axis = new THREE.Vector3(1, 0, 0);  // South (+Z)
  } else {
    isRolling = false;
    return;
  }

  const startOffset = new THREE.Vector3(-dx * 0.5, 0.5, -dz * 0.5);
  const startQuaternion = dieMesh.quaternion.clone();

  const duration = 280; // milliseconds
  const startTime = performance.now();

  function animateRoll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1.0);

    // Ease-out cubic for realistic tumble settling
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentAngle = easeProgress * (Math.PI / 2);

    // Compute rotated offset from bottom pivot
    const currentOffset = startOffset.clone().applyAxisAngle(axis, currentAngle);
    dieMesh.position.copy(pivot).add(currentOffset);

    // Incremental rotation quaternion
    const deltaQ = new THREE.Quaternion().setFromAxisAngle(axis, currentAngle);
    dieMesh.quaternion.copy(deltaQ).multiply(startQuaternion);

    if (progress < 1.0) {
      requestAnimationFrame(animateRoll);
    } else {
      // Roll complete: Snap to exact coordinates and finalize orientation
      dieMesh.position.set(targetX, 0.5, targetZ);
      const finalDeltaQ = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2);
      dieMesh.quaternion.copy(finalDeltaQ).multiply(startQuaternion);
      dieMesh.quaternion.normalize();

      // Update pure JS state machine
      dieState.rollByDelta(dx, dz);
      const topNumber = dieState.getTop();
      updateHUD(targetX, targetZ);

      console.log(`[Roll Complete] Die moved to (${targetX}, ${targetZ})`);
      console.log(`[Die State] Upward Face: [${topNumber}] | Full State:`, dieState.getState());

      // Check Win / Error Condition on Target Tile (2, 2)
      if (targetX === 2 && targetZ === 2) {
        handleTargetTileArrival(topNumber);
      }

      isRolling = false;
    }
  }

  requestAnimationFrame(animateRoll);
}

/**
 * Play a cheerful fake victory chime using Web Audio API
 */
function playFakeVictorySound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },    // C5
      { f: 659.25, d: 0.12, t: 0.11 }, // E5
      { f: 783.99, d: 0.14, t: 0.22 }, // G5
      { f: 1046.5, d: 0.35, t: 0.34 }, // C6
    ];
    notes.forEach(({ f, d, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + d);
    });
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}

/**
 * Trigger full-screen white flash
 */
function flashScreenWhite() {
  const flash = document.getElementById('white-flash');
  if (!flash) return;
  flash.classList.add('flashing');
  setTimeout(() => {
    flash.classList.remove('flashing');
  }, 120);
}

/**
 * Display the Fooled Ya notice overlay text
 */
function showFooledYaNotice() {
  const banner = document.getElementById('fooled-ya-banner');
  if (banner) {
    banner.classList.remove('hidden');
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 4500);
  }
  console.log('Fooled ya! Solve the puzzle to get the REAL number');
}

/**
 * Reset die to initial position (0, 0.5, 0) and default orientation
 */
function resetDieToStart() {
  if (!dieMesh) return;
  dieMesh.position.set(0, 0.5, 0);
  dieMesh.quaternion.set(0, 0, 0, 1);
  dieState.reset();
  updateHUD(0, 0);
  console.log('[Die Reset] Die returned to start position (0, 0.5, 0), top face: 1');
}

/**
 * Display a temporary toast notification
 */
function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('hidden');
  console.log(`[Toast Notification] ${message}`);
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2800);
}

/**
 * Check condition when die lands on target tile (2, 2)
 */
function handleTargetTileArrival(topNumber) {
  console.log(`[Target Tile Landed] Die arrived at (2, 2) with face [${topNumber}]. Evaluating game state...`);

  if (!gameState.isFinalPhase) {
    // If isFinalPhase is FALSE (Pre-puzzle):
    // Check if the die's top face equals fakeTargetNumber.
    if (topNumber !== gameState.fakeTargetNumber) {
      // If NO: Show a toast notification saying 'Wrong! Try again with ' + fakeTargetNumber.
      // Do NOT increment errorsCommitted and do NOT trigger the crash. Just let them roll again.
      console.log(`[Pre-Puzzle Failure] Landed with face [${topNumber}], expected fake target [${gameState.fakeTargetNumber}]. Letting player roll again.`);
      showToast('Wrong! Try again with ' + gameState.fakeTargetNumber);
      isRolling = false;
      return;
    }

    // If YES (they obeyed the fake instruction):
    // Increment errorsCommitted.
    recordError();
    console.log(`[Pre-Puzzle Obeyed] Errors committed: ${gameState.errorsCommitted} / maxErrors: ${gameState.maxErrors}`);

    // Trigger fake victory chime & crash visual sequence
    playFakeVictorySound();
    flashScreenWhite();
    showLayer('error-screen');

    setTimeout(() => {
      resetDieToStart();

      // If errorsCommitted >= maxErrors, trigger the fake crash sequence transition to puzzle.
      if (gameState.errorsCommitted >= gameState.maxErrors) {
        console.log("Max errors reached! Transitioning to #puzzle-overlay.");
        showFooledYaNotice();
        showLayer('puzzle-overlay');
      } else {
        // Return to game canvas for another attempt
        showLayer('game-canvas');
      }

      isRolling = false;
    }, 2000);
  } else {
    // If isFinalPhase is TRUE (Post-puzzle):
    // Check if the die's top face equals trueTargetNumber.
    const currentTop = dieState.getTop();
    if (currentTop === gameState.trueTargetNumber) {
      console.log(`🎉 Target tile reached in final phase with true target face [${gameState.trueTargetNumber}]! VICTORY!`);
      // If YES: Trigger the final win sequence and show the certificate download.
      showLayer('end-screen');
      isRolling = false;
    } else {
      console.warn(`[Final Phase Failure] Landed with face [${currentTop}], but true target is [${gameState.trueTargetNumber}].`);
      // If NO: Show a toast saying 'Wrong! It needs to be ' + trueTargetNumber.
      showToast('Wrong! It needs to be ' + gameState.trueTargetNumber);
      isRolling = false;
    }
  }
}

// ==========================================================================
// Event Listeners & Bootstrapping
// ==========================================================================

// 'Start Game' button hides #start-screen and shows #game-canvas
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    console.log('[Event] Start Game clicked.');
    showLayer('game-canvas');
    initThreeScene();
  });
}

// Dev Preview Buttons (Bottom Right Layer Switcher)
document.querySelectorAll('.dev-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    showLayer(target);
    if (target === 'game-canvas') {
      initThreeScene();
    }
  });
});

// Expose state and controls globally for console inspection
window.__SOLODEV_GAME_STATE__ = gameState;
window.__SOLODEV_DIE_STATE__ = dieState;
window.__SOLODEV_ROLL__ = rollDie;
window.__SOLODEV_SHOW_LAYER__ = showLayer;
window.__SOLODEV_HANDLE_TARGET_ARRIVAL__ = handleTargetTileArrival;
window.__SOLODEV_RESET_DIE__ = resetDieToStart;
window.__SOLODEV_SHOW_TOAST__ = showToast;
window.__SOLODEV_UPDATE_TARGET_DISPLAY__ = updateTargetDisplay;
