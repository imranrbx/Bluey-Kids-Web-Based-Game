# Bluey Platformer Game - Setup Guide

## 📦 Project Structure

```
bluey-game/
├── index.html              # Main game HTML file
├── game.js                 # Game logic and classes
├── style.css               # Game styling
├── sprites/
│   └── bluey-spritesheet.png   # Bluey character sprite sheet
└── README.md              # This file
```

## 🎮 How to Play

1. **Open `index.html`** in your web browser
2. **Use Controls:**
   - ⬅️ **Arrow Left** or **A** - Move left
   - ➡️ **Arrow Right** or **D** - Move right
   - ⬆️ **Space** - Jump

3. **Objective:** Navigate through the platforms to reach the end of the level

## 🎨 Sprite Sheet Details

The game uses the **Bluey sprite sheet** (`sprites/bluey-spritesheet.png`):
- **Frame size:** 64x64 pixels
- **Animations included:**
  - Idle (frame 0)
  - Walk cycle (frames 1-12)
  - Jump (frames 13-14)
  - Fall (frame 15)
  - Additional character variations

The sprite animator automatically:
- Flips the sprite based on movement direction
- Cycles through animation frames smoothly
- Transitions between animations based on player state

## 🎯 Game Features

### Player Mechanics
- ✅ Sprite-based animations (Bluey character)
- ✅ Gravity and physics
- ✅ Jump mechanics with variable height
- ✅ Platform collision detection
- ✅ Camera follows player
- ✅ Respawn system (falls off the map)

### Level Design
- ✅ Ground floor
- ✅ 6 floating platforms at various heights
- ✅ Extended world (1600px wide)
- ✅ Camera scrolling

### Debug UI
- Player position (X, Y)
- Grounded status
- Current animation name

## 💻 Code Architecture

### Key Classes

**InputHandler**
- Manages keyboard input
- Tracks pressed keys

**SpriteAnimator**
- Handles sprite sheet animation
- Manages frame cycling
- Supports sprite flipping

**Player**
- Player entity with physics
- Animation state management
- Collision detection with platforms
- Respawn functionality

**Platform**
- Static platform objects
- Collision detection
- Visual rendering with gradients

**Camera**
- Viewport management
- Follows player
- Prevents going beyond world boundaries

**Game**
- Main game loop
- Level setup
- Sprite loading
- Rendering pipeline

## 🔧 Customization

### Adjust Physics
Edit these constants in `game.js`:
```javascript
const GRAVITY = 0.6;          // Gravity strength
const JUMP_POWER = 12;        // Jump force
const MOVE_SPEED = 5;         // Horizontal movement speed
const GROUND_Y = 400;         // Ground platform Y position
```

### Modify Animations
Edit the `spriteData` in `SpriteAnimator` class:
```javascript
this.spriteData = {
    idle: { frames: [0], ... },
    walk: { frames: [1,2,3,4,5,6,7,8,9,10,11,12], ... },
    jump: { frames: [13,14], ... },
    fall: { frames: [15], ... }
};
```

### Add More Platforms
In the `setupLevel()` method:
```javascript
this.platforms.push(new Platform(x, y, width, height));
```

## 📝 License
Created for educational purposes.

## ❓ Troubleshooting

**Game won't load:**
- Check browser console for errors (F12)
- Ensure sprite sheet file exists: `sprites/bluey-spritesheet.png`

**Sprite not showing:**
- Verify the sprite sheet path in Game constructor
- Check image dimensions (should be accessible)

**Performance issues:**
- Reduce the number of platforms
- Decrease animation frame delay in SpriteAnimator

---

**Enjoy playing! 🎮**
