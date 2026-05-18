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

    this.x += this.direction.x * this.speed * dt;
    this.y += this.direction.y * this.speed * dt;

    this.x = Math.max(0, Math.min(GRID_SIZE - 0.01, this.x));
    this.y = Math.max(0, Math.min(GRID_SIZE - 0.01, this.y));

    let gridX = Math.floor(this.x);
    let gridY = Math.floor(this.y);

    let currentCell = this.game.getCell(gridX, gridY);

    if (currentCell === CELL_EMPTY) {
      this.isDrawing = true;
      this.game.setCell(gridX, gridY, CELL_TRAIL);
    } else if (currentCell === CELL_TRAIL) {
      if (gridX !== prevGridX || gridY !== prevGridY) {
        this.game.loseLife(this.x, this.y);
      }
    } else if (currentCell === CELL_FILLED) {
      if (this.isDrawing) {
        this.game.captureArea();
        this.isDrawing = false;
        this.direction = {x: 0, y: 0};
        this.nextDirection = {x: 0, y: 0};
        this.x = gridX + 0.5;
        this.y = gridY + 0.5;
      }
    }
  }
}
