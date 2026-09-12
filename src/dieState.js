/**
 * dieState.js
 * Pure JS state machine tracking the 6 faces of a standard 6-sided die:
 * top, bottom, north, south, east, west.
 * Opposite sides always sum to 7.
 */

export class DieState {
  constructor() {
    this.reset();
  }

  reset() {
    // Standard dice arrangement:
    // Top = 1, Bottom = 6 (1 + 6 = 7)
    // North = 2, South = 5 (2 + 5 = 7)
    // East = 3, West = 4  (3 + 4 = 7)
    this.top = 1;
    this.bottom = 6;
    this.north = 2;
    this.south = 5;
    this.east = 3;
    this.west = 4;
    return this;
  }

  /**
   * Roll North (-Z, forward)
   */
  rollNorth() {
    const prevTop = this.top;
    this.top = this.south;
    this.south = this.bottom;
    this.bottom = this.north;
    this.north = prevTop;
    return this.getState();
  }

  /**
   * Roll South (+Z, backward)
   */
  rollSouth() {
    const prevTop = this.top;
    this.top = this.north;
    this.north = this.bottom;
    this.bottom = this.south;
    this.south = prevTop;
    return this.getState();
  }

  /**
   * Roll East (+X, right)
   */
  rollEast() {
    const prevTop = this.top;
    this.top = this.west;
    this.west = this.bottom;
    this.bottom = this.east;
    this.east = prevTop;
    return this.getState();
  }

  /**
   * Roll West (-X, left)
   */
  rollWest() {
    const prevTop = this.top;
    this.top = this.east;
    this.east = this.bottom;
    this.bottom = this.west;
    this.west = prevTop;
    return this.getState();
  }

  /**
   * Roll by delta coordinate (dx, dz)
   * @param {number} dx - -1, 0, or 1
   * @param {number} dz - -1, 0, or 1
   */
  rollByDelta(dx, dz) {
    if (dx === 0 && dz === -1) {
      return this.rollNorth();
    } else if (dx === 0 && dz === 1) {
      return this.rollSouth();
    } else if (dx === 1 && dz === 0) {
      return this.rollEast();
    } else if (dx === -1 && dz === 0) {
      return this.rollWest();
    }
    throw new Error(`Invalid roll delta: dx=${dx}, dz=${dz}`);
  }

  /**
   * Get immutable snapshot of current faces
   */
  getState() {
    return {
      top: this.top,
      bottom: this.bottom,
      north: this.north,
      south: this.south,
      east: this.east,
      west: this.west,
    };
  }

  getTop() {
    return this.top;
  }
}

export const dieState = new DieState();
export default dieState;
