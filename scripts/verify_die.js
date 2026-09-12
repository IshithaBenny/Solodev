import fs from 'fs';
import path from 'path';
import { DieState } from '../src/dieState.js';

console.log('--- Verifying 3D Die Scene & State Machine ---');
const errors = [];

// 1. Check dieState.js logic
const die = new DieState();
const initial = die.getState();

if (initial.top !== 1 || initial.bottom !== 6 || initial.north !== 2 || initial.south !== 5 || initial.east !== 3 || initial.west !== 4) {
  errors.push(`Initial dice positions incorrect: ${JSON.stringify(initial)}`);
}

// Invariants
['rollNorth', 'rollSouth', 'rollEast', 'rollWest'].forEach((method) => {
  const d = new DieState();
  d[method]();
  const s = d.getState();
  if (s.top + s.bottom !== 7) errors.push(`${method} broke top+bottom=7 invariant`);
  if (s.north + s.south !== 7) errors.push(`${method} broke north+south=7 invariant`);
  if (s.east + s.west !== 7) errors.push(`${method} broke east+west=7 invariant`);
});

// 2. Check main.js contents
const mainContent = fs.readFileSync(path.resolve('src/main.js'), 'utf8');

// GridHelper check
if (!mainContent.includes('GridHelper(10, 10')) {
  errors.push('main.js missing GridHelper(10, 10)');
}

// Invisible plane check
if (!mainContent.includes('raycastPlane') || !mainContent.includes('visible: false')) {
  errors.push('main.js missing invisible plane for raycasting');
}

// Target tile check at (2, 0, 2)
if (!mainContent.includes('targetTileMesh.position.set(2,') && !mainContent.includes('(2, 0, 2)')) {
  errors.push('main.js missing target tile at coordinate (2, 0, 2)');
}

// Die at (0, 0.5, 0)
if (!mainContent.includes('dieMesh.position.set(0, 0.5, 0)')) {
  errors.push('main.js missing 1x1x1 die at position (0, 0.5, 0)');
}

// Raycaster check
if (!mainContent.includes('THREE.Raycaster()') || !mainContent.includes('intersectObject(raycastPlane)')) {
  errors.push('main.js missing Raycaster click-to-move implementation');
}

// Adjacency check preventing diagonal and far clicks
if (!mainContent.includes('Math.abs(dx) === 1 && dz === 0') && !mainContent.includes('isAdjacent')) {
  errors.push('main.js missing adjacency check preventing diagonal and far clicks');
}

// requestAnimationFrame roll check
if (!mainContent.includes('requestAnimationFrame(animateRoll)')) {
  errors.push('main.js missing requestAnimationFrame 90-degree rolling animation');
}

// Check dieState update
if (!mainContent.includes('dieState.rollByDelta')) {
  errors.push('main.js missing dieState.rollByDelta update on roll completion');
}

if (errors.length > 0) {
  console.error('VERIFICATION FAILED:');
  errors.forEach(e => console.error('  ❌ ' + e));
  process.exit(1);
} else {
  console.log('ALL 3D DIE SCENE & STATE MACHINE CHECKS PASSED! ✅');
  process.exit(0);
}
