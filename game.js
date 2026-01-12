// ============================================
// GAME CONSTANTS
// ============================================
const GRAVITY = 0.6;
const JUMP_POWER = 15;
const MOVE_SPEED = 8;
const GROUND_Y = 600;
const PLAYER_WIDTH = 180;
const PLAYER_HEIGHT = 190;
const TILE_SIZE = 38;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 620;
const WORLD_WIDTH = 1700; // Infinite scrolling world
const ALPHABET_BLOCK_WIDTH = 100;
const ALPHABET_BLOCK_HEIGHT = 100;
const FOOT_MARGIN = 12; // pixels of horizontal leniency when deciding foot overlap
let CURRENT_CHRACTER = 'sprites/bluey-transparent.png'
const CHARACTERS = [
  {
    id: "bluey",
    name: "Bluey",
    thumbnail: "sprites/bluey-transparent.png",
    sprite: "sprites/bluey-transparent.png",
    width: 100,
    height: 120,
    footOffset: 18,
  },
  {
    id: "bingo",
    name: "Bingo",
    thumbnail: "sprites/bingo-transparent.png",
    sprite: "sprites/bingo-transparent.png",
    width: 90,
    height: 110,
    footOffset: 16,
  },
];
let selectedCharacter = null;

function renderCharacterSelection() {
  const list = document.getElementById("character-list");
  list.innerHTML = "";

  CHARACTERS.forEach((char) => {
    const img = document.createElement("img");
    img.src = char.thumbnail;
    img.alt = char.name;
    img.className = "character-card";

    img.addEventListener("click", () => {
      document
        .querySelectorAll(".character-card")
        .forEach((c) => c.classList.remove("selected"));

      img.classList.add("selected");
      selectedCharacter = char;
      CURRENT_CHRACTER = img.src
    
    });

    list.appendChild(img);
  });
}

renderCharacterSelection();
// ============================================
// INPUT HANDLER
// ============================================
class InputHandler {
  constructor() {
    this.keys = {};
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;
  }

  handleKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  isPressed(key) {
    return this.keys[key] || false;
  }
}

// ============================================
// SPRITE ANIMATION HANDLER
// ============================================
class SpriteAnimator {
  constructor() {
    this.frameIndex = 0;
    this.animationCounter = 0;
    this.frameDelay = 8; // Frames between sprite updates

    // Sprite sheet data - from bluey-sprite.webp
    // Multi-row sprite sheet with various character animations
    // Supports both WebP and PNG formats
    // Frame dimensions: 64x64 pixels

    this.spriteData = {
      idle: {
        frames: [0], // First character idle
        y: 0,
        frameWidth: 64,
        frameHeight: 64,
      },
      walk: {
        frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // 12-frame walk cycle
        y: 0,
        frameWidth: 64,
        frameHeight: 64,
      },
      jump: {
        frames: [13, 14], // Jump animation
        y: 0,
        frameWidth: 64,
        frameHeight: 64,
      },
      fall: {
        frames: [15], // Falling
        y: 0,
        frameWidth: 64,
        frameHeight: 64,
      },
    };

    this.currentAnimation = "idle";
  }

  setAnimation(animationName) {
    if (this.currentAnimation !== animationName) {
      this.currentAnimation = animationName;
      this.frameIndex = 0;
      this.animationCounter = 0;
    }
  }

  update() {
    this.animationCounter++;
    if (this.animationCounter >= this.frameDelay) {
      this.animationCounter = 0;
      const animData = this.spriteData[this.currentAnimation];
      this.frameIndex = (this.frameIndex + 1) % animData.frames.length;
    }
  }

  draw(ctx, x, y, spriteSheet, facingRight) {
    if (!spriteSheet || !spriteSheet.complete) return;

    ctx.save();

    // Move origin to sprite center
    ctx.translate(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2);

    // Flip if facing left
    ctx.scale(facingRight ? 1 : -1, 1);

    // Draw sprite centered at origin
    ctx.drawImage(
      spriteSheet,
      -PLAYER_WIDTH / 2,
      -PLAYER_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT + 60
    );

    ctx.restore();
  }
}

// ============================================
// PLAYER CLASS
// ============================================
class Player {
  constructor(x, y, spriteSheet) {
    this.x = x;
    this.y = y;
    this.width = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isGrounded = false;
    this.facingRight = true;
    this.spriteSheet = spriteSheet;
    this.animator = new SpriteAnimator();
    this.startX = x;
    this.startY = y;
    this.footOffset = 100;
  }
  setCharacter(character) {
    this.spriteSheet = character.image;
    this.width = character.width;
    this.height = character.height;
    this.footOffset = character.footOffset || 0;
  }
  update(inputHandler, platforms, alphabetPlatforms = []) {
    // Horizontal movement
    this.velocityX = 0;
    if (inputHandler.isPressed("arrowleft") || inputHandler.isPressed("a")) {
      this.velocityX = -MOVE_SPEED;
      this.facingRight = false;
    }
    if (inputHandler.isPressed("arrowright") || inputHandler.isPressed("d")) {
      this.velocityX = MOVE_SPEED;
      this.facingRight = true;
    }

    // Apply gravity
    this.velocityY += GRAVITY;

    // Update position (movement before collision)
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Combine all platforms (regular + alphabet) for collision checking
    const allPlatforms = [...platforms, ...alphabetPlatforms];

    // Check if grounded and handle collisions using previous position
    this.isGrounded = false;
    // previous Y position before applying velocity (useful for robust landing)
    const previousY = this.y - this.velocityY;
    const previousBottom = previousY + this.height;
    const currentBottom = this.y + this.height;

    for (let platform of allPlatforms) {
      // Horizontal overlap check using a "foot" tolerance to avoid slipping off
      // Use the player's horizontal center (foot position) with a small margin
      const footX = this.x + this.width / 2;
      const horizontalOverlap =
        footX >= platform.x - FOOT_MARGIN &&
        footX <= platform.x + platform.width + FOOT_MARGIN;
      if (!horizontalOverlap) continue;

      // Landing from above: previous bottom was at or above platform top, and now below or equal
      if (
        this.velocityY >= 0 &&
        previousBottom <= platform.y &&
        currentBottom >= platform.y
      ) {
        // Snap to top
        this.y = platform.y - this.height;
        this.velocityY = 0;
        this.isGrounded = true;
        break; // landed on a platform - no need to check others
      }

      // Hitting head from below
      const previousTop = previousY;
      const currentTop = this.y;
      if (
        this.velocityY < 0 &&
        previousTop >= platform.y + platform.height &&
        currentTop <= platform.y + platform.height
      ) {
        // Hit the underside of a platform
        this.y = platform.y + platform.height;
        this.velocityY = 0;
        // don't set grounded
        break;
      }
      // If player is horizontally over the platform and very close to the top (tiny gap), snap down
      const gap = platform.y - currentBottom;
      if (horizontalOverlap && gap > 0 && gap <= 4 && this.velocityY >= 0) {
        // snap small floating gaps (1-4 px) to the platform
        this.y = platform.y - this.height;
        this.velocityY = 0;
        this.isGrounded = true;
        break;
      }
    }

    // Jumping
    if (
      (inputHandler.isPressed("w") ||
        inputHandler.isPressed(" ") ||
        inputHandler.isPressed("arrowup")) &&
      this.isGrounded &&
      !this.isJumping
    ) {
      this.velocityY = -JUMP_POWER;
      this.isJumping = true;
      this.isGrounded = false;
    }
    if (
      !inputHandler.isPressed(" ") &&
      !inputHandler.isPressed("arrowup") &&
      !inputHandler.isPressed("w")
    ) {
      this.isJumping = false;
    }

    // Boundary checking (left and right)
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > WORLD_WIDTH * 2)
      this.x = WORLD_WIDTH * 2 - this.width;

    // Respawn if player falls off the map
    if (this.y > CANVAS_HEIGHT + 100) {
      this.respawn();
    }

    // Update animation
    this.updateAnimation();
    this.animator.update();
  }

  updateAnimation() {
    if (!this.isGrounded) {
      if (this.velocityY < 0) {
        this.animator.setAnimation("jump");
      } else {
        this.animator.setAnimation("fall");
      }
    } else if (this.velocityX !== 0) {
      this.animator.setAnimation("walk");
    } else {
      this.animator.setAnimation("idle");
    }
  }

  checkCollision(platform) {
    // Use foot-based horizontal overlap with small margin to match landing logic
    const footX = this.x + this.width / 2;
    const withinX =
      footX >= platform.x - FOOT_MARGIN &&
      footX <= platform.x + platform.width + FOOT_MARGIN;
    return (
      withinX &&
      this.y + this.height <= platform.y + 10 &&
      this.y + this.height + this.velocityY >= platform.y
    );
  }

  respawn() {
    this.x = this.startX;
    this.y = this.startY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.isGrounded = false;
  }

  draw(ctx) {
    this.animator.draw(ctx, this.x, this.y, this.spriteSheet, this.facingRight);
  }
}

// ============================================
// PLATFORM CLASS
// ============================================
class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx) {
    // Gradient for depth
    const gradient = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x,
      this.y + this.height
    );
    gradient.addColorStop(0, "#34b233");
    gradient.addColorStop(1, "#2a9129");
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y+50, this.width, this.height);

    // Border
    ctx.strokeStyle = "#1a6b1b";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y+50, this.width, this.height);

    // Add some visual detail (tiles)
    ctx.strokeStyle = "#1a6b1b";
    ctx.lineWidth = 1;
    for (let i = this.x; i < this.x + this.width; i += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, this.y);
      ctx.lineTo(i, this.y + this.height );
      ctx.stroke();
    }
  }
}

// ============================================
// ALPHABET PLATFORM CLASS
// ============================================
class AlphabetPlatform extends Platform {
  constructor(x, y, letter) {
    super(x, y, ALPHABET_BLOCK_WIDTH, ALPHABET_BLOCK_HEIGHT);
    this.letter = letter;
    this.isColliding = false;
    this.playerOn = false; // tracks whether player is currently standing on this platform
  }

  draw(ctx) {
    // Main platform with color change on collision
    const gradient = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x,
      this.y + this.height
    );
    if (this.isColliding) {
      gradient.addColorStop(0, "#FFD700");
      gradient.addColorStop(1, "#FFA500");
    } else {
      gradient.addColorStop(0, "#FF6B9D");
      gradient.addColorStop(1, "#FF1493");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw letter
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(
      this.letter,
      this.x + this.width / 2,
      this.y + this.height / 2
    );
    ctx.shadowBlur = 0;

    this.isColliding = false;
  }
}

// ============================================
// CAMERA CLASS
// ============================================
class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
  }

  follow(target) {
    // Center camera on player, but don't go below 0 or beyond world width
    this.x = Math.max(0, target.x - this.width / 3);
    this.x = Math.min(this.x, WORLD_WIDTH * 2 - this.width);

    // Vertical scrolling with some padding
    this.y = Math.max(0, target.y - this.height / 2);
  }

  apply(ctx) {
    ctx.translate(-this.x, -this.y);
  }
}

// ============================================
// GAME CLASS
// ============================================
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.inputHandler = new InputHandler();
    // Make canvas responsive for mobile and initialize camera after sizing
    this.resizeCanvas();
    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.platforms = [];
    this.alphabetPlatforms = [];
    this.spriteSheet = new Image();
    this.spokenLetters = new Set();
    this.gameStarted = false;
    // Setup mobile touch controls (buttons in DOM)
    this.setupMobileControls();
    // Keep canvas size updated on window resize
    window.addEventListener("resize", () => this.resizeCanvas());

    // Load sprite sheet with WebP and PNG support
    this.loadSpriteSheet();
  }

  loadSpriteSheet() {
    // Load single sprite image (JPG)
    this.spriteSheet.src = CURRENT_CHRACTER;

    this.spriteSheet.onerror = () => {
      console.log("JPG not found. Trying WebP...");
      this.spriteSheet.src = "sprites/bluey-transparent.png";

      this.spriteSheet.onerror = () => {
        console.log("WebP not found. Trying PNG...");
        this.spriteSheet.src = "sprites/bluey-sprite.png";

        this.spriteSheet.onerror = () => {
          console.error("Failed to load sprite files.");
        };
      };
    };

    this.spriteSheet.onload = () => {
      console.log(
        `✓ Single sprite loaded: ${this.spriteSheet.width}x${this.spriteSheet.height}px`
      );
      this.gameStarted = true;
      this.setupLevel();
      this.gameLoop();
    };
  }

  // Resize canvas to fit viewport (mobile friendly)
  resizeCanvas() {
    try {
      const vw = Math.max(320, Math.min(window.innerWidth, CANVAS_WIDTH));
      const vh = Math.max(
        240,
        Math.min(window.innerHeight - 120, CANVAS_HEIGHT)
      );
      // Use CSS pixels for style and set backing store to device pixels
      const dpr = window.devicePixelRatio || 1;
      this.canvas.style.width = `${vw}px`;
      this.canvas.style.height = `${vh}px`;
      this.canvas.width = Math.floor(vw * dpr);
      this.canvas.height = Math.floor(vh * dpr);
      if (this.camera) {
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
      }
    } catch (e) {
      console.warn("resizeCanvas failed", e);
    }
  }

  // Wire mobile buttons to the input handler
  setupMobileControls() {
    const left = document.getElementById("btn-left");
    const right = document.getElementById("btn-right");
    const jump = document.getElementById("btn-jump");
    if (!left || !right || !jump) return;

    const setKeys = (keys, value) => {
      keys.forEach((k) => {
        this.inputHandler.keys[k] = value;
      });
    };

    const bindButton = (el, keys) => {
      const onDown = (e) => {
        e.preventDefault();
        setKeys(keys, true);
      };
      const onUp = (e) => {
        e.preventDefault();
        setKeys(keys, false);
      };
      el.addEventListener("touchstart", onDown, { passive: false });
      el.addEventListener("touchend", onUp);
      el.addEventListener("touchcancel", onUp);
      el.addEventListener("mousedown", onDown);
      el.addEventListener("mouseup", onUp);
      el.addEventListener("mouseleave", onUp);
    };

    bindButton(left, ["arrowleft", "a"]);
    bindButton(right, ["arrowright", "d"]);
    // jump: set both ' ' and 'space' so existing checks work
    bindButton(jump, [" ", "space"]);
  }

  setupLevel() {
    // Create infinite stair pattern with alphabet blocks
    // Stairs ascending to the right with alphabet platforms
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let letterIndex = 0;

    // Ground platform
    this.platforms.push(new Platform(0, GROUND_Y, WORLD_WIDTH * 2, 50));

    // Create infinite stairs using only alphabet platforms (visual + physics)
    const stairSpacing = 80; // Horizontal distance between stairs
    const stairHeight = ALPHABET_BLOCK_HEIGHT; // Vertical height per stair
    let stairX = 100;
    // top Y for the first alphabet block (so the block sits above ground)
    let stairTopY = GROUND_Y - ALPHABET_BLOCK_HEIGHT; // alphabet block height

    // Create enough alphabet blocks to cover the visible game world
    for (let i = 0; i < 40; i++) {
      // Add alphabet platform (this acts as the stair step)
      const letter = letters[letterIndex % 26];
      // Place the alphabet block such that its top is at stairTopY
      this.alphabetPlatforms.push(
        new AlphabetPlatform(stairX, stairTopY, letter)
      );

      letterIndex++;
      stairX += stairSpacing; // move right
      stairTopY -= stairHeight; // step up

      // Reset to a lower height if too high (creates valleys)
      if (stairTopY < 100) {
        stairTopY = GROUND_Y - 60;
      }
    }

    // Initialize player at start
    this.player = new Player(50, GROUND_Y - PLAYER_HEIGHT, this.spriteSheet);
  }

  handleAlphabetCollision(alphabetPlatform) {
    const colliding = this.player.checkCollision(alphabetPlatform);
    if (colliding) {
      alphabetPlatform.isColliding = true;
      // Only speak when player newly lands on the platform (was not on it previously)
      if (!alphabetPlatform.playerOn) {
        this.speakLetter(alphabetPlatform.letter);
        alphabetPlatform.playerOn = true;
      }
    } else {
      // If player is not colliding, clear the playerOn flag so next landing will re-trigger
      if (alphabetPlatform.playerOn) {
        alphabetPlatform.playerOn = false;
      }
    }
  }

  speakLetter(letter) {
    // Use Web Speech API to pronounce the letter
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(letter);
      utterance.rate = 1.2;
      utterance.pitch = 1.2;
      utterance.volume = 1;

      speechSynthesis.speak(utterance);
      console.log(`🔊 Speaking: ${letter}`);
    }
  }

  gameLoop() {
    // Update
    if (this.gameStarted) {
      this.player.update(
        this.inputHandler,
        this.platforms,
        this.alphabetPlatforms
      );

      // Check collisions with alphabet platforms
      for (let alphaPlatform of this.alphabetPlatforms) {
        this.handleAlphabetCollision(alphaPlatform);
      }

      this.camera.follow(this.player);
    }

    // Clear canvas
    this.ctx.fillStyle = "#87ceeb";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw gradient sky
    const skyGradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      this.canvas.height
    );
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(1, "#e0f6ff");
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw clouds
    this.drawClouds();

    // Apply camera transformation
    this.ctx.save();
    this.camera.apply(this.ctx);

    // Draw platforms
    for (let platform of this.platforms) {
      platform.draw(this.ctx);
    }

    // Draw alphabet platforms
    for (let alphaPlatform of this.alphabetPlatforms) {
      alphaPlatform.draw(this.ctx);
    }

    // Draw player
    if (this.gameStarted) {
      this.player.draw(this.ctx);
    }

    this.ctx.restore();

    // Draw UI (camera-independent)
    if (this.gameStarted) {
      this.drawUI();
    } else {
      this.drawLoadingScreen();
    }

    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }

  drawClouds() {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.beginPath();
    this.ctx.arc(150, 80, 50, 0, Math.PI * 2);
    this.ctx.arc(200, 60, 70, 0, Math.PI * 2);
    this.ctx.arc(250, 80, 50, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(800, 120, 50, 0, Math.PI * 2);
    this.ctx.arc(850, 100, 70, 0, Math.PI * 2);
    this.ctx.arc(900, 120, 50, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawLoadingScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "Loading Bluey Sprite...",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  drawUI() {
    // this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    // this.ctx.fillRect(10, 10, 350, 120);
    // this.ctx.fillStyle = 'white';
    // this.ctx.font = '14px Arial';
    // this.ctx.fillText(`Position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, 20, 30);
    // this.ctx.fillText(`Velocity: (${this.player.velocityX.toFixed(1)}, ${this.player.velocityY.toFixed(1)})`, 20, 50);
    // this.ctx.fillText(`Grounded: ${this.player.isGrounded}`, 20, 70);
    // this.ctx.fillText(`Animation: ${this.player.animator.currentAnimation}`, 20, 90);
    // this.ctx.fillText(`Direction: ${this.player.facingRight ? 'Right →' : 'Left ←'}`, 20, 110);
  }
}

// ============================================
// GAME INITIALIZATION
// ============================================
window.addEventListener("load", () => {
    let game = new Game();
    document.getElementById('character-list').addEventListener('click', () => {
        // Character selection logic will go here
     game = new Game();
    });
 
});
