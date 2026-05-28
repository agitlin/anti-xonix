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
    this.resetRoundStats();
    this.resetLevel();
  }

  nextLevel() {
    this.level++;
    this.lives++;
    this.resetRoundStats();
    this.resetLevel();
  }

  resetRoundStats() {
    this.roundStats = {
      powerups: {},
      areaCaptured: 0,
      enemiesEliminated: {}
    };
  }

  resetLevel() {
    this.gridWidth = 40 + (this.level - 1) * 4;
    this.gridHeight = 40 + (this.level % 2 === 0 ? 8 : 2);
    this.grid = [];
    this.enemies = [];
    this.greyEnemies = [];
    this.bitingEnemies = [];
    this.eatingEnemies = [];
    this.player = null;
    this.gameOver = false;
    this.gameWon = false;
    this.inCollisionPause = false;
    this.inIntro = true;
    this.impactPoint = null;
    this.powerUps = [];
    this.powerUpSpawnTimer = 0;
    this.activePowerUps = {
      enemySlow: 0,
      playerSpeed: 0,
      playerX2: 0,
      playerFreeze: 0,
      frozenEnemy: null,
      heartPopup: 0
    };
    
    // Initialize grid
    for (let y = 0; y < this.gridHeight; y++) {
      let row = [];
      for (let x = 0; x < this.gridWidth; x++) {
        if (x < BORDER_THICKNESS || x >= this.gridWidth - BORDER_THICKNESS ||
            y < BORDER_THICKNESS || y >= this.gridHeight - BORDER_THICKNESS) {
          row.push(CELL_FILLED);
        } else {
          row.push(CELL_EMPTY);
        }
      }
      this.grid.push(row);
    }

    if (this.level >= 2) {
      this.generateCenterShape();
    }
  }

  generateCenterShape() {
    const shapes = [
      [
        "  XX  XX  ",
        " XXXXXXXX ",
        "XXXXXXXXXX",
        " XXXXXXXX ",
        "  XXXXXX  ",
        "   XXXX   ",
        "    XX    "
      ],
      [
        "X    X XXX",
        "X    X  X ",
        "XXXXXX  X ",
        "X    X  X ",
        "X    X XXX"
      ],
      [
        "  XXXXXX  ",
        " XX    XX ",
        "X X    X X",
        "X        X",
        "X X    X X",
        " XX    XX ",
        "  XXXXXX  "
      ]
    ];
    let shape = shapes[Math.floor(Math.random() * shapes.length)];
    let shapeWidth = shape[0].length;
    let shapeHeight = shape.length;
    let startX = Math.floor((this.gridWidth - shapeWidth) / 2);
    let startY = Math.floor((this.gridHeight - shapeHeight) / 2);
    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        if (shape[y][x] !== ' ') {
          this.setCell(startX + x, startY + y, CELL_FILLED);
        }
      }
    }
  }

  getCell(x, y) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return CELL_FILLED;
    return this.grid[y][x];
  }

  setCell(x, y, value) {
    if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
      this.grid[y][x] = value;
    }
  }

  captureArea() {
    // 1. Convert all TRAIL to FILLED
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x] === CELL_TRAIL) {
          this.grid[y][x] = CELL_FILLED;
          this.score += 10;
          this.roundStats.areaCaptured++;
        }
      }
    }

    // 2. Flood Fill to find empty areas containing enemies
    let visited = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(false));
    let enemyCells = new Set();
    
    this.enemies.forEach(e => {
       const ex = Math.floor(e.x + 0.5); // Center of the enemy
       const ey = Math.floor(e.y + 0.5);
       if(ex >= 0 && ex < this.gridWidth && ey >=0 && ey < this.gridHeight) {
           enemyCells.add(`${ex},${ey}`);
       }
    });

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
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
              if (n.x >= 0 && n.x < this.gridWidth && n.y >= 0 && n.y < this.gridHeight) {
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
              this.roundStats.areaCaptured++;
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
    
    // Clear active power-up states on death
    this.activePowerUps = {
      enemySlow: 0,
      playerSpeed: 0,
      playerX2: 0,
      playerFreeze: 0,
      heartPopup: 0
    };
    this.powerUps = [];
    
    this.resetRoundStats();
    
    if (this.lives <= 0) {
      this.gameOver = true;
    } else {
      // clear trail
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          if (this.grid[y][x] === CELL_TRAIL) {
            this.grid[y][x] = CELL_EMPTY;
          }
        }
      }
      if (this.player) {
         this.player.resetPosition();

         // Move grey enemies away from player spawn to prevent instant death
         const SAFE_DISTANCE = 10;
         for (let enemy of this.greyEnemies) {
           let dx = enemy.x - this.player.x;
           let dy = enemy.y - this.player.y;
           let dist = Math.sqrt(dx * dx + dy * dy);
           
           if (dist < SAFE_DISTANCE) {
             let safeSpots = [];
             for (let y = 0; y < this.gridHeight; y++) {
               for (let x = 0; x < this.gridWidth; x++) {
                 if (this.grid[y][x] === CELL_FILLED) {
                   let sdx = x + 0.5 - this.player.x;
                   let sdy = y + 0.5 - this.player.y;
                   let sdist = Math.sqrt(sdx * sdx + sdy * sdy);
                   if (sdist >= SAFE_DISTANCE) {
                     safeSpots.push({ x: x + 0.5, y: y + 0.5 });
                   }
                 }
               }
             }
             if (safeSpots.length > 0) {
               let spot = safeSpots[Math.floor(Math.random() * safeSpots.length)];
               enemy.x = spot.x;
               enemy.y = spot.y;
             }
           }
         }
      }
    }
  }

  calculateProgress() {
    let totalEmpty = (this.gridWidth - BORDER_THICKNESS*2) * (this.gridHeight - BORDER_THICKNESS*2);
    let filledCount = 0;
    for(let y=BORDER_THICKNESS; y<this.gridHeight-BORDER_THICKNESS; y++) {
      for(let x=BORDER_THICKNESS; x<this.gridWidth-BORDER_THICKNESS; x++) {
        if(this.grid[y][x] === CELL_FILLED) {
          filledCount++;
        }
      }
    }
    return Math.min(100, Math.floor((filledCount / totalEmpty) * 100));
  }

  updatePowerUps(dt) {
    if (this.gameOver || this.gameWon || this.inCollisionPause) return;

    // 1. Tick down active power-ups
    if (this.activePowerUps.enemySlow > 0) {
      this.activePowerUps.enemySlow = Math.max(0, this.activePowerUps.enemySlow - dt);
    }
    if (this.activePowerUps.playerSpeed > 0) {
      this.activePowerUps.playerSpeed = Math.max(0, this.activePowerUps.playerSpeed - dt);
    }
    if (this.activePowerUps.playerX2 > 0) {
      this.activePowerUps.playerX2 = Math.max(0, this.activePowerUps.playerX2 - dt);
    }

    if (this.activePowerUps.playerFreeze > 0) {
      this.activePowerUps.playerFreeze = Math.max(0, this.activePowerUps.playerFreeze - dt);
      if (this.activePowerUps.playerFreeze === 0) {
        this.activePowerUps.frozenEnemy = null;
      }
    }
    if (this.activePowerUps.heartPopup > 0) {
      this.activePowerUps.heartPopup = Math.max(0, this.activePowerUps.heartPopup - dt);
    }

    // 2. Tick down floating chests on board and despawn expired ones
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      this.powerUps[i].timer -= dt;
      if (this.powerUps[i].timer <= 0) {
        this.powerUps.splice(i, 1);
      }
    }

    // 3. Spawning timer
    this.powerUpSpawnTimer += dt;
    if (this.powerUpSpawnTimer >= 4) { // spawn check every 4 seconds
      this.powerUpSpawnTimer = 0;
      if (this.powerUps.length < 5) { // max 5
        this.spawnPowerUp();
      }
    }
  }

  spawnPowerUp() {
    // Gather all empty grid cell coordinates
    let emptyCells = [];
    for (let y = BORDER_THICKNESS; y < this.gridHeight - BORDER_THICKNESS; y++) {
      for (let x = BORDER_THICKNESS; x < this.gridWidth - BORDER_THICKNESS; x++) {
        if (this.grid[y][x] === CELL_EMPTY) {
          // Check if there's already a power-up here
          let occupied = this.powerUps.some(p => p.x === x && p.y === y);
          if (!occupied) {
            emptyCells.push({ x, y });
          }
        }
      }
    }

    if (emptyCells.length > 0) {
      let cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      let types = ['S', 'A', 'Heart', 'x2', 'Freeze'];
      let type = types[Math.floor(Math.random() * types.length)];
      this.powerUps.push({
        x: cell.x,
        y: cell.y,
        type: type,
        timer: 15 // despawns in 15 seconds
      });
    }
  }

  checkPowerUpCollections(cells) {
    for (let cell of cells) {
      let idx = this.powerUps.findIndex(p => p.x === cell.x && p.y === cell.y);
      if (idx !== -1) {
        let p = this.powerUps[idx];
        this.powerUps.splice(idx, 1);
        this.collectPowerUp(p);
      }
    }
  }

  collectPowerUp(p) {
    this.roundStats.powerups[p.type] = (this.roundStats.powerups[p.type] || 0) + 1;
    
    if (p.type === 'Heart') {
      this.lives++;
      this.activePowerUps.heartPopup = 3;
    } else if (p.type === 'S') {
      this.activePowerUps.enemySlow = 40;
    } else if (p.type === 'A') {
      this.activePowerUps.playerSpeed = 40;
    } else if (p.type === 'x2') {
      this.activePowerUps.playerX2 = 40;
    } else if (p.type === 'Freeze') {
        this.activePowerUps.playerFreeze = 40; // 40 seconds
        let allEnemies = [...this.enemies, ...this.greyEnemies, ...this.bitingEnemies];
        if (this.eatingEnemies) allEnemies.push(...this.eatingEnemies);
        if (allEnemies.length > 0) {
          this.activePowerUps.frozenEnemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
        }
    }
  }
}
