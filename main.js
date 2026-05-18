import * as THREE from 'three';
import { Game, GRID_SIZE, CELL_EMPTY, CELL_FILLED, CELL_TRAIL } from './Game.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';

const uiScore = document.getElementById('score');
const uiLives = document.getElementById('lives');
const uiProgress = document.getElementById('progress');
const uiLevel = document.getElementById('level');
const uiGameOver = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const uiCollisionOverlay = document.getElementById('collision-overlay');
const uiCollisionMsg = document.getElementById('collision-msg');

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
  let numEnemies = 2 + game.level;
  for (let i = 0; i < numEnemies; i++) {
    let ex = 5 + Math.random() * (GRID_SIZE - 10);
    let ey = 5 + Math.random() * (GRID_SIZE - 10);
    game.enemies.push(new Enemy(game, ex, ey));
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
    game.player.update(dt);
    game.enemies.forEach(e => e.update(dt));
    
    playerMesh.position.set(game.player.x, 0.5, game.player.y);
    
    while (enemyMeshes.length < game.enemies.length) {
      let m = new THREE.Mesh(enemyGeo, enemyMat);
      scene.add(m);
      enemyMeshes.push(m);
    }
    game.enemies.forEach((e, i) => {
      enemyMeshes[i].position.set(e.x, 0.5, e.y);
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
  
  enemyMeshes.forEach(m => scene.remove(m));
  enemyMeshes.length = 0;
  
  spawnLevelEntities();
});
