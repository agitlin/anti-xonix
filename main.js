import * as THREE from 'three';
import { Game, GRID_SIZE, CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';
import { Player } from './Player.js';
import { Enemy, GreyEnemy } from './Enemy.js';

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

let game = new Game();

function spawnLevelEntities() {
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
    let ex = 2 + Math.random() * (GRID_SIZE - 4);
    let ey = Math.random() > 0.5 ? 1.0 : GRID_SIZE - 1.0;
    game.greyEnemies.push(new GreyEnemy(game, ex, ey));
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

const enemyGeo = new THREE.SphereGeometry(0.4, 16, 16);
const enemyMat = new THREE.MeshLambertMaterial({ color: 0xf44336 });
const enemyMeshes = [];

const greyEnemyMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
const greyEnemyMeshes = [];

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
    game.player.update(dt);
    game.enemies.forEach(e => e.update(dt));
    game.greyEnemies.forEach(e => e.update(dt));
    
    playerMesh.position.set(game.player.x, 0.5, game.player.y);
    
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
  
  spawnLevelEntities();
});
