import * as THREE from 'three';
import { Game, GRID_SIZE, CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';
import { Player } from './Player.js';
import { Enemy, GreyEnemy, BitingEnemy } from './Enemy.js';

const uiScore = document.getElementById('score');
const uiLives = document.getElementById('lives');
const uiProgress = document.getElementById('progress');
const uiLevel = document.getElementById('level');
const uiGameOver = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const uiCollisionOverlay = document.getElementById('collision-overlay');
const uiCollisionMsg = document.getElementById('collision-msg');

const hofOverlay = document.getElementById('hof-overlay');
const hofInputSection = document.getElementById('hof-input-section');
const hofInitials = document.getElementById('hof-initials');
const hofSubmit = document.getElementById('hof-submit');
const hofBody = document.getElementById('hof-body');
const hofCloseBtn = document.getElementById('hof-close-btn');
const showHofBtn = document.getElementById('show-hof-btn');

class ScoreManager {
  static getScores() {
    const scores = localStorage.getItem('antiXonixScores');
    return scores ? JSON.parse(scores) : [];
  }

  static saveScore(name, score, level) {
    const scores = this.getScores();
    scores.push({ name, score, level });
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);
    localStorage.setItem('antiXonixScores', JSON.stringify(top10));
    return top10;
  }

  static isHighScore(score) {
    const scores = this.getScores();
    if (scores.length < 10) return true;
    return score > scores[scores.length - 1].score;
  }
}

function renderHof() {
  const scores = ScoreManager.getScores();
  hofBody.innerHTML = '';
  scores.forEach((s, i) => {
    hofBody.innerHTML += `<tr>
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.score}</td>
      <td>${s.level}</td>
    </tr>`;
  });
}

showHofBtn.addEventListener('click', () => {
  renderHof();
  hofInputSection.style.display = 'none';
  hofOverlay.style.display = 'block';
});

hofCloseBtn.addEventListener('click', () => {
  hofOverlay.style.display = 'none';
  if (game.gameOver) {
    uiGameOver.style.display = 'block';
  }
});

hofSubmit.addEventListener('click', () => {
  let name = hofInitials.value.toUpperCase() || 'PLAYER';
  ScoreManager.saveScore(name, game.score, game.level);
  hofInputSection.style.display = 'none';
  renderHof();
});

const retroMessages = [
  "BOGUS! Your trail was totally harshed!",
  "BUMMER! That sphere just harsh'd your mellow!",
  "WIPEOUT! Try to stay groovy, man!",
  "FAR OUT... but not far enough! You got zapped!"
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
camera.position.set(GRID_SIZE / 2, GRID_SIZE * 1.2, GRID_SIZE / 2 + GRID_SIZE * 0.8);
camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

const activePowerupsContainer = document.getElementById('active-powerups');
const powerUpMeshes = new Map();

function getHexColorString(type) {
  switch (type) {
    case 'S': return '#00e5ff';
    case 'A': return '#39ff14';
    case 'Heart': return '#ff073a';
    case 'x2': return '#ffeb3b';
    case 'Helmet': return '#00ffff';
  }
  return '#ffffff';
}

function getColorForType(type) {
  switch (type) {
    case 'S': return 0x00e5ff;
    case 'A': return 0x39ff14;
    case 'Heart': return 0xff073a;
    case 'x2': return 0xffeb3b;
    case 'Helmet': return 0x00ffff;
  }
  return 0xffffff;
}

function getTextForType(type) {
  switch (type) {
    case 'Heart': return '♥';
    default: return type;
  }
}

function createPowerUpTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillText(getTextForType(type), 34, 34);
  
  ctx.fillStyle = getHexColorString(type);
  ctx.fillText(getTextForType(type), 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createChestGroup(type) {
  const group = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(0.6, 0.3, 0.6);
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  group.add(base);

  const lidGeo = new THREE.BoxGeometry(0.64, 0.16, 0.64);
  const lidMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.y = 0.38;
  group.add(lid);

  const lockGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
  const lockMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  const lock = new THREE.Mesh(lockGeo, lockMat);
  lock.position.set(0, 0.25, 0.32);
  group.add(lock);

  const chestGlow = new THREE.PointLight(getColorForType(type), 1.5, 3);
  chestGlow.position.set(0, 0.2, 0);
  group.add(chestGlow);

  const spriteTexture = createPowerUpTexture(type);
  const spriteMat = new THREE.SpriteMaterial({ map: spriteTexture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, 0.8, 0);
  sprite.scale.set(0.7, 0.7, 0.7);
  group.add(sprite);

  return group;
}

function clearAllPowerUpMeshes() {
  for (let [powerUp, mesh] of powerUpMeshes.entries()) {
    scene.remove(mesh);
  }
  powerUpMeshes.clear();
}

function syncPowerUpMeshes() {
  for (let [powerUp, mesh] of powerUpMeshes.entries()) {
    if (!game.powerUps.includes(powerUp)) {
      scene.remove(mesh);
      powerUpMeshes.delete(powerUp);
    }
  }

  for (let p of game.powerUps) {
    if (!powerUpMeshes.has(p)) {
      let mesh = createChestGroup(p.type);
      scene.add(mesh);
      powerUpMeshes.set(p, mesh);
    }
  }

  let time = performance.now() / 1000;
  for (let [p, mesh] of powerUpMeshes.entries()) {
    mesh.position.x = p.x + 0.5;
    mesh.position.z = p.y + 0.5;
    mesh.position.y = 0.45 + Math.sin(time * 3 + p.x * 2) * 0.12;
    mesh.rotation.y = time * 1.5;
  }
}

let currentPowerUpsState = '';

function updatePowerUpsHUD() {
  if (!activePowerupsContainer) return;
  
  let activeTypes = [];
  if (game.activePowerUps.heartPopup > 0) activeTypes.push('heart');
  if (game.activePowerUps.enemySlow > 0) activeTypes.push('slow');
  if (game.activePowerUps.playerSpeed > 0) activeTypes.push('speed');
  if (game.activePowerUps.playerX2 > 0) activeTypes.push('size');
  if (game.activePowerUps.playerHelmet > 0) activeTypes.push('helmet');
  
  let stateStr = activeTypes.join(',');
  
  if (currentPowerUpsState !== stateStr) {
    currentPowerUpsState = stateStr;
    let html = '';
    if (activeTypes.includes('heart')) {
      html += `
        <div class="powerup-item">
          <div class="powerup-info heart">
            <span>EXTRA LIFE!</span>
          </div>
          <div class="powerup-visual visual-heart">&hearts;</div>
        </div>
      `;
    }
    if (activeTypes.includes('slow')) {
      html += `
        <div class="powerup-item">
          <div class="powerup-info slow">
            <span>SLOW ENEMIES</span>
            <span id="hud-slow-time"></span>
          </div>
          <div class="powerup-bar-bg">
            <div class="powerup-bar-fill slow" id="hud-slow-bar"></div>
          </div>
          <div class="powerup-visual visual-slow">S</div>
        </div>
      `;
    }
    if (activeTypes.includes('speed')) {
      html += `
        <div class="powerup-item">
          <div class="powerup-info speed">
            <span>SPEED BOOST</span>
            <span id="hud-speed-time"></span>
          </div>
          <div class="powerup-bar-bg">
            <div class="powerup-bar-fill speed" id="hud-speed-bar"></div>
          </div>
          <div class="powerup-visual visual-speed">&raquo;&raquo;</div>
        </div>
      `;
    }
    if (activeTypes.includes('size')) {
      html += `
        <div class="powerup-item">
          <div class="powerup-info size">
            <span>DOUBLE SIZE</span>
            <span id="hud-size-time"></span>
          </div>
          <div class="powerup-bar-bg">
            <div class="powerup-bar-fill size" id="hud-size-bar"></div>
          </div>
          <div class="powerup-visual visual-size">x2</div>
        </div>
      `;
    }
    if (activeTypes.includes('helmet')) {
      html += `
        <div class="powerup-item">
          <div class="powerup-info helmet">
            <span>HELMET</span>
            <span id="hud-helmet-time"></span>
          </div>
          <div class="powerup-bar-bg">
            <div class="powerup-bar-fill helmet" id="hud-helmet-bar"></div>
          </div>
          <div class="powerup-visual visual-helmet">H</div>
        </div>
      `;
    }
    activePowerupsContainer.innerHTML = html;
  }
  
  if (activeTypes.includes('slow')) {
    let pct = (game.activePowerUps.enemySlow / 40) * 100;
    document.getElementById('hud-slow-time').innerText = Math.ceil(game.activePowerUps.enemySlow) + 's';
    document.getElementById('hud-slow-bar').style.width = pct + '%';
  }
  if (activeTypes.includes('speed')) {
    let pct = (game.activePowerUps.playerSpeed / 40) * 100;
    document.getElementById('hud-speed-time').innerText = Math.ceil(game.activePowerUps.playerSpeed) + 's';
    document.getElementById('hud-speed-bar').style.width = pct + '%';
  }
  if (activeTypes.includes('size')) {
    let pct = (game.activePowerUps.playerX2 / 40) * 100;
    document.getElementById('hud-size-time').innerText = Math.ceil(game.activePowerUps.playerX2) + 's';
    document.getElementById('hud-size-bar').style.width = pct + '%';
  }
  if (activeTypes.includes('helmet')) {
    let pct = (game.activePowerUps.playerHelmet / 40) * 100;
    document.getElementById('hud-helmet-time').innerText = Math.ceil(game.activePowerUps.playerHelmet) + 's';
    document.getElementById('hud-helmet-bar').style.width = pct + '%';
  }
}

let game = new Game();

function spawnLevelEntities() {
  clearAllPowerUpMeshes();
  game.player = new Player(game);
  game.enemies = [];
  game.greyEnemies = [];
  let numEnemies = 2 + game.level;
  for (let i = 0; i < numEnemies; i++) {
    let ex = 5 + Math.random() * (GRID_SIZE - 10);
    let ey = 5 + Math.random() * (GRID_SIZE - 10);
    game.enemies.push(new Enemy(game, ex, ey));
  }
  let numGreyEnemies = 1 + game.level;
  for (let i = 0; i < numGreyEnemies; i++) {
    let fraction = numGreyEnemies > 1 ? i / (numGreyEnemies - 1) : 0.5;
    let ex = 1.5 + fraction * (GRID_SIZE - 3);
    let ey = GRID_SIZE - 1.5;
    game.greyEnemies.push(new GreyEnemy(game, ex, ey));
  }
  
  if (game.level > 3) {
    let numBiting = game.level - 3;
    for (let i = 0; i < numBiting; i++) {
      let ex = 5 + Math.random() * (GRID_SIZE - 10);
      let ey = 5 + Math.random() * (GRID_SIZE - 10);
      game.bitingEnemies.push(new BitingEnemy(game, ex, ey));
    }
  }
}

spawnLevelEntities();

const geometry = new THREE.BoxGeometry(0.95, 0.5, 0.95);
const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
const instancedMesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
scene.add(instancedMesh);

const colorEmpty = new THREE.Color(0x333333);
const colorFilled = new THREE.Color(0x4CAF50);
const colorTrail = new THREE.Color(0x2196F3);

const playerGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const playerMat = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
const playerMesh = new THREE.Mesh(playerGeo, playerMat);
scene.add(playerMesh);

const helmetGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const helmetMat = new THREE.MeshLambertMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
helmetMesh.visible = false;
scene.add(helmetMesh);

const enemyGeo = new THREE.SphereGeometry(0.4, 16, 16);
const enemyMat = new THREE.MeshLambertMaterial({ color: 0xf44336 });
const enemyMeshes = [];

const greyEnemyMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
const greyEnemyMeshes = [];

const bitingEnemyMat = new THREE.MeshLambertMaterial({ color: 0xff9800 });
const bitingEnemyMeshes = [];

const dummy = new THREE.Object3D();
const dummyColor = new THREE.Color();

// Impact Marker
const impactGeo = new THREE.SphereGeometry(1.2, 16, 16);
const impactMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
const impactMesh = new THREE.Mesh(impactGeo, impactMat);
const impactLight = new THREE.PointLight(0xffffff, 2, 20);
impactMesh.add(impactLight);

let wasInCollision = false;

function updateInstancedMesh(flash = false) {
  let idx = 0;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      let cell = game.getCell(x, y);
      
      dummy.position.set(x + 0.5, 0, y + 0.5);
      
      if (cell === CELL_EMPTY) {
        dummy.position.y = -0.4;
        dummyColor.copy(colorEmpty);
      } else if (cell === CELL_FILLED) {
        dummy.position.y = 0;
        dummyColor.copy(colorFilled);
      } else if (cell === CELL_TRAIL) {
        dummy.position.y = 0.1;
        dummyColor.copy(colorTrail);
      }
      
      if (flash && Math.random() > 0.5) {
        dummyColor.setHex(Math.random() * 0xffffff);
      }
      
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);
      instancedMesh.setColorAt(idx, dummyColor);
      idx++;
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  if(instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && game.inCollisionPause) {
    game.resumeFromCollision();
    uiCollisionOverlay.style.display = 'none';
    scene.remove(impactMesh);
    scene.background = new THREE.Color(0x222222);
    updateInstancedMesh(false); // Restore normal colors
  }
});

let lastTime = performance.now();
let gameOverHandled = false;

function animate() {
  requestAnimationFrame(animate);
  
  let now = performance.now();
  let dt = (now - lastTime) / 1000;
  // limit dt to avoid huge jumps on lag
  dt = Math.min(dt, 0.1); 
  lastTime = now;

  if (game.inCollisionPause) {
    // Just entered collision?
    if (!wasInCollision) {
       uiCollisionOverlay.style.display = 'block';
       uiCollisionMsg.innerText = retroMessages[Math.floor(Math.random() * retroMessages.length)];
       if (game.impactPoint) {
         impactMesh.position.set(game.impactPoint.x, 0.5, game.impactPoint.y);
         scene.add(impactMesh);
       }
       wasInCollision = true;
    }
    
    // Armageddon flashing
    scene.background = new THREE.Color(Math.random() * 0xffffff);
    updateInstancedMesh(true);
    
    // Pulse impact marker
    let s = 1 + Math.sin(now / 50) * 0.3;
    impactMesh.scale.set(s, s, s);
    impactMat.color.setHex(Math.random() > 0.5 ? 0xffffff : 0xff00ff);
    
  } else if (!game.gameOver && !game.gameWon) {
    wasInCollision = false;
    gameOverHandled = false;
    
    game.updatePowerUps(dt);
    game.player.update(dt);
    game.enemies.forEach(e => e.update(dt));
    game.greyEnemies.forEach(e => e.update(dt));
    game.bitingEnemies.forEach(e => e.update(dt));
    
    if (game.activePowerUps && game.activePowerUps.playerX2 > 0) {
      playerMesh.scale.set(2, 2, 2);
      playerMesh.position.set(game.player.x, 0.9, game.player.y);
    } else {
      playerMesh.scale.set(1, 1, 1);
      playerMesh.position.set(game.player.x, 0.5, game.player.y);
    }
    
    // Add visual helmet effect
    if (game.activePowerUps && game.activePowerUps.playerHelmet > 0) {
      let t = performance.now() / 150;
      let s = (game.activePowerUps.playerX2 > 0 ? 2 : 1) * (1.1 + Math.sin(t) * 0.1);
      helmetMesh.scale.set(s, s, s);
      helmetMesh.position.copy(playerMesh.position);
      helmetMesh.visible = true;
    } else {
      helmetMesh.visible = false;
    }
    
    syncPowerUpMeshes();
    updatePowerUpsHUD();
    
    while (enemyMeshes.length < game.enemies.length) {
      let m = new THREE.Mesh(enemyGeo, enemyMat);
      scene.add(m);
      enemyMeshes.push(m);
    }
    game.enemies.forEach((e, i) => {
      enemyMeshes[i].position.set(e.x, 0.5, e.y);
    });

    while (greyEnemyMeshes.length < game.greyEnemies.length) {
      let m = new THREE.Mesh(enemyGeo, greyEnemyMat);
      scene.add(m);
      greyEnemyMeshes.push(m);
    }
    game.greyEnemies.forEach((e, i) => {
      greyEnemyMeshes[i].position.set(e.x, 0.5, e.y);
    });

    while (bitingEnemyMeshes.length < game.bitingEnemies.length) {
      // Use something slightly jagged or just a distinct orange sphere
      let m = new THREE.Mesh(enemyGeo, bitingEnemyMat);
      // Give them a slight pulse or scale to look biting
      let s = 1 + Math.sin(performance.now() / 150) * 0.15;
      m.scale.set(s, s, s);
      scene.add(m);
      bitingEnemyMeshes.push(m);
    }
    game.bitingEnemies.forEach((e, i) => {
      bitingEnemyMeshes[i].position.set(e.x, 0.5, e.y);
      let s = 1 + Math.sin(performance.now() / 150 + i) * 0.15;
      bitingEnemyMeshes[i].scale.set(s, s, s);
    });

    updateInstancedMesh(false);

    uiLevel.innerText = game.level;
    uiScore.innerText = game.score;
    uiLives.innerText = game.lives;
    uiProgress.innerText = game.calculateProgress();
    
    uiGameOver.style.display = 'none';
  } else {
    uiGameOver.style.display = 'block';
    if (game.gameWon) {
      document.getElementById('game-over-text').innerText = "Level Complete!";
      restartBtn.innerText = "Next Level";
    } else {
      document.getElementById('game-over-text').innerText = "Game Over";
      restartBtn.innerText = "Restart Game";
      
      if (!gameOverHandled) {
        gameOverHandled = true;
        uiGameOver.style.display = 'none';
        hofOverlay.style.display = 'block';
        renderHof();
        
        if (game.score > 0 && ScoreManager.isHighScore(game.score)) {
          hofInputSection.style.display = 'block';
          hofInitials.value = '';
        } else {
          hofInputSection.style.display = 'none';
        }
      }
    }
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

restartBtn.addEventListener('click', () => {
  if (game.gameWon) {
    game.nextLevel();
  } else {
    game.fullReset();
  }
  
  gameOverHandled = false;
  
  enemyMeshes.forEach(m => scene.remove(m));
  enemyMeshes.length = 0;
  
  greyEnemyMeshes.forEach(m => scene.remove(m));
  greyEnemyMeshes.length = 0;
  
  bitingEnemyMeshes.forEach(m => scene.remove(m));
  bitingEnemyMeshes.length = 0;
  
  spawnLevelEntities();
});
