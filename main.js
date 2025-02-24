// Game state variables
let gameStarted = false;
let gameOver = false;
let score = 0;
let health = 100;
let ammo = 30;
let maxAmmo = 30;

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

// Audio synthesizer
function createAudioContext() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
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
  gainNode.connect(ctx.destination);

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

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(100, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.3);
}

function createBackgroundMusic() {
  const ctx = audioContext || createAudioContext();

  // Create a simple looping background track
  const playNote = (freq, time, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration - 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

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

// Initialize the game
function init() {
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
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Create lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Create controls
  controls = new THREE.PointerLockControls(camera, document.body);

  // Create raycaster for shooting
  raycaster = new THREE.Raycaster();

  // Create maze
  createMaze();

  // Create enemies
  createEnemies();

  // Create ammo pickups
  createAmmoPickups();

  // Add event listeners
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("click", onClick);
  window.addEventListener("resize", onWindowResize);

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

  // Create wall material with texture
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  // Create floor material
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.9,
    metalness: 0.1,
  });

  // Create ceiling material
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

  // Set player starting position
  camera.position.x = -mazeLayout[0].length + 3;
  camera.position.z = -mazeLayout.length + 3;
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

  // Create anime girl textures for each side of the box
  const enemyMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // right
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // left
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // top
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // bottom
    new THREE.MeshBasicMaterial({ color: 0xffcccc }), // front - face
    new THREE.MeshBasicMaterial({ color: 0xff9999 }), // back
  ];

  // Create enemies
  for (let i = 0; i < enemyPositions.length; i++) {
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
        velocity.y += 350;
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
    if (now - bulletTime < 250) return; // 250ms cooldown
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
        document.getElementById("score").textContent = `SCORE: ${score}`;
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
  if (!gameStarted || gameOver) return;

  const delta = (time - prevTime) / 1000;

  // Update velocity based on movement
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  velocity.y -= 9.8 * 100.0 * delta; // Gravity

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

  // Move player
  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Check if player is on ground
  if (camera.position.y < 1.6) {
    velocity.y = 0;
    camera.position.y = 1.6;
    canJump = true;
  }

  // Update enemies
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    // Make enemy look at player
    enemy.lookAt(camera.position);

    // Calculate direction to player
    const directionToPlayer = new THREE.Vector3();
    directionToPlayer.subVectors(camera.position, enemy.position).normalize();

    // Move enemy towards player
    enemy.position.x += directionToPlayer.x * enemy.userData.speed;
    enemy.position.z += directionToPlayer.z * enemy.userData.speed;

    // Keep enemy on ground
    enemy.position.y = 0.9;

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

  prevTime = time;
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
  init();
  controls.lock();
  gameStarted = true;
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

  if (
    document.pointerLockElement !== document.body &&
    gameStarted &&
    !gameOver
  ) {
    // Game is paused
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
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const length = start.distanceTo(end);

  const trailGeometry = new THREE.CylinderGeometry(0.01, 0.01, length, 8);
  trailGeometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  trailGeometry.applyMatrix4(
    new THREE.Matrix4().makeTranslation(0, 0, length / 2)
  );

  const trailMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.5,
  });
  const trail = new THREE.Mesh(trailGeometry, trailMaterial);

  trail.position.copy(start);
  trail.lookAt(end);

  scene.add(trail);

  // Remove trail after 100ms
  setTimeout(() => {
    scene.remove(trail);
  }, 100);
}
