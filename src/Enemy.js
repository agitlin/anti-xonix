import { CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';

function checkDirectPlayerCollision(enemy, game, dt) {
  if (!game.player || game.gameOver || game.inCollisionPause) return false;
  
  let isPlayerX2 = game.activePowerUps && game.activePowerUps.playerX2 > 0;
  let minX = game.player.x - 0.4;
  let maxX = game.player.x + (isPlayerX2 ? 1.4 : 0.4);
  let minY = game.player.y - 0.4;
  let maxY = game.player.y + (isPlayerX2 ? 1.4 : 0.4);

  let closestX = Math.max(minX, Math.min(enemy.x, maxX));
  let closestY = Math.max(minY, Math.min(enemy.y, maxY));

  let dx = enemy.x - closestX;
  let dy = enemy.y - closestY;

  if (Math.sqrt(dx*dx + dy*dy) < 0.4) {
    game.loseLife(enemy.x, enemy.y, "Hit by " + enemy.type);
    return true; // Handled as death
  }
  return false;
}

export class Enemy {
  constructor(game, x, y) {
    this.game = game;
    this.type = 'Red Bozo';
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
    if (checkDirectPlayerCollision(this, this.game, dt)) return;
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
      bounceX = true;
    } else if (leftCell === CELL_TRAIL || rightCell === CELL_TRAIL) {
      this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
      return;
    }

    // Check Y collision
    let topCell = this.game.getCell(Math.floor(this.x), top);
    let bottomCell = this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell === CELL_FILLED || bottomCell === CELL_FILLED) {
      bounceY = true;
    } else if (topCell === CELL_TRAIL || bottomCell === CELL_TRAIL) {
      this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
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
             this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
             return;
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;
  }
}

export class GreyEnemy {
  constructor(game, x, y) {
    this.game = game;
    this.type = 'Gray Mater';
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
    if (checkDirectPlayerCollision(this, this.game, dt)) return;
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
    let rightCell = right >= this.game.gridWidth ? CELL_EMPTY : this.game.getCell(right, Math.floor(this.y));
    
    if (leftCell !== CELL_FILLED || rightCell !== CELL_FILLED) {
      bounceX = true;
    }

    let topCell = top < 0 ? CELL_EMPTY : this.game.getCell(Math.floor(this.x), top);
    let bottomCell = bottom >= this.game.gridHeight ? CELL_EMPTY : this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell !== CELL_FILLED || bottomCell !== CELL_FILLED) {
      bounceY = true;
    }

    if (bounceX) this.vx *= -1;
    if (bounceY) this.vy *= -1;

    if (!bounceX && !bounceY) {
        let diagX = Math.floor(nextX + Math.sign(this.vx)*r);
        let diagY = Math.floor(nextY + Math.sign(this.vy)*r);
        let diagCell = (diagX < 0 || diagX >= this.game.gridWidth || diagY < 0 || diagY >= this.game.gridHeight)
            ? CELL_EMPTY 
            : this.game.getCell(diagX, diagY);
        
        if (diagCell !== CELL_FILLED) {
             this.vx *= -1;
             this.vy *= -1;
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;
  }
}

export class BitingEnemy {
  constructor(game, x, y) {
    this.game = game;
    this.type = 'Orange Biter';
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
    if (checkDirectPlayerCollision(this, this.game, dt)) return;

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
      this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
      return;
    }

    // Check Y collision
    let topCell = this.game.getCell(Math.floor(this.x), top);
    let bottomCell = this.game.getCell(Math.floor(this.x), bottom);
    
    if (topCell === CELL_FILLED || bottomCell === CELL_FILLED) {
      if (topCell === CELL_FILLED) this._biteCell(Math.floor(this.x), top);
      if (bottomCell === CELL_FILLED) this._biteCell(Math.floor(this.x), bottom);
      bounceY = true;
    } else if (topCell === CELL_TRAIL || bottomCell === CELL_TRAIL) {
      this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
      return;
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
             this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
             return;
        }
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;
  }

  _biteCell(x, y) {
    const BORDER_THICKNESS = 2; // from Game.js
    if (x < BORDER_THICKNESS || x >= this.game.gridWidth - BORDER_THICKNESS ||
        y < BORDER_THICKNESS || y >= this.game.gridHeight - BORDER_THICKNESS) {
      // It's the permanent border, do not eat
      return;
    }
    // Eat captured area
    this.game.setCell(x, y, CELL_EMPTY);
  }
}

export class EatingEnemy {
  constructor(game, x, y) {
    this.game = game;
    this.type = 'Purple Eater';
    this.x = x;
    this.y = y;
    this.speed = 3; // Half of normal enemy speed (6)
    let angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    if (Math.abs(this.vx) < 1) this.vx = Math.sign(this.vx || 1) * 1;
    if (Math.abs(this.vy) < 1) this.vy = Math.sign(this.vy || 1) * 1;
  }

  update(dt) {
    if (checkDirectPlayerCollision(this, this.game, dt)) return;

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

    const BORDER_THICKNESS = 2; // from Game.js

    // Bounce off permanent borders
    if (left < BORDER_THICKNESS || right >= this.game.gridWidth - BORDER_THICKNESS) {
      bounceX = true;
    }
    if (top < BORDER_THICKNESS || bottom >= this.game.gridHeight - BORDER_THICKNESS) {
      bounceY = true;
    }

    if (bounceX) this.vx *= -1;
    if (bounceY) this.vy *= -1;

    // Check collision with trail
    let leftCell = this.game.getCell(left, Math.floor(this.y));
    let rightCell = this.game.getCell(right, Math.floor(this.y));
    let topCell = this.game.getCell(Math.floor(this.x), top);
    let bottomCell = this.game.getCell(Math.floor(this.x), bottom);
    
    if (leftCell === CELL_TRAIL || rightCell === CELL_TRAIL || topCell === CELL_TRAIL || bottomCell === CELL_TRAIL) {
      this.game.loseLife(this.x, this.y, "Trail hit by " + this.type);
      return;
    }

    if (!bounceX) this.x += this.vx * dt;
    if (!bounceY) this.y += this.vy * dt;

    // Eat current cell if filled
    let cx = Math.floor(this.x);
    let cy = Math.floor(this.y);
    if (this.game.getCell(cx, cy) === CELL_FILLED &&
        cx >= BORDER_THICKNESS && cx < this.game.gridWidth - BORDER_THICKNESS &&
        cy >= BORDER_THICKNESS && cy < this.game.gridHeight - BORDER_THICKNESS) {
      this.game.setCell(cx, cy, CELL_EMPTY);
    }
  }
}
