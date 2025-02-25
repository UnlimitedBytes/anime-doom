// Game state variables
let gameStarted = false;
let gameOver = false;
let score = 0;
let health = 100;
let ammo = 30;
let maxAmmo = 30;
let isPaused = false;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let enemiesKilled = 0;
let gameTime = 0;
let gameStartTime = 0;

// Three.js variables
let scene, camera, renderer;
let controls;
let raycaster;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let enemies = [];
let ammoPickups = [];
let walls = [];
let floor;
let ceiling;
let audioContext;
let backgroundMusic;
let bulletTime = 0;
let analyser;
let audioDataArray;
let audioVisualization;

// Audio synthesizer
function createAudioContext() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create analyzer for audio visualization
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  audioDataArray = new Uint8Array(bufferLength);
  analyser.connect(audioContext.destination);
  
  return audioContext;
}

// Create audio visualization
function createAudioVisualization() {
  audioVisualization = document.createElement('canvas');
  audioVisualization.id = 'audioVisualization';
  audioVisualization.width = 200;
  audioVisualization.height = 100;
  audioVisualization.style.position = 'absolute';
  audioVisualization.style.top = '100px';
  audioVisualization.style.right = '20px';
  audioVisualization.style.zIndex = '100';
  document.body.appendChild(audioVisualization);
}

// Update audio visualization
function updateAudioVisualization() {
  if (!analyser || !audioVisualization) return;
  
  const canvas = audioVisualization;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Get frequency data
  analyser.getByteFrequencyData(audioDataArray);
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw visualization
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, width, height);
  
  const barWidth = width / audioDataArray.length;
  let x = 0;
  
  for (let i = 0; i < audioDataArray.length; i++) {
    const barHeight = audioDataArray[i] / 255 * height;
    
    // Use a gradient based on frequency
    const hue = i / audioDataArray.length * 360;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    
    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    x += barWidth;
  }
}

// Synthesize sound effects
function synthShoot() {
  const ctx = audioContext || createAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(150, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  oscillator.connect(gainNode);
  gainNode.connect(analyser); // Connect to analyser instead of destination

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2);
}

function synthHit() {
  const ctx = audioContext || createAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(300, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}

function synthPickup() {
  const ctx = audioContext || createAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(400, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}

function synthDamage() {
  const ctx = audioContext || createAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(100, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(analyser);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
}

function createBackgroundMusic() {
  const ctx = audioContext || createAudioContext();
  
  // Connect to analyser for visualization
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3; // Lower volume
  masterGain.connect(analyser);
  
  // Create a simple looping background track
  const playNote = (freq, time, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration - 0.1);

    osc.connect(gain);
    gain.connect(masterGain); // Connect to masterGain

    osc.start(time);
    osc.stop(time + duration);
  };

  const loopLength = 4; // 4 seconds per loop
  const startTime = ctx.currentTime;

  // Bass line
  for (let i = 0; i < 20; i++) {
    // Play for 20 loops (80 seconds)
    const loopStart = startTime + i * loopLength;

    // E, G, A, C pattern
    playNote(82.41, loopStart, 1);
    playNote(98.0, loopStart + 1, 1);
    playNote(110.0, loopStart + 2, 1);
    playNote(130.81, loopStart + 3, 1);
  }

  // Lead line with delay
  for (let i = 0; i < 20; i++) {
    const loopStart = startTime + i * loopLength + 0.5; // Offset by half a second

    // Simple melody
    playNote(164.81, loopStart, 0.5);
    playNote(196.0, loopStart + 1, 0.5);
    playNote(220.0, loopStart + 2, 0.5);
    playNote(261.63, loopStart + 3, 0.5);
  }
}

// Add these variables at the top of your file with other global variables
let loadingManager;
let loadingScreen;
let loadingProgress = 0;
let assetsLoaded = false;
const bullets = [];

// Create loading screen
function createLoadingScreen() {
  loadingScreen = document.createElement('div');
  loadingScreen.id = 'loadingScreen';
  loadingScreen.innerHTML = `
    <div class="loading-container">
      <h1>ANIME DOOM</h1>
      <div class="loading-bar-container">
        <div class="loading-bar" id="loadingBar"></div>
      </div>
      <div class="loading-text">LOADING ASSETS <span id="loadingPercent">0%</span></div>
      <div class="loading-animation">
        <div class="loading-circle"></div>
        <div class="loading-circle"></div>
        <div class="loading-circle"></div>
      </div>
    </div>
  `;
  document.body.appendChild(loadingScreen);
}

// Initialize loading manager
function initLoadingManager() {
  loadingManager = new THREE.LoadingManager();
  
  loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    loadingProgress = Math.floor((itemsLoaded / itemsTotal) * 100);
    document.getElementById('loadingBar').style.width = loadingProgress + '%';
    document.getElementById('loadingPercent').textContent = loadingProgress + '%';
  };
  
  loadingManager.onLoad = function() {
    assetsLoaded = true;
    
    // Add a slight delay before hiding loading screen for dramatic effect
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(loadingScreen);
        // Show start screen after loading is complete
        document.getElementById('startScreen').style.display = 'flex';
      }, 1000);
    }, 500);
  };
}

// Initialize the game
function init() {
  // Create loading screen first
  createLoadingScreen();
  initLoadingManager();
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 0, 30);

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 1.6; // Eye height

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("gameCanvas"),
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Create controls
  controls = new THREE.PointerLockControls(camera, document.body);

  // Create raycaster
  raycaster = new THREE.Raycaster();

  // Add event listeners
  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);
  document.addEventListener("click", onClick, false);
  window.addEventListener("resize", onWindowResize, false);

  // Create game info display
  createGameInfo();
  
  // Create audio visualization
  createAudioVisualization();
  
  // Create lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Create maze
  createMaze();

  // Create enemies
  createEnemies();

  // Create ammo pickups
  createAmmoPickups();

  // Start animation loop
  animate();
}

// Create maze
function createMaze() {
  // Define maze layout (1 = wall, 0 = empty)
  const mazeLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.7,
    metalness: 0.2,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.8,
    metalness: 0.1,
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Create walls, floor, and ceiling
  const wallGeometry = new THREE.BoxGeometry(2, 3, 2);
  const floorGeometry = new THREE.PlaneGeometry(30, 30);
  const ceilingGeometry = new THREE.PlaneGeometry(30, 30);

  // Create floor
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // Create ceiling
  ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3;
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  // Create walls
  for (let i = 0; i < mazeLayout.length; i++) {
    for (let j = 0; j < mazeLayout[i].length; j++) {
      if (mazeLayout[i][j] === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.x = (j - mazeLayout[i].length / 2) * 2;
        wall.position.z = (i - mazeLayout.length / 2) * 2;
        wall.position.y = 1.5;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push(wall);
      }
    }
  }

  // Find a safe spawn position (an empty cell)
  let safeSpawnFound = false;
  let spawnX = 0;
  let spawnZ = 0;
  
  // Try to find the first empty cell (preferably near the edge)
  for (let i = 1; i < mazeLayout.length - 1 && !safeSpawnFound; i++) {
    for (let j = 1; j < mazeLayout[i].length - 1 && !safeSpawnFound; j++) {
      if (mazeLayout[i][j] === 0) {
        // Found an empty cell
        spawnX = (j - mazeLayout[i].length / 2) * 2;
        spawnZ = (i - mazeLayout.length / 2) * 2;
        
        // Check if this position is clear of walls
        let isClear = true;
        for (const wall of walls) {
          const wallPos = wall.position.clone();
          const distance = Math.sqrt(
            Math.pow(wallPos.x - spawnX, 2) + 
            Math.pow(wallPos.z - spawnZ, 2)
          );
          
          if (distance < 1.5) {
            isClear = false;
            break;
          }
        }
        
        if (isClear) {
          safeSpawnFound = true;
        }
      }
    }
  }
  
  // If we couldn't find a safe spawn, use a hardcoded position that should be safe
  if (!safeSpawnFound) {
    // Use the position of the second cell in the second row, which is typically empty
    spawnX = (1 - mazeLayout[0].length / 2) * 2;
    spawnZ = (1 - mazeLayout.length / 2) * 2;
  }
  
  // Set player starting position to the safe spawn point
  camera.position.x = spawnX;
  camera.position.z = spawnZ;
  camera.position.y = 1.6; // Eye height
}

// Create enemies
function createEnemies() {
  // Enemy positions (x, z)
  const enemyPositions = [
    [0, 0],
    [4, -4],
    [-4, 4],
    [8, -8],
    [-8, 8],
    [0, -8],
    [8, 0],
    [-8, 0],
    [0, 8],
  ];

  // Create enemy geometry and materials
  const enemyGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.5);

  // Load anime girl textures with loading manager
  const textureLoader = new THREE.TextureLoader(loadingManager);
  const girl1Texture = textureLoader.load('girl-1.jpg');
  const girl2Texture = textureLoader.load('girl-2.jpg');
  const girl3Texture = textureLoader.load('girl-3.jpg');
  const girl4Texture = textureLoader.load('girl-4.jpg');
  
  // Create anime girl materials for each side of the box
  const createEnemyMaterials = (frontTexture) => [
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // right
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // left
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // top
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // bottom
    new THREE.MeshBasicMaterial({ map: frontTexture }), // front - face with texture
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // back
  ];

  // Create enemies
  for (let i = 0; i < enemyPositions.length; i++) {
    // Cycle through all four textures
    let texture;
    switch (i % 4) {
      case 0:
        texture = girl1Texture;
        break;
      case 1:
        texture = girl2Texture;
        break;
      case 2:
        texture = girl3Texture;
        break;
      case 3:
        texture = girl4Texture;
        break;
    }
    
    const enemyMaterials = createEnemyMaterials(texture);
    
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterials);
    enemy.position.x = enemyPositions[i][0];
    enemy.position.z = enemyPositions[i][1];
    enemy.position.y = 0.9;
    enemy.castShadow = true;
    enemy.receiveShadow = true;

    // Add health bar
    const healthBarGeometry = new THREE.BoxGeometry(1, 0.1, 0.1);
    const healthBarMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
    });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.y = 2.2;
    enemy.add(healthBar);

    // Add enemy properties
    enemy.userData.health = 100;
    enemy.userData.maxHealth = 100;
    enemy.userData.healthBar = healthBar;
    enemy.userData.velocity = new THREE.Vector3();
    enemy.userData.direction = new THREE.Vector3();
    enemy.userData.speed = 0.02 + Math.random() * 0.02; // Random speed
    enemy.userData.lastAttack = 0;
    enemy.userData.pathfindCooldown = 0; // Add pathfinding cooldown
    enemy.userData.currentPath = null; // Current pathfinding direction
    
    // Add shooting properties
    enemy.userData.ammo = 5; // Give each enemy 5 ammo
    enemy.userData.lastShot = 0; // Last time enemy shot
    enemy.userData.shootCooldown = 1500; // 1.5 seconds between shots
    enemy.userData.playerVisibleTime = 0; // How long the player has been visible
    enemy.userData.canSeePlayer = false; // Whether the enemy can see the player

    scene.add(enemy);
    enemies.push(enemy);
  }
}

// Create ammo pickups
function createAmmoPickups() {
  // Ammo pickup positions (x, z)
  const ammoPositions = [
    [2, 2],
    [-2, -2],
    [6, -6],
    [-6, 6],
    [10, -10],
    [-10, 10],
  ];

  // Create ammo pickup geometry and material
  const ammoGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const ammoMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  // Create ammo pickups
  for (let i = 0; i < ammoPositions.length; i++) {
    const ammoPickup = new THREE.Mesh(ammoGeometry, ammoMaterial);
    ammoPickup.position.x = ammoPositions[i][0];
    ammoPickup.position.z = ammoPositions[i][1];
    ammoPickup.position.y = 0.5;
    ammoPickup.userData.rotationSpeed = 0.02 + Math.random() * 0.02; // Random rotation speed
    ammoPickup.userData.bounceSpeed = 0.005 + Math.random() * 0.005; // Random bounce speed
    ammoPickup.userData.bounceHeight = 0.2 + Math.random() * 0.2; // Random bounce height
    ammoPickup.userData.bounceOffset = Math.random() * Math.PI * 2; // Random bounce offset
    ammoPickup.userData.ammoAmount = 10; // Amount of ammo to give

    scene.add(ammoPickup);
    ammoPickups.push(ammoPickup);
  }
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle key down events
function onKeyDown(event) {
  if (gameOver) return;

  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      moveLeft = true;
      break;
    case "ArrowDown":
    case "KeyS":
      moveBackward = true;
      break;
    case "ArrowRight":
    case "KeyD":
      moveRight = true;
      break;
    case "Space":
      if (canJump) {
        velocity.y += 150; // Reduced from 250 to keep player within bounds
        canJump = false;
      }
      break;
  }
}

// Handle key up events
function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      moveLeft = false;
      break;
    case "ArrowDown":
    case "KeyS":
      moveBackward = false;
      break;
    case "ArrowRight":
    case "KeyD":
      moveRight = false;
      break;
  }
}

// Handle click events
function onClick(event) {
  if (!assetsLoaded) return; // Ignore clicks if assets aren't loaded
  
  if (!gameStarted) {
    // Start game
    document.getElementById("startScreen").style.display = "none";
    controls.lock();
    gameStarted = true;
    createBackgroundMusic();
    return;
  }

  if (gameOver) {
    // Restart game
    if (event.target.id === "restartButton") {
      location.reload();
    }
    return;
  }

  if (!controls.isLocked) {
    controls.lock();
    return;
  }

  // Shoot
  if (ammo > 0) {
    // Check cooldown
    const now = performance.now();
    if (now - bulletTime < 250) {
      // 250ms cooldown
      return; // This return should be inside a function
    }
    bulletTime = now;

    ammo--;
    document.getElementById("ammo").textContent = `AMMO: ${ammo}/${maxAmmo}`;

    // Play shoot sound
    synthShoot();

    // Create muzzle flash
    const flash = document.createElement("div");
    flash.style.position = "absolute";
    flash.style.top = "50%";
    flash.style.left = "50%";
    flash.style.width = "100px";
    flash.style.height = "100px";
    flash.style.backgroundColor = "rgba(255, 255, 0, 0.5)";
    flash.style.borderRadius = "50%";
    flash.style.transform = "translate(-50%, -50%)";
    flash.style.pointerEvents = "none";
    flash.style.zIndex = "100";
    document.body.appendChild(flash);

    // Remove muzzle flash after 100ms
    setTimeout(() => {
      document.body.removeChild(flash);
    }, 100);

    // Raycast to check for hits
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(enemies);

    if (intersects.length > 0) {
      const enemy = intersects[0].object;

      // Damage enemy
      enemy.userData.health -= 20;

      // Update health bar
      const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
      enemy.userData.healthBar.scale.x = Math.max(0.01, healthPercent);

      // Change health bar color based on health
      if (healthPercent > 0.6) {
        enemy.userData.healthBar.material.color.setHex(0x00ff00);
      } else if (healthPercent > 0.3) {
        enemy.userData.healthBar.material.color.setHex(0xffff00);
      } else {
        enemy.userData.healthBar.material.color.setHex(0xff0000);
      }

      // Play hit sound
      synthHit();

      // Check if enemy is dead
      if (enemy.userData.health <= 0) {
        scene.remove(enemy);
        enemies.splice(enemies.indexOf(enemy), 1);
        score += 100;
        enemiesKilled++; // Increment enemies killed counter
        document.getElementById("score").textContent = `SCORE: ${score}`;
        document.getElementById("enemiesKilled").textContent = `ENEMIES KILLED: ${enemiesKilled}`;
      }
    }
  } else {
    // Click sound for empty gun
    const ctx = audioContext || createAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
  }
}

// Update game state
function update(time) {
  if (!gameStarted || gameOver || isPaused) return;

  const delta = (time - prevTime) / 1000;
  
  // Update FPS counter
  updateFPS(time);
  
  // Update game time
  updateGameTime();
  
  // Update audio visualization
  updateAudioVisualization();

  // Store old position for collision response
  const oldPosition = camera.position.clone();

  // Fix movement direction calculation
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);

  direction.normalize();

  // Apply movement if controls are locked
  if (controls.isLocked) {
    // Set a fixed movement speed
    const moveSpeed = 5;
    
    // FIX: Remove the negative signs that were inverting the controls
    if (moveForward || moveBackward) velocity.z = direction.z * moveSpeed;
    if (moveLeft || moveRight) velocity.x = direction.x * moveSpeed;

    // Apply velocity
    controls.moveRight(velocity.x * delta);
    controls.moveForward(velocity.z * delta);

    // Reset horizontal velocity
    velocity.x = 0;
    velocity.z = 0;
  }

  // Handle vertical movement (gravity and jumping) with limits
  velocity.y -= 9.8 * delta; // Apply gravity
  velocity.y = Math.max(velocity.y, -10); // Terminal velocity

  if (controls.isLocked) {
    const newY = camera.position.y + velocity.y * delta;
    // Limit jump height to 3.0 units (reduced from 4.6)
    camera.position.y = Math.max(1.6, Math.min(newY, 3.0)); 
    
    // If we hit the ceiling, stop upward velocity
    if (camera.position.y >= 3.0 && velocity.y > 0) {
      velocity.y = 0;
    }
  }

  // Ground check
  if (camera.position.y <= 1.6) {
    velocity.y = 0;
    camera.position.y = 1.6;
    canJump = true;
  }

  // Improved wall collision detection
  const playerRadius = 0.5;
  let collisionResponse = new THREE.Vector3();
  let hasCollision = false;

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    const playerPos = camera.position.clone();
    
    // Check collision at current height and slightly above/below
    const positions = [
      playerPos.clone().setY(1.0),
      playerPos.clone().setY(1.6),
      playerPos.clone().setY(2.2)
    ];

    for (const pos of positions) {
      const result = isColliding(pos, playerRadius, wallBox);
      if (result.collides) {
        // Calculate collision response
        const pushBack = result.normal.multiplyScalar(result.penetration);
        collisionResponse.add(pushBack);
        hasCollision = true;
      }
    }
  }

  // Apply collision response
  if (hasCollision) {
    // Apply the average collision response
    camera.position.add(collisionResponse);
    
    // Alternative: revert to old position if you prefer
    // camera.position.copy(oldPosition);
  }

  // Add boundary check to keep player in map
  const mapBounds = 14; // Half the size of our 15x15 maze
  camera.position.x = Math.max(-mapBounds, Math.min(mapBounds, camera.position.x));
  camera.position.z = Math.max(-mapBounds, Math.min(mapBounds, camera.position.z));

  // Update enemies with completely redesigned pathfinding
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    // Make enemy look at player
    enemy.lookAt(camera.position);

    // Store old position for collision detection
    const oldPosition = enemy.position.clone();
    
    // Track stuck state
    if (!enemy.userData.stuckDetection) {
      enemy.userData.stuckDetection = {
        positions: [],
        stuckTime: 0,
        isStuck: false,
        lastJumpTime: 0
      };
    }
    
    // Add position to history (keep last 10 positions)
    const stuckDetection = enemy.userData.stuckDetection;
    stuckDetection.positions.push(enemy.position.clone());
    if (stuckDetection.positions.length > 10) {
      stuckDetection.positions.shift();
    }
    
    // Check if enemy is stuck by analyzing position history
    if (stuckDetection.positions.length >= 5) {
      let totalMovement = 0;
      for (let j = 1; j < stuckDetection.positions.length; j++) {
        totalMovement += stuckDetection.positions[j].distanceTo(stuckDetection.positions[j-1]);
      }
      
      // If average movement is very small, consider the enemy stuck
      const avgMovement = totalMovement / (stuckDetection.positions.length - 1);
      if (avgMovement < 0.02) {
        stuckDetection.stuckTime += delta;
        if (stuckDetection.stuckTime > 1.0) { // Stuck for more than 1 second
          stuckDetection.isStuck = true;
        }
      } else {
        // Reset stuck timer if moving normally
        stuckDetection.stuckTime = 0;
        stuckDetection.isStuck = false;
      }
    }
    
    // Calculate direction to player
    const directionToPlayer = new THREE.Vector3();
    directionToPlayer.subVectors(camera.position, enemy.position).normalize();
    
    // Determine movement direction based on current state
    let moveDirection = new THREE.Vector3();
    
    if (stuckDetection.isStuck) {
      // STUCK BEHAVIOR: Try more aggressive escape strategies
      
      // Try to "jump" to a better position
      const now = time;
      if (now - stuckDetection.lastJumpTime > 2000) { // Only jump every 2 seconds
        stuckDetection.lastJumpTime = now;
        
        // Try several random positions around the current position
        const jumpAttempts = 8;
        const jumpRadius = 1.5;
        let jumpSuccessful = false;
        
        for (let attempt = 0; attempt < jumpAttempts; attempt++) {
          // Generate random angle and distance
          const angle = Math.random() * Math.PI * 2;
          const distance = 0.5 + Math.random() * jumpRadius;
          
          // Calculate jump position
          const jumpPos = new THREE.Vector3(
            enemy.position.x + Math.cos(angle) * distance,
            enemy.position.y,
            enemy.position.z + Math.sin(angle) * distance
          );
          
          // Check if jump position is clear
          let positionClear = true;
          for (const wall of walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            if (isColliding(jumpPos, 0.5, wallBox).collides) {
              positionClear = false;
              break;
            }
          }
          
          if (positionClear) {
            // Teleport to new position
            enemy.position.copy(jumpPos);
            jumpSuccessful = true;
            
            // Reset stuck detection
            stuckDetection.positions = [];
            stuckDetection.stuckTime = 0;
            stuckDetection.isStuck = false;
            break;
          }
        }
        
        if (!jumpSuccessful) {
          // If all jump attempts failed, try moving directly away from all walls
          let escapeDirection = new THREE.Vector3();
          
          for (const wall of walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const wallCenter = new THREE.Vector3();
            wallBox.getCenter(wallCenter);
            
            const toEnemy = new THREE.Vector3().subVectors(enemy.position, wallCenter);
            const distance = toEnemy.length();
            
            // Weight by inverse square of distance
            if (distance > 0) {
              toEnemy.normalize().multiplyScalar(1 / (distance * distance));
              escapeDirection.add(toEnemy);
            }
          }
          
          if (escapeDirection.length() > 0) {
            escapeDirection.normalize();
            moveDirection.copy(escapeDirection);
          } else {
            // Last resort: completely random direction
            const randomAngle = Math.random() * Math.PI * 2;
            moveDirection.set(
              Math.cos(randomAngle),
              0,
              Math.sin(randomAngle)
            );
          }
        }
      } else {
        // Between jumps, try random directions
        const randomAngle = Math.random() * Math.PI * 2;
        moveDirection.set(
          Math.cos(randomAngle),
          0,
          Math.sin(randomAngle)
        );
      }
    } else {
      // NORMAL BEHAVIOR: Try to navigate toward player
      
      // Check if there's a clear path to player using raycasting
      const rayStart = enemy.position.clone();
      rayStart.y = 1.0;
      
      const rayEnd = camera.position.clone();
      rayEnd.y = 1.0;
      
      const rayDirection = new THREE.Vector3().subVectors(rayEnd, rayStart).normalize();
      const raycaster = new THREE.Raycaster(rayStart, rayDirection);
      const intersects = raycaster.intersectObjects(walls);
      
      const distanceToPlayer = enemy.position.distanceTo(camera.position);
      const clearPath = intersects.length === 0 || 
                        (intersects.length > 0 && intersects[0].distance > distanceToPlayer);
      
      if (clearPath) {
        // Direct path to player is clear
        moveDirection.copy(directionToPlayer);
      } else {
        // No clear path, use potential field navigation
        
        // Attraction to player (goal-seeking behavior)
        moveDirection.copy(directionToPlayer);
        
        // Repulsion from walls (obstacle avoidance)
        const wallRepulsion = new THREE.Vector3();
        
        for (const wall of walls) {
          const wallBox = new THREE.Box3().setFromObject(wall);
          const wallCenter = new THREE.Vector3();
          wallBox.getCenter(wallCenter);
          
          const toEnemy = new THREE.Vector3().subVectors(enemy.position, wallCenter);
          const distance = toEnemy.length();
          
          // Only consider walls within influence radius
          const influenceRadius = 4.0;
          if (distance < influenceRadius) {
            // Stronger repulsion for closer walls
            const repulsionStrength = 1.0 - (distance / influenceRadius);
            toEnemy.normalize().multiplyScalar(repulsionStrength * 2.0);
            wallRepulsion.add(toEnemy);
          }
        }
        
        // Combine attraction and repulsion forces
        moveDirection.add(wallRepulsion);
        
        // Normalize the result
        if (moveDirection.length() > 0) {
          moveDirection.normalize();
        } else {
          // Fallback to direct path if forces cancel out
          moveDirection.copy(directionToPlayer);
        }
      }
    }
    
    // Apply movement with speed
    const newPosition = enemy.position.clone();
    newPosition.x += moveDirection.x * enemy.userData.speed;
    newPosition.z += moveDirection.z * enemy.userData.speed;
    
    // Check for wall collisions at the new position
    let canMove = true;
    
    for (const wall of walls) {
      const wallBox = new THREE.Box3().setFromObject(wall);
      if (isColliding(newPosition, 0.4, wallBox).collides) {
        canMove = false;
        break;
      }
    }
    
    if (canMove) {
      // Apply movement if no collision
      enemy.position.copy(newPosition);
    } else {
      // Collision detected, try sliding along walls
      
      // Try 8 directions around the unit circle
      const slideAngles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
      let slidingWorked = false;
      
      // Sort angles by how close they are to the desired direction
      const sortedAngles = slideAngles.slice().sort((a, b) => {
        const dirA = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const dirB = new THREE.Vector3(Math.cos(b), 0, Math.sin(b));
        
        const dotA = dirA.dot(moveDirection);
        const dotB = dirB.dot(moveDirection);
        
        return dotB - dotA; // Higher dot product first (more aligned)
      });
      
      // Try each direction
      for (const angle of sortedAngles) {
        const slideDir = new THREE.Vector3(
          Math.cos(angle),
          0,
          Math.sin(angle)
        );
        
        const slidePos = oldPosition.clone();
        slidePos.x += slideDir.x * enemy.userData.speed;
        slidePos.z += slideDir.z * enemy.userData.speed;
        
        let slideClear = true;
        for (const wall of walls) {
          const wallBox = new THREE.Box3().setFromObject(wall);
          if (isColliding(slidePos, 0.4, wallBox).collides) {
            slideClear = false;
            break;
          }
        }
        
        if (slideClear) {
          // Apply slide movement
          enemy.position.copy(slidePos);
          slidingWorked = true;
          break;
        }
      }
      
      // If no sliding direction worked, stay in place
      if (!slidingWorked) {
        // Don't move this frame
      }
    }

    // Keep enemy on ground
    enemy.position.y = 0.9;

    // Check if enemy can see player (line of sight)
    const rayStart = enemy.position.clone();
    rayStart.y = 1.0; // Eye level
    const rayEnd = camera.position.clone();
    const rayDirection = new THREE.Vector3().subVectors(rayEnd, rayStart).normalize();
    const raycaster = new THREE.Raycaster(rayStart, rayDirection);
    const intersects = raycaster.intersectObjects(walls);
    
    const enemyToPlayerDistance = enemy.position.distanceTo(camera.position);
    const maxShootingDistance = 15; // Maximum distance for shooting
    
    // Enemy can see player if there are no walls between them or the wall is further than the player
    const canSeePlayer = (intersects.length === 0 || 
      (intersects.length > 0 && intersects[0].distance > enemyToPlayerDistance)) &&
      enemyToPlayerDistance < maxShootingDistance;

    // Initialize shooting properties if they don't exist
    if (enemy.userData.ammo === undefined) {
      enemy.userData.ammo = 5;
      enemy.userData.lastShot = 0;
      enemy.userData.shootCooldown = 1500;
      enemy.userData.playerVisibleTime = 0;
      enemy.userData.canSeePlayer = false;
    }
    
    // Update player visibility tracking
    if (canSeePlayer) {
      if (!enemy.userData.canSeePlayer) {
        // Player just became visible
        enemy.userData.canSeePlayer = true;
        enemy.userData.playerVisibleTime = 0;
      } else {
        // Player remains visible, increment time
        enemy.userData.playerVisibleTime += delta;
        
        // If player has been visible for more than 1 second and enemy has ammo, shoot
        if (enemy.userData.playerVisibleTime > 1.0 && enemy.userData.ammo > 0) {
          const now = time;
          if (now - enemy.userData.lastShot > enemy.userData.shootCooldown) {
            // Shoot at player
            enemy.userData.lastShot = now;
            enemy.userData.ammo--;
            
            // Create muzzle flash for enemy
            const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const flashMaterial = new THREE.MeshBasicMaterial({
              color: 0xffff00,
              transparent: true,
              opacity: 0.8
            });
            const flash = new THREE.Mesh(flashGeometry, flashMaterial);
            
            // Position flash in front of enemy
            const flashPosition = enemy.position.clone();
            flashPosition.y = 1.2; // Chest height
            const flashOffset = rayDirection.clone().multiplyScalar(0.6);
            flashPosition.add(flashOffset);
            flash.position.copy(flashPosition);
            
            scene.add(flash);
            
            // Remove flash after 100ms
            setTimeout(() => {
              scene.remove(flash);
            }, 100);
            
            // Create bullet target position (player position with some inaccuracy)
            const bulletTarget = camera.position.clone();
            // Add some randomness to aim (accuracy decreases with distance)
            const accuracy = 0.1 + (enemyToPlayerDistance * 0.02);
            bulletTarget.x += (Math.random() - 0.5) * accuracy;
            bulletTarget.y += (Math.random() - 0.5) * accuracy;
            bulletTarget.z += (Math.random() - 0.5) * accuracy;
            
            // Create actual bullet projectile
            createEnemyBullet(flashPosition, bulletTarget, enemy);
            
            // Create bullet trail for visual effect
            createBulletTrail(flashPosition, bulletTarget);
          }
        }
      }
    } else {
      // Player not visible, reset tracking
      enemy.userData.canSeePlayer = false;
      enemy.userData.playerVisibleTime = 0;
    }

    // Check if enemy is close to player
    const distanceToPlayer = enemy.position.distanceTo(camera.position);

    if (distanceToPlayer < 1.5) {
      // Attack player
      const now = time;
      if (now - enemy.userData.lastAttack > 1000) {
        // Attack every 1 second
        enemy.userData.lastAttack = now;

        // Damage player
        health -= 10;
        document.getElementById("health").textContent = `HEALTH: ${health}`;

        // Play damage sound
        synthDamage();

        // Show damage flash
        const damageFlash = document.getElementById("damageFlash");
        damageFlash.style.opacity = "1";
        setTimeout(() => {
          damageFlash.style.opacity = "0";
        }, 100);

        // Check if player is dead
        if (health <= 0) {
          gameOver = true;
          controls.unlock();

          document.getElementById("gameOver").style.display = "block";
        }
      }
    }
  }

  // Update ammo pickups
  for (let i = 0; i < ammoPickups.length; i++) {
    const ammoPickup = ammoPickups[i];

    // Rotate ammo pickup
    ammoPickup.rotation.y += ammoPickup.userData.rotationSpeed;

    // Make ammo pickup bounce
    const bounceOffset =
      time * 0.001 * Math.PI + ammoPickup.userData.bounceOffset;
    const bounceHeight =
      Math.sin(bounceOffset) * ammoPickup.userData.bounceHeight;
    ammoPickup.position.y = 0.5 + bounceHeight;

    // Check if player is close to ammo pickup
    const distanceToPlayer = ammoPickup.position.distanceTo(camera.position);

    if (distanceToPlayer < 1.5) {
      // Collect ammo
      ammo = Math.min(maxAmmo, ammo + ammoPickup.userData.ammoAmount);
      document.getElementById("ammo").textContent = `AMMO: ${ammo}/${maxAmmo}`;

      // Play pickup sound
      synthPickup();

      // Remove ammo pickup
      scene.remove(ammoPickup);
      ammoPickups.splice(i, 1);
      i--;

      // Create new ammo pickup at random position
      setTimeout(() => {
        const newAmmoPickup = ammoPickup.clone();
        newAmmoPickup.position.x = (Math.random() - 0.5) * 20;
        newAmmoPickup.position.z = (Math.random() - 0.5) * 20;
        newAmmoPickup.position.y = 0.5;

        scene.add(newAmmoPickup);
        ammoPickups.push(newAmmoPickup);
      }, 10000); // Respawn after 10 seconds
    }
  }

  // Check if all enemies are dead
  if (enemies.length === 0) {
    // Spawn more enemies
    createEnemies();
  }

  // Update bullets
  updateBullets(delta);

  prevTime = time;
}

// Improved collision detection helper function
function isColliding(playerPos, radius, wallBox) {
  // Calculate closest point on wall box to player using clamp
  const closest = new THREE.Vector3();
  closest.x = Math.max(wallBox.min.x, Math.min(playerPos.x, wallBox.max.x));
  closest.y = Math.max(wallBox.min.y, Math.min(playerPos.y, wallBox.max.y));
  closest.z = Math.max(wallBox.min.z, Math.min(playerPos.z, wallBox.max.z));
  
  // Add a small buffer to the collision radius for better wall avoidance
  const collisionRadius = radius + 0.1;
  
  // Calculate squared distance between player and closest point
  const distanceSquared = playerPos.distanceToSquared(closest);
  
  // If squared distance is less than radius squared, there's a collision
  return {
    collides: distanceSquared < collisionRadius * collisionRadius,
    penetration: collisionRadius - Math.sqrt(distanceSquared),
    normal: playerPos.clone().sub(closest).normalize()
  };
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  update(performance.now());

  renderer.render(scene, camera);
}

// Start game when start button is clicked
document.getElementById("startButton").addEventListener("click", function () {
  document.getElementById("startScreen").style.display = "none";
  // Don't call init() again since we already initialized
  controls.lock();
  gameStarted = true;
  gameStartTime = performance.now(); // Set game start time
  
  // Initialize audio context on user interaction to comply with browser policies
  if (!audioContext) {
    audioContext = createAudioContext();
  }
  createBackgroundMusic();
});

// Lock controls when clicked on canvas
document.getElementById("gameCanvas").addEventListener("click", function () {
  if (gameStarted && !gameOver && !controls.isLocked) {
    controls.lock();
  }
});

// Show start screen when controls are unlocked
document.addEventListener("pointerlockchange", function () {
  if (!controls) return;

  if (document.pointerLockElement !== document.body && gameStarted && !gameOver) {
    // Game is paused
    isPaused = true;
    const pauseScreen = document.createElement("div");
    pauseScreen.id = "pauseScreen";
    pauseScreen.style.position = "absolute";
    pauseScreen.style.top = "0";
    pauseScreen.style.left = "0";
    pauseScreen.style.width = "100%";
    pauseScreen.style.height = "100%";
    pauseScreen.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    pauseScreen.style.color = "#ff0000";
    pauseScreen.style.display = "flex";
    pauseScreen.style.justifyContent = "center";
    pauseScreen.style.alignItems = "center";
    pauseScreen.style.fontSize = "48px";
    pauseScreen.style.zIndex = "250";
    pauseScreen.textContent = "PAUSED - CLICK TO RESUME";
    document.body.appendChild(pauseScreen);
  } else {
    // Game is resumed
    isPaused = false;
    const pauseScreen = document.getElementById("pauseScreen");
    if (pauseScreen) {
      document.body.removeChild(pauseScreen);
    }
  }
});

// Restart game when restart button is clicked
document.getElementById("restartButton").addEventListener("click", function () {
  location.reload();
});

// Create bullet trail effect
function createBulletTrail(start, end) {
  // Create a line for the bullet trail
  const material = new THREE.LineBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.8
  });
  
  const points = [];
  points.push(start);
  points.push(end);
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  
  // Remove the line after a short time
  setTimeout(() => {
    scene.remove(line);
  }, 100);
}

// Create game info display
function createGameInfo() {
  const gameInfo = document.createElement('div');
  gameInfo.id = 'gameInfo';
  gameInfo.style.position = 'absolute';
  gameInfo.style.top = '20px';
  gameInfo.style.right = '20px';
  gameInfo.style.color = '#ff0000';
  gameInfo.style.fontSize = '16px';
  gameInfo.style.textShadow = '2px 2px 4px #000';
  gameInfo.style.zIndex = '100';
  gameInfo.style.userSelect = 'none';
  gameInfo.style.textAlign = 'right';
  gameInfo.innerHTML = `
    <div id="fps">FPS: 0</div>
    <div id="enemiesKilled">ENEMIES KILLED: 0</div>
    <div id="gameTime">TIME: 00:00</div>
  `;
  document.body.appendChild(gameInfo);
}

// Update FPS counter
function updateFPS(time) {
  frameCount++;
  
  // Update FPS every 500ms
  if (time - lastFpsUpdate > 500) {
    fps = Math.round((frameCount * 1000) / (time - lastFpsUpdate));
    document.getElementById('fps').textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsUpdate = time;
  }
}

// Update game time
function updateGameTime() {
  if (!gameStarted || gameOver || isPaused) return;
  
  const currentTime = performance.now();
  gameTime = Math.floor((currentTime - gameStartTime) / 1000);
  
  const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
  const seconds = (gameTime % 60).toString().padStart(2, '0');
  
  document.getElementById('gameTime').textContent = `TIME: ${minutes}:${seconds}`;
}

// Hide start screen initially (it will be shown after loading)
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startScreen').style.display = 'none';
  // Initialize the game on page load
  init();
});

// Add this function to create enemy bullets
function createEnemyBullet(startPosition, targetPosition, enemy) {
  // Create bullet geometry and material
  const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  
  // Set initial position
  bullet.position.copy(startPosition);
  
  // Calculate direction vector
  const direction = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
  
  // Add properties to the bullet
  bullet.userData = {
    direction: direction,
    speed: 15, // Units per second
    damage: 5,
    lifetime: 0,
    maxLifetime: 3, // Seconds before bullet is removed
    source: 'enemy',
    sourceEnemy: enemy // Reference to the enemy that fired
  };
  
  // Add bullet to scene and bullets array
  scene.add(bullet);
  bullets.push(bullet);
  
  return bullet;
}

// Add this function to update bullets
function updateBullets(delta) {
  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];
    
    // Update bullet position
    const moveDistance = bullet.userData.speed * delta;
    bullet.position.addScaledVector(bullet.userData.direction, moveDistance);
    
    // Update lifetime
    bullet.userData.lifetime += delta;
    
    // Check if bullet has exceeded its lifetime
    if (bullet.userData.lifetime > bullet.userData.maxLifetime) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      i--;
      continue;
    }
    
    // Check for collisions with walls
    let hitWall = false;
    for (const wall of walls) {
      const wallBox = new THREE.Box3().setFromObject(wall);
      if (isColliding(bullet.position, 0.1, wallBox).collides) {
        hitWall = true;
        break;
      }
    }
    
    if (hitWall) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      i--;
      continue;
    }
    
    // Check for collision with player (only for enemy bullets)
    if (bullet.userData.source === 'enemy') {
      const distanceToPlayer = bullet.position.distanceTo(camera.position);
      if (distanceToPlayer < 0.5) { // Player hit radius
        // Damage player
        health -= bullet.userData.damage;
        document.getElementById("health").textContent = `HEALTH: ${health}`;
        
        // Play damage sound
        synthDamage();
        
        // Show damage flash
        const damageFlash = document.getElementById("damageFlash");
        damageFlash.style.opacity = "1";
        setTimeout(() => {
          damageFlash.style.opacity = "0";
        }, 100);
        
        // Check if player is dead
        if (health <= 0) {
          gameOver = true;
          controls.unlock();
          document.getElementById("gameOver").style.display = "block";
        }
        
        // Remove bullet
        scene.remove(bullet);
        bullets.splice(i, 1);
        i--;
        continue;
      }
    }
    
    // Check for collision with enemies (only for player bullets)
    if (bullet.userData.source === 'player') {
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        const distanceToEnemy = bullet.position.distanceTo(enemy.position);
        
        if (distanceToEnemy < 0.5) { // Enemy hit radius
          // Damage enemy
          enemy.userData.health -= bullet.userData.damage;
          
          // Update health bar
          const healthPercent = enemy.userData.health / enemy.userData.maxHealth;
          enemy.userData.healthBar.scale.x = Math.max(0.01, healthPercent);
          
          // Change health bar color based on health
          if (healthPercent > 0.6) {
            enemy.userData.healthBar.material.color.setHex(0x00ff00);
          } else if (healthPercent > 0.3) {
            enemy.userData.healthBar.material.color.setHex(0xffff00);
          } else {
            enemy.userData.healthBar.material.color.setHex(0xff0000);
          }
          
          // Check if enemy is dead
          if (enemy.userData.health <= 0) {
            // Remove enemy
            scene.remove(enemy);
            enemies.splice(j, 1);
            j--;
            
            // Increment score
            score += 100;
            document.getElementById("score").textContent = `SCORE: ${score}`;
          }
          
          // Remove bullet
          scene.remove(bullet);
          bullets.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }
}

// Add this function to handle player shooting
function handlePlayerShooting() {
  if (ammo > 0) {
    // Check cooldown
    const now = performance.now();
    if (now - bulletTime < 250) {
      return; // This return is now inside a function
    }
    bulletTime = now;

    ammo--;
    document.getElementById("ammo").textContent = `AMMO: ${ammo}/${maxAmmo}`;

    // Play shoot sound
    synthShoot();

    // Create muzzle flash
    const flash = document.createElement("div");
    flash.style.position = "absolute";
    flash.style.top = "50%";
    flash.style.left = "50%";
    flash.style.width = "100px";
    flash.style.height = "100px";
    flash.style.backgroundColor = "rgba(255, 255, 0, 0.5)";
    flash.style.borderRadius = "50%";
    flash.style.transform = "translate(-50%, -50%)";
    flash.style.pointerEvents = "none";
    flash.style.zIndex = "100";
    document.body.appendChild(flash);

    // Remove muzzle flash after 100ms
    setTimeout(() => {
      document.body.removeChild(flash);
    }, 100);

    // Create bullet starting position (in front of camera)
    const bulletStartPos = camera.position.clone();
    const bulletDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    bulletStartPos.addScaledVector(bulletDirection, 0.5); // Start slightly in front of camera
    
    // Create bullet target position (far in front of camera)
    const bulletTargetPos = camera.position.clone();
    bulletTargetPos.addScaledVector(bulletDirection, 100);
    
    // Create bullet geometry and material
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set initial position
    bullet.position.copy(bulletStartPos);
    
    // Add properties to the bullet
    bullet.userData = {
      direction: bulletDirection,
      speed: 20, // Units per second
      damage: 20,
      lifetime: 0,
      maxLifetime: 3, // Seconds before bullet is removed
      source: 'player'
    };
    
    // Add bullet to scene and bullets array
    scene.add(bullet);
    bullets.push(bullet);
    
    // Create bullet trail for visual effect
    createBulletTrail(bulletStartPos, bulletTargetPos);
  }
}

// Example of how to use this in your click handler:
document.addEventListener('click', function(event) {
  if (!gameStarted || gameOver) return;
  if (!controls.isLocked) {
    controls.lock();
    return;
  }
  handlePlayerShooting();
});
