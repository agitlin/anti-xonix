import { CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';

export class Enemy {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.speed = 6;
    let angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    if (Math.abs(this.vx) < 2) this.vx = Math.sign(this.vx || 1) * 2;
    if (Math.abs(this.vy) < 2) this.vy = Math.sign(this.vy || 1) * 2;
  }

  update(dt) {
    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;

    let r = 0.4;
    let left = Math.floor(nextX - r);
    let right = Math.floor(nextX + r);
    let top = Math.floor(nextY - r);
    let bottom = Math.floor(nextY + r);

    let bounceX = false;
    let bounceY = false;

    // Check X collision
    let leftCell = this.game.getCell(left, Math.floor(this.y));
    let rightCell = this.game.getCell(right, Math.floor(this.y));
    
    if (leftCell === CELL_FILLED || rightCell === CELL_FILLED) {
      bounceX = true;
    } else if (leftCell === CELL_TRAIL || rightCell === CELL_TRAIL) {
      this.game.loseLife(this.x, this.y);
      return;
    }

    // Check Y collision
    let topCell = this.game.getCell(Math.floor(this.x), top);
    let bottomCell = this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell === CELL_FILLED || bottomCell === CELL_FILLED) {
      bounceY = true;
    } else if (topCell === CELL_TRAIL || bottomCell === CELL_TRAIL) {
      this.game.loseLife(this.x, this.y);
      return;
    }

    if (bounceX) this.vx *= -1;
    if (bounceY) this.vy *= -1;

    if (!bounceX && !bounceY) {
        let diagX = Math.floor(nextX + Math.sign(this.vx)*r);
        let diagY = Math.floor(nextY + Math.sign(this.vy)*r);
        let diagCell = this.game.getCell(diagX, diagY);
        
        if (diagCell === CELL_FILLED) {
             this.vx *= -1;
             this.vy *= -1;
        } else if (diagCell === CELL_TRAIL) {
             this.game.loseLife(this.x, this.y);
             return;
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;
  }
}
