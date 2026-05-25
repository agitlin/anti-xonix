import { CELL_EMPTY, CELL_FILLED, CELL_TRAIL, GRID_SIZE } from './Game.js';

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
    if (this.game.activePowerUps && this.game.activePowerUps.enemySlow > 0) {
      dt *= 0.4;
    }
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
    
    let hasHelmet = this.game.activePowerUps && this.game.activePowerUps.playerHelmet > 0;

    if (leftCell === CELL_FILLED || rightCell === CELL_FILLED) {
      bounceX = true;
    } else if (leftCell === CELL_TRAIL || rightCell === CELL_TRAIL) {
      if (hasHelmet) {
        bounceX = true;
      } else {
        this.game.loseLife(this.x, this.y);
        return;
      }
    }

    // Check Y collision
    let topCell = this.game.getCell(Math.floor(this.x), top);
    let bottomCell = this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell === CELL_FILLED || bottomCell === CELL_FILLED) {
      bounceY = true;
    } else if (topCell === CELL_TRAIL || bottomCell === CELL_TRAIL) {
      if (hasHelmet) {
        bounceY = true;
      } else {
        this.game.loseLife(this.x, this.y);
        return;
      }
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
             if (hasHelmet) {
                 this.vx *= -1;
                 this.vy *= -1;
             } else {
                 this.game.loseLife(this.x, this.y);
                 return;
             }
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;
  }
}

export class GreyEnemy {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.speed = 5; // slightly slower or same speed
    let angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    if (Math.abs(this.vx) < 2) this.vx = Math.sign(this.vx || 1) * 2;
    if (Math.abs(this.vy) < 2) this.vy = Math.sign(this.vy || 1) * 2;
  }

  update(dt) {
    if (this.game.activePowerUps && this.game.activePowerUps.enemySlow > 0) {
      dt *= 0.4;
    }
    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;

    let r = 0.4;
    let left = Math.floor(nextX - r);
    let right = Math.floor(nextX + r);
    let top = Math.floor(nextY - r);
    let bottom = Math.floor(nextY + r);

    let bounceX = false;
    let bounceY = false;

    // Bounce on non-FILLED cells or grid boundaries
    let leftCell = left < 0 ? CELL_EMPTY : this.game.getCell(left, Math.floor(this.y));
    let rightCell = right >= GRID_SIZE ? CELL_EMPTY : this.game.getCell(right, Math.floor(this.y));
    
    if (leftCell !== CELL_FILLED || rightCell !== CELL_FILLED) {
      bounceX = true;
    }

    let topCell = top < 0 ? CELL_EMPTY : this.game.getCell(Math.floor(this.x), top);
    let bottomCell = bottom >= GRID_SIZE ? CELL_EMPTY : this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell !== CELL_FILLED || bottomCell !== CELL_FILLED) {
      bounceY = true;
    }

    if (bounceX) this.vx *= -1;
    if (bounceY) this.vy *= -1;

    if (!bounceX && !bounceY) {
        let diagX = Math.floor(nextX + Math.sign(this.vx)*r);
        let diagY = Math.floor(nextY + Math.sign(this.vy)*r);
        let diagCell = (diagX < 0 || diagX >= GRID_SIZE || diagY < 0 || diagY >= GRID_SIZE)
            ? CELL_EMPTY 
            : this.game.getCell(diagX, diagY);
        
        if (diagCell !== CELL_FILLED) {
             this.vx *= -1;
             this.vy *= -1;
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;

    // Check collision with player directly since they share CELL_FILLED
    if (this.game.player && !this.game.gameOver && !this.game.inCollisionPause) {
      let dx = this.x - this.game.player.x;
      let dy = this.y - this.game.player.y;
      if (Math.sqrt(dx*dx + dy*dy) < 0.8) {
        if (this.game.activePowerUps && this.game.activePowerUps.playerHelmet > 0) {
          // Bounce off player
          this.vx *= -1;
          this.vy *= -1;
          // Apply bounce immediately to separate
          this.x += this.vx * dt;
          this.y += this.vy * dt;
        } else {
          this.game.loseLife(this.x, this.y);
        }
      }
    }
  }
}

export class BitingEnemy {
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
    if (this.game.activePowerUps && this.game.activePowerUps.enemySlow > 0) {
      dt *= 0.4;
    }
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
      if (leftCell === CELL_FILLED) this._biteCell(left, Math.floor(this.y));
      if (rightCell === CELL_FILLED) this._biteCell(right, Math.floor(this.y));
      bounceX = true;
    } else if (leftCell === CELL_TRAIL || rightCell === CELL_TRAIL) {
      if (this.game.activePowerUps && this.game.activePowerUps.playerHelmet > 0) {
        bounceX = true;
      } else {
        this.game.loseLife(this.x, this.y);
        return;
      }
    }

    // Check Y collision
    let topCell = this.game.getCell(Math.floor(this.x), top);
    let bottomCell = this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell === CELL_FILLED || bottomCell === CELL_FILLED) {
      if (topCell === CELL_FILLED) this._biteCell(Math.floor(this.x), top);
      if (bottomCell === CELL_FILLED) this._biteCell(Math.floor(this.x), bottom);
      bounceY = true;
    } else if (topCell === CELL_TRAIL || bottomCell === CELL_TRAIL) {
      if (this.game.activePowerUps && this.game.activePowerUps.playerHelmet > 0) {
        bounceY = true;
      } else {
        this.game.loseLife(this.x, this.y);
        return;
      }
    }

    if (bounceX) this.vx *= -1;
    if (bounceY) this.vy *= -1;

    if (!bounceX && !bounceY) {
        let diagX = Math.floor(nextX + Math.sign(this.vx)*r);
        let diagY = Math.floor(nextY + Math.sign(this.vy)*r);
        let diagCell = this.game.getCell(diagX, diagY);
        
        if (diagCell === CELL_FILLED) {
             this._biteCell(diagX, diagY);
             this.vx *= -1;
             this.vy *= -1;
        } else if (diagCell === CELL_TRAIL) {
             if (this.game.activePowerUps && this.game.activePowerUps.playerHelmet > 0) {
                 this.vx *= -1;
                 this.vy *= -1;
             } else {
                 this.game.loseLife(this.x, this.y);
                 return;
             }
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;
  }

  _biteCell(x, y) {
    const BORDER_THICKNESS = 2; // from Game.js
    if (x < BORDER_THICKNESS || x >= GRID_SIZE - BORDER_THICKNESS ||
        y < BORDER_THICKNESS || y >= GRID_SIZE - BORDER_THICKNESS) {
      // It's the permanent border, do not eat
      return;
    }
    // Eat captured area
    this.game.setCell(x, y, CELL_EMPTY);
  }
}
