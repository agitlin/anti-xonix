import { GRID_SIZE, CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.speed = 10;
    this.resetPosition();
    this.direction = { x: 0, y: 0 };
    this.nextDirection = { x: 0, y: 0 };
    
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w': this.nextDirection = { x: 0, y: -1 }; break;
        case 'ArrowDown':
        case 's': this.nextDirection = { x: 0, y: 1 }; break;
        case 'ArrowLeft':
        case 'a': this.nextDirection = { x: -1, y: 0 }; break;
        case 'ArrowRight':
        case 'd': this.nextDirection = { x: 1, y: 0 }; break;
      }
    });
  }

  resetPosition() {
    this.x = Math.floor(GRID_SIZE / 2) + 0.5;
    this.y = 1.5; // Near top border
    this.direction = { x: 0, y: 0 };
    this.nextDirection = { x: 0, y: 0 };
    this.isDrawing = false;
    this.recentTrailCells = [];
  }

  getSpeed() {
    if (this.game.activePowerUps && this.game.activePowerUps.playerSpeed > 0) {
      return 18;
    }
    return 10;
  }

  getFootprint(gridX, gridY) {
    let cells = [{ x: gridX, y: gridY }];
    if (this.game.activePowerUps && this.game.activePowerUps.playerX2 > 0) {
      let x2 = Math.min(GRID_SIZE - 1, gridX + 1);
      let y2 = Math.min(GRID_SIZE - 1, gridY + 1);
      if (x2 !== gridX) cells.push({ x: x2, y: gridY });
      if (y2 !== gridY) cells.push({ x: gridX, y: y2 });
      if (x2 !== gridX && y2 !== gridY) cells.push({ x: x2, y: y2 });
    }
    return cells;
  }

  update(dt) {
    if (this.game.gameOver) return;

    if (this.nextDirection.x !== 0 || this.nextDirection.y !== 0) {
      if (this.direction.x !== this.nextDirection.x || this.direction.y !== this.nextDirection.y) {
        // Prevent 180 degree turns unless stationary
        if ((this.direction.x === 0 && this.direction.y === 0) || 
            this.direction.x !== -this.nextDirection.x || 
            this.direction.y !== -this.nextDirection.y) {
          
          // Instant turn: snap the perpendicular axis
          if (this.nextDirection.x !== 0) {
            this.y = Math.floor(this.y) + 0.5;
          } else if (this.nextDirection.y !== 0) {
            this.x = Math.floor(this.x) + 0.5;
          }
          
          this.direction = { ...this.nextDirection };
        }
      }
    }

    if (this.direction.x === 0 && this.direction.y === 0) return;

    let prevGridX = Math.floor(this.x);
    let prevGridY = Math.floor(this.y);

    let speed = this.getSpeed();
    this.x += this.direction.x * speed * dt;
    this.y += this.direction.y * speed * dt;

    this.x = Math.max(0, Math.min(GRID_SIZE - 0.01, this.x));
    this.y = Math.max(0, Math.min(GRID_SIZE - 0.01, this.y));

    let gridX = Math.floor(this.x);
    let gridY = Math.floor(this.y);

    let footprint = this.getFootprint(gridX, gridY);

    // Check if player collects any treasure chests
    this.game.checkPowerUpCollections(footprint);

    let leadCell = this.game.getCell(gridX, gridY);

    // State transition from FILLED to drawing if any footprint cell is EMPTY
    if (!this.isDrawing) {
      let anyEmpty = footprint.some(c => this.game.getCell(c.x, c.y) === CELL_EMPTY);
      if (anyEmpty) {
        this.isDrawing = true;
        this.recentTrailCells = [];
      }
    }

    if (this.isDrawing) {
      // Draw footprint cells
      for (let cell of footprint) {
        let cellType = this.game.getCell(cell.x, cell.y);
        if (cellType === CELL_EMPTY) {
          this.game.setCell(cell.x, cell.y, CELL_TRAIL);
          
          // Avoid duplicate entries in recent list
          let inRecent = this.recentTrailCells.some(c => c.x === cell.x && c.y === cell.y);
          if (!inRecent) {
            this.recentTrailCells.push({ x: cell.x, y: cell.y });
            let maxRecent = (this.game.activePowerUps && this.game.activePowerUps.playerX2 > 0) ? 12 : 4;
            if (this.recentTrailCells.length > maxRecent) {
              this.recentTrailCells.shift();
            }
          }
        } else if (cellType === CELL_TRAIL) {
          // Self-collision check
          let inRecent = this.recentTrailCells.some(c => c.x === cell.x && c.y === cell.y);
          if (!inRecent) {
            if (gridX !== prevGridX || gridY !== prevGridY) {
              this.game.loseLife(this.x, this.y);
              return;
            }
          }
        }
      }

      // Check if lead cell has returned to CELL_FILLED to complete the capture
      if (leadCell === CELL_FILLED) {
        this.game.captureArea();
        this.isDrawing = false;
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.x = gridX + 0.5;
        this.y = gridY + 0.5;
        this.recentTrailCells = [];
      }
    }
  }
}
