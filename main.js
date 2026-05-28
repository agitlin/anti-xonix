import * as THREE from 'three';
import { Game, CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';
import { Player } from './Player.js';
import { Enemy, GreyEnemy, BitingEnemy, EatingEnemy } from './Enemy.js';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 800);

if (isMobile) {
  document.getElementById('mobile-reject-overlay').style.display = 'flex';
  document.getElementById('ui').style.display = 'none';
  throw new Error("Mobile devices are not supported. Please use a personal computer.");
}

const uiScore = document.getElementById('score');
const uiLives = document.getElementById('lives');
const uiProgress = document.getElementById('progress');
const uiLevel = document.getElementById('level');
const uiGameOver = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const uiStatsOverlay = document.getElementById('stats-overlay');
const uiCollisionMsg = document.getElementById('collision-msg');

function populateStatsOverlay() {
  const statsBody = document.getElementById('stats-body');
  if (!statsBody) return;
  
  let html = `<ul style="list-style:none; padding:0; margin:0; font-size: 18px; line-height: 1.8;">`;
  html += `<li><span style="color:#4CAF50">■</span> <b>Area Captured:</b> ${game.roundStats.areaCaptured} cells</li>`;
  
  let pTypes = Object.keys(game.roundStats.powerups);
  if (pTypes.length > 0) {
    let parts = pTypes.map(t => `${t} (${game.roundStats.powerups[t]})`);
    html += `<li><span style="color:#ffeb3b">★</span> <b>Powerups Collected:</b> ${parts.join(', ')}</li>`;
  } else {
    html += `<li><span style="color:#ffeb3b">★</span> <b>Powerups Collected:</b> None</li>`;
  }
  
  let eTypes = Object.keys(game.roundStats.enemiesEliminated);
  if (eTypes.length > 0) {
    const typeImages = {
      'Red Bozo': '/img/red_bozo.png',
      'Gray Mater': '/img/gray_mater.png',
      'Orange Biter': '/img/orange_biter.png',
      'Purple Eater': '/img/purple_eater.png'
    };
    let parts = eTypes.map(t => `<img src="${typeImages[t]}" style="width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:8px;">${t} (${game.roundStats.enemiesEliminated[t]})`);
    html += `<li style="margin-top: 8px;"><b>Enemies Eliminated:</b><div style="margin-top:4px; display:flex; flex-direction:column; gap:8px; padding-left:10px;">${parts.join('')}</div></li>`;
  } else {
    html += `<li><b>Enemies Eliminated:</b> None</li>`;
  }
  html += `</ul>`;
  
  statsBody.innerHTML = html;
}

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
function updateCamera() {
  let maxDim = Math.max(game.gridWidth, game.gridHeight);
  camera.position.set(game.gridWidth / 2, maxDim * 1.2, game.gridHeight / 2 + maxDim * 0.8);
  camera.lookAt(game.gridWidth / 2, 0, game.gridHeight / 2);
}

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
    case 'Freeze': return '#88ccff';
  }
  return '#ffffff';
}

function getColorForType(type) {
  switch (type) {
    case 'S': return 0x00e5ff;
    case 'A': return 0x39ff14;
    case 'Heart': return 0xff073a;
    case 'x2': return 0xffeb3b;
    case 'Freeze': return 0x88ccff;
  }
  return 0xffffff;
}

function getTextForType(type) {
  switch (type) {
    case 'Heart': return '♥';
    case 'Freeze': return 'F';
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
  if (game.activePowerUps.playerFreeze > 0) activeTypes.push('freeze');
  
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

    if (activeTypes.includes('freeze')) {
      html += `
        <div class="powerup-item">
          <div class="powerup-info freeze">
            <span>FREEZE</span>
            <span id="hud-freeze-time"></span>
          </div>
          <div class="powerup-bar-bg">
            <div class="powerup-bar-fill freeze" id="hud-freeze-bar"></div>
          </div>
          <div class="powerup-visual visual-freeze">F</div>
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

  if (activeTypes.includes('freeze')) {
    let pct = (game.activePowerUps.playerFreeze / 40) * 100;
    document.getElementById('hud-freeze-time').innerText = Math.ceil(game.activePowerUps.playerFreeze) + 's';
    document.getElementById('hud-freeze-bar').style.width = pct + '%';
  }
}

let game = new Game();

function getLevelColor(level) {
  const hue = ((level - 1) * 55) % 360; 
  return `hsl(${hue}, 60%, 45%)`;
}

function getEmptySpawnPoint(margin = 5) {
  let ex, ey;
  let attempts = 0;
  do {
    ex = margin + Math.random() * (game.gridWidth - margin * 2);
    ey = margin + Math.random() * (game.gridHeight - margin * 2);
    attempts++;
  } while (game.getCell(Math.floor(ex), Math.floor(ey)) !== CELL_EMPTY && attempts < 100);
  return {x: ex, y: ey};
}

function spawnLevelEntities() {
  updateCamera();
  initBoardMesh();
  clearAllPowerUpMeshes();
  game.player = new Player(game);
  game.enemies = [];
  game.greyEnemies = [];
  game.bitingEnemies = [];
  game.eatingEnemies = [];
  let numEnemies = 2 + game.level;
  for (let i = 0; i < numEnemies; i++) {
    let p = getEmptySpawnPoint();
    game.enemies.push(new Enemy(game, p.x, p.y));
  }
  let numGreyEnemies = 1 + game.level;
  for (let i = 0; i < numGreyEnemies; i++) {
    let fraction = numGreyEnemies > 1 ? i / (numGreyEnemies - 1) : 0.5;
    let ex = 1.5 + fraction * (game.gridWidth - 3);
    let ey = game.gridHeight - 1.5;
    game.greyEnemies.push(new GreyEnemy(game, ex, ey));
  }
  
  if (game.level > 3) {
    let numBiting = game.level - 3;
    for (let i = 0; i < numBiting; i++) {
      let p = getEmptySpawnPoint();
      game.bitingEnemies.push(new BitingEnemy(game, p.x, p.y));
    }
  }

  if (game.level > 4) {
    let numEating = game.level - 4;
    for (let i = 0; i < numEating; i++) {
      let p = getEmptySpawnPoint();
      game.eatingEnemies.push(new EatingEnemy(game, p.x, p.y));
    }
  }

  // Populate Splash Overlay
  let levelColor = getLevelColor(game.level);
  colorFilled.setStyle(levelColor);
  
  document.getElementById('splash-background').style.background = `
    linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, ${levelColor} 50%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%),
    repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 42px)
  `;

  document.getElementById('intro-level').innerText = 'LEVEL ' + game.level;
  
  let bozoMaterScale = game.level <= 3 ? 1.5 : 1;
  let biterScale = game.level === 4 ? 1.5 : 1;
  let eaterScale = game.level === 5 ? 1.5 : 1;
  
  let enemiesHtml = `<div style="display:flex; align-items:center; transform: scale(${bozoMaterScale}); transform-origin: right center; transition: transform 0.3s;">
    <span style="color:#fff; font-family:'Courier New'; margin-right: 15px; font-weight: bold; font-size:18px; text-shadow: 2px 2px 0 #000;">Red Bozo & Gray Mater</span>
    <img src="/img/red_bozo.png" style="width:48px;height:48px;image-rendering:pixelated; filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.8)); margin-right: 10px;">
    <img src="/img/gray_mater.png" style="width:48px;height:48px;image-rendering:pixelated; filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.8));">
  </div>`;
  
  if (game.bitingEnemies.length > 0) {
    enemiesHtml += `<div style="display:flex; align-items:center; margin-top: 15px; transform: scale(${biterScale}); transform-origin: right center;">
      <span style="color:#fff; font-family:'Courier New'; margin-right: 15px; font-weight: bold; font-size:18px; text-shadow: 2px 2px 0 #000;">Orange Biter</span>
      <img src="/img/orange_biter.png" style="width:48px;height:48px;image-rendering:pixelated; filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.8));">
    </div>`;
  }
  
  if (game.eatingEnemies && game.eatingEnemies.length > 0) {
    enemiesHtml += `<div style="display:flex; align-items:center; margin-top: 15px; transform: scale(${eaterScale}); transform-origin: right center;">
      <span style="color:#fff; font-family:'Courier New'; margin-right: 15px; font-weight: bold; font-size:18px; text-shadow: 2px 2px 0 #000;">Purple Eater</span>
      <img src="/img/purple_eater.png" style="width:48px;height:48px;image-rendering:pixelated; filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.8));">
    </div>`;
  }
  
  document.getElementById('splash-enemies').innerHTML = enemiesHtml;

  let detailsHtml = `
      <b>Powerups:</b> 
      <span style="color:#00e5ff; margin-left:10px;">S</span> Slow | 
      <span style="color:#39ff14">A</span> Speed | 
      <span style="color:#ffeb3b">x2</span> Size | 
      <span style="color:#88ccff">F</span> Freeze | 
      <span style="color:#ff073a">♥</span> Life
  `;
  document.getElementById('intro-details').innerHTML = detailsHtml;
  document.getElementById('intro-overlay').style.display = 'flex';
}

spawnLevelEntities();

const geometry = new THREE.BoxGeometry(0.95, 0.5, 0.95);
const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
let instancedMesh;
function initBoardMesh() {
  if (instancedMesh) scene.remove(instancedMesh);
  instancedMesh = new THREE.InstancedMesh(geometry, material, game.gridWidth * game.gridHeight);
  scene.add(instancedMesh);
}

const colorEmpty = new THREE.Color(0x333333);
const colorFilled = new THREE.Color(0x4CAF50);
const colorTrail = new THREE.Color(0x2196F3);

const playerGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const playerMat = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
const playerMesh = new THREE.Mesh(playerGeo, playerMat);
scene.add(playerMesh);



const enemyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const enemyMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
const enemyMeshes = [];

const greyEnemyMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
const greyEnemyMeshes = [];

const bitingEnemyMat = new THREE.MeshLambertMaterial({ color: 0xff9800 });
const bitingEnemyMeshes = [];

const eatingEnemyMat = new THREE.MeshLambertMaterial({ color: 0x9c27b0 }); // Purple for eating enemy
const eatingEnemyMeshes = [];

const frozenEnemyMat = new THREE.MeshLambertMaterial({ color: 0x88ccff });

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
  if (!instancedMesh) return;
  let idx = 0;
  for (let y = 0; y < game.gridHeight; y++) {
    for (let x = 0; x < game.gridWidth; x++) {
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
      
      if (flash) {
        // Toned down flash: blend slightly with red
        dummyColor.lerp(new THREE.Color(0xff8888), 0.2 + Math.random() * 0.1);
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

function handleAction() {
  if (game.inIntro) {
    game.inIntro = false;
    document.getElementById('intro-overlay').style.display = 'none';
    lastTime = performance.now();
  } else if (game.inCollisionPause) {
    game.resumeFromCollision();
    uiStatsOverlay.style.display = 'none';
    scene.remove(impactMesh);
    scene.background = new THREE.Color(0x222222);
    updateInstancedMesh(false); // Restore normal colors
  } else if (!game.gameOver && !game.gameWon) {
    game.isPaused = !game.isPaused;
    let pauseOverlay = document.getElementById('pause-overlay');
    if (game.isPaused) {
      pauseOverlay.style.display = 'flex';
    } else {
      pauseOverlay.style.display = 'none';
      lastTime = performance.now(); // Prevent large dt jump on resume
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    handleAction();
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

  if (game.isPaused || game.inIntro) {
    renderer.render(scene, camera);
    return;
  }

  if (game.inCollisionPause) {
    // Just entered collision?
    if (!wasInCollision) {
       uiStatsOverlay.style.display = 'flex';
       uiCollisionMsg.innerText = retroMessages[Math.floor(Math.random() * retroMessages.length)];
       populateStatsOverlay();
       if (game.impactPoint) {
         impactMesh.position.set(game.impactPoint.x, 0.5, game.impactPoint.y);
         scene.add(impactMesh);
       }
       wasInCollision = true;
    }
    
    // Toned down flashing
    scene.background = new THREE.Color(Math.random() > 0.5 ? 0x220000 : 0x000000);
    updateInstancedMesh(true);
    
    // Pulse impact marker
    let s = 1 + Math.sin(now / 100) * 0.2;
    impactMesh.scale.set(s, s, s);
    impactMat.color.setHex(0xff00ff);
    
  } else if (!game.gameOver && !game.gameWon) {
    wasInCollision = false;
    gameOverHandled = false;
    
    let frozen = game.activePowerUps.frozenEnemy;
    if (frozen) {
      let isPlayerX2 = game.activePowerUps.playerX2 > 0;
      let minX = game.player.x - 0.4;
      let maxX = game.player.x + (isPlayerX2 ? 1.4 : 0.4);
      let minY = game.player.y - 0.4;
      let maxY = game.player.y + (isPlayerX2 ? 1.4 : 0.4);
      let closestX = Math.max(minX, Math.min(frozen.x, maxX));
      let closestY = Math.max(minY, Math.min(frozen.y, maxY));
      let dx = frozen.x - closestX;
      let dy = frozen.y - closestY;
      if (Math.sqrt(dx*dx + dy*dy) < 0.4) {
        // eliminate
        game.enemies = game.enemies.filter(e => e !== frozen);
        game.greyEnemies = game.greyEnemies.filter(e => e !== frozen);
        game.bitingEnemies = game.bitingEnemies.filter(e => e !== frozen);
        game.eatingEnemies = game.eatingEnemies.filter(e => e !== frozen);
        game.roundStats.enemiesEliminated[frozen.type] = (game.roundStats.enemiesEliminated[frozen.type] || 0) + 1;
        game.score += 100;
        game.activePowerUps.frozenEnemy = null;
        game.activePowerUps.playerFreeze = 0;
      }
    }

    game.updatePowerUps(dt);
    game.player.update(dt);
    game.enemies.forEach(e => { if (e !== game.activePowerUps.frozenEnemy) e.update(dt); });
    game.greyEnemies.forEach(e => { if (e !== game.activePowerUps.frozenEnemy) e.update(dt); });
    game.bitingEnemies.forEach(e => { if (e !== game.activePowerUps.frozenEnemy) e.update(dt); });
    game.eatingEnemies.forEach(e => { if (e !== game.activePowerUps.frozenEnemy) e.update(dt); });
    
    if (game.activePowerUps && game.activePowerUps.playerX2 > 0) {
      playerMesh.scale.set(2, 2, 2);
      playerMesh.position.set(game.player.x, 0.9, game.player.y);
    } else {
      playerMesh.scale.set(1, 1, 1);
      playerMesh.position.set(game.player.x, 0.5, game.player.y);
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
      enemyMeshes[i].material = (e === game.activePowerUps.frozenEnemy) ? frozenEnemyMat : enemyMat;
    });

    while (greyEnemyMeshes.length < game.greyEnemies.length) {
      let m = new THREE.Mesh(enemyGeo, greyEnemyMat);
      scene.add(m);
      greyEnemyMeshes.push(m);
    }
    game.greyEnemies.forEach((e, i) => {
      greyEnemyMeshes[i].position.set(e.x, 0.5, e.y);
      greyEnemyMeshes[i].material = (e === game.activePowerUps.frozenEnemy) ? frozenEnemyMat : greyEnemyMat;
    });

    while (bitingEnemyMeshes.length < game.bitingEnemies.length) {
      let m = new THREE.Mesh(enemyGeo, bitingEnemyMat);
      scene.add(m);
      bitingEnemyMeshes.push(m);
    }
    game.bitingEnemies.forEach((e, i) => {
      bitingEnemyMeshes[i].position.set(e.x, 0.5, e.y);
      bitingEnemyMeshes[i].material = (e === game.activePowerUps.frozenEnemy) ? frozenEnemyMat : bitingEnemyMat;
      if (e === game.activePowerUps.frozenEnemy) {
        bitingEnemyMeshes[i].scale.set(1, 1, 1);
      } else {
        let s = 1 + Math.sin(performance.now() / 150 + i) * 0.15;
        bitingEnemyMeshes[i].scale.set(s, s, s);
      }
    });

    while (eatingEnemyMeshes.length < game.eatingEnemies.length) {
      let m = new THREE.Mesh(enemyGeo, eatingEnemyMat);
      scene.add(m);
      eatingEnemyMeshes.push(m);
    }
    game.eatingEnemies.forEach((e, i) => {
      eatingEnemyMeshes[i].position.set(e.x, 0.5, e.y);
      eatingEnemyMeshes[i].material = (e === game.activePowerUps.frozenEnemy) ? frozenEnemyMat : eatingEnemyMat;
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

updateInstancedMesh(false); // Initialize grid colors before first frame
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
  
  eatingEnemyMeshes.forEach(m => scene.remove(m));
  eatingEnemyMeshes.length = 0;
  
  spawnLevelEntities();
});
