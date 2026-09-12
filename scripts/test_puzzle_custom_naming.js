import fs from 'fs';
import path from 'path';
import { getPuzzlePieceSrc } from '../src/puzzle.js';

console.log('--- Testing Puzzle Custom Naming Convention ---');

const errors = [];

// 1. Test getPuzzlePieceSrc for memes 1, 3, 5
for (let i = 1; i <= 9; i++) {
  const meme1Src = getPuzzlePieceSrc(1, i);
  const expected1 = `/meme1/piece${i}.png`;
  if (meme1Src !== expected1) {
    errors.push(`Meme 1 piece ${i}: expected "${expected1}", got "${meme1Src}"`);
  }

  const meme3Src = getPuzzlePieceSrc(3, i);
  const expected3 = `/meme3/3piece${i}.png`;
  if (meme3Src !== expected3) {
    errors.push(`Meme 3 piece ${i}: expected "${expected3}", got "${meme3Src}"`);
  }

  const meme5Src = getPuzzlePieceSrc(5, i);
  const expected5 = `/meme5/5piece${i}.png`;
  if (meme5Src !== expected5) {
    errors.push(`Meme 5 piece ${i}: expected "${expected5}", got "${meme5Src}"`);
  }
}

// 2. Verify all files actually exist on disk in public directory
for (const memeId of [1, 3, 5]) {
  for (let i = 1; i <= 9; i++) {
    const relPath = getPuzzlePieceSrc(memeId, i).replace(/^\//, '');
    const fullPath = path.resolve('public', relPath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Physical asset missing: ${fullPath}`);
    }
  }
}

if (errors.length > 0) {
  console.error('\n❌ CUSTOM NAMING TESTS FAILED:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('✅ getPuzzlePieceSrc properly constructs:');
  console.log('   - Meme 1 (ternary exception): /meme1/piece[1-9].png');
  console.log('   - Meme 3: /meme3/3piece[1-9].png');
  console.log('   - Meme 5: /meme5/5piece[1-9].png');
  console.log('✅ All 27 physical assets exist on disk in public/');
  console.log('\n🎉 ALL CUSTOM NAMING PUZZLE TESTS PASSED!');
  process.exit(0);
}
