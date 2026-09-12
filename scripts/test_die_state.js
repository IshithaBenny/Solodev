import { DieState } from '../src/dieState.js';

const die = new DieState();

function checkInvariants(d, step) {
  if (d.top + d.bottom !== 7) throw new Error(`${step}: top(${d.top}) + bottom(${d.bottom}) !== 7`);
  if (d.north + d.south !== 7) throw new Error(`${step}: north(${d.north}) + south(${d.south}) !== 7`);
  if (d.east + d.west !== 7) throw new Error(`${step}: east(${d.east}) + west(${d.west}) !== 7`);
}

checkInvariants(die, 'initial');
console.log('Initial state:', die.getState());

// Roll North 4 times (full 360 loop)
die.rollNorth();
checkInvariants(die, 'North 1');
console.log('After rollNorth 1:', die.getState());
if (die.top !== 5 || die.north !== 1) throw new Error('Incorrect rollNorth');

die.rollNorth();
die.rollNorth();
die.rollNorth();
checkInvariants(die, 'North 4');
if (die.top !== 1 || die.north !== 2) throw new Error('rollNorth 4x did not return to origin');

// Roll East 4 times (full 360 loop)
die.rollEast();
checkInvariants(die, 'East 1');
console.log('After rollEast 1:', die.getState());
if (die.top !== 4 || die.east !== 1) throw new Error('Incorrect rollEast');

die.rollEast();
die.rollEast();
die.rollEast();
checkInvariants(die, 'East 4');
if (die.top !== 1 || die.east !== 3) throw new Error('rollEast 4x did not return to origin');

console.log('DieState validation passed with 100% mathematical accuracy! ✅');
