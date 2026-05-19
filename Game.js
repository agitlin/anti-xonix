export const GRID_SIZE = 40;
export const BORDER_THICKNESS = 2;

export const CELL_EMPTY = 0;
export const CELL_FILLED = 1;
export const CELL_TRAIL = 2;

export class Game {
  constructor() {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.resetLevel();
  }

  fullReset() {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.resetLevel();
  }

  nextLevel() {
    this.level++;
    this.resetLevel();
  }

  resetLevel() {
    this.grid = [];
    this.enemies = [];
    this.greyEnemies = [];
    this.player = null;
    this.gameOver = false;
    this.gameWon = false;
    this.inCollisionPause = false;
    this.impactPoint = null;
    
    // Initialize grid
    for (let y = 0; y < GRID_SIZE; y++) {
      let row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        if (x < BORDER_THICKNESS || x >= GRID_SIZE - BORDER_THICKNESS ||
            y < BORDER_THICKNESS || y >= GRID_SIZE - BORDER_THICKNESS) {
          row.push(CELL_FILLED);
        } else {
          row.push(CELL_EMPTY);
        }
      }
      this.grid.push(row);
    }
  }

  getCell(x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return CELL_FILLED;
    return this.grid[y][x];
  }

  setCell(x, y, value) {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      this.grid[y][x] = value;
    }
  }

  captureArea() {
    // 1. Convert all TRAIL to FILLED
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === CELL_TRAIL) {
          this.grid[y][x] = CELL_FILLED;
          this.score += 10;
        }
      }
    }

    // 2. Flood Fill to find empty areas containing enemies
    let visited = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    let enemyCells = new Set();
    
    this.enemies.forEach(e => {
       const ex = Math.floor(e.x + 0.5); // Center of the enemy
       const ey = Math.floor(e.y + 0.5);
       if(ex >= 0 && ex < GRID_SIZE && ey >=0 && ey < GRID_SIZE) {
           enemyCells.add(`${ex},${ey}`);
       }
    });

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === CELL_EMPTY && !visited[y][x]) {
          let region = [];
          let queue = [{x, y}];
          visited[y][x] = true;
          let hasEnemy = false;

          while (queue.length > 0) {
            let p = queue.shift();
            region.push(p);

            // Using a slightly wider check for enemies to be safe
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (enemyCells.has(`${p.x + dx},${p.y + dy}`)) {
                  hasEnemy = true;
                }
              }
            }

            const neighbors = [
              {x: p.x + 1, y: p.y}, {x: p.x - 1, y: p.y},
              {x: p.x, y: p.y + 1}, {x: p.x, y: p.y - 1}
            ];

            for (let n of neighbors) {
              if (n.x >= 0 && n.x < GRID_SIZE && n.y >= 0 && n.y < GRID_SIZE) {
                if (this.grid[n.y][n.x] === CELL_EMPTY && !visited[n.y][n.x]) {
                  visited[n.y][n.x] = true;
                  queue.push(n);
                }
              }
            }
          }

          if (!hasEnemy) {
            for (let p of region) {
              this.grid[p.y][p.x] = CELL_FILLED;
              this.score += 50; // more score for capturing empty areas
            }
          }
        }
      }
    }

    if (this.calculateProgress() >= 90) {
      this.gameWon = true;
    }
  }

  loseLife(x = 0, y = 0) {
    if (this.inCollisionPause) return; // Prevent multiple collisions triggering at once
    this.inCollisionPause = true;
    this.impactPoint = { x, y };
  }

  resumeFromCollision() {
    this.inCollisionPause = false;
    this.impactPoint = null;
    this.lives--;
    
    if (this.lives <= 0) {
      this.gameOver = true;
    } else {
      // clear trail
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (this.grid[y][x] === CELL_TRAIL) {
            this.grid[y][x] = CELL_EMPTY;
          }
        }
      }
      if (this.player) {
         this.player.resetPosition();
      }
    }
  }

  calculateProgress() {
    let totalEmpty = (GRID_SIZE - BORDER_THICKNESS*2) * (GRID_SIZE - BORDER_THICKNESS*2);
    let filledCount = 0;
    for(let y=BORDER_THICKNESS; y<GRID_SIZE-BORDER_THICKNESS; y++) {
      for(let x=BORDER_THICKNESS; x<GRID_SIZE-BORDER_THICKNESS; x++) {
        if(this.grid[y][x] === CELL_FILLED) {
          filledCount++;
        }
      }
    }
    return Math.min(100, Math.floor((filledCount / totalEmpty) * 100));
  }
}
