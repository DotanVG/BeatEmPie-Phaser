# Phaser Learning Notes

A practical tour of the Phaser 3 concepts used in BeatEmPie, with where to find them
in this codebase. Handy if this is your first serious 2D web game framework.

## Scene lifecycle

A `Phaser.Scene` has three key methods Phaser calls for you:

- **`preload()`** — queue asset loads (runs before `create`). See `PreloadScene`.
- **`create()`** — build the scene: add objects, wire input, start systems. Runs once.
- **`update(time, delta)`** — the game loop, called every frame. `delta` is ms since the
  last frame; multiply movement by it for frame-rate independence.

Scenes can run in parallel. We use `scene.launch('PauseScene')` to overlay the pause menu
on a `scene.pause()`d `GameScene`, and `scene.start('X', data)` to switch scenes with a payload.

## Arcade Physics

The lightweight AABB physics engine. Enabled in `config.ts` (`physics.default: 'arcade'`).
Each physics sprite has a `body` with `velocity`, and we set `setVelocity(x, y)` to move
things. Gravity is zero (top-down-ish arena). We disable gravity per body and never use
world bounds for enemies (they enter from off-screen).

## Sprites

`Phaser.Physics.Arcade.Sprite` is a textured, physics-enabled game object. `Player` and
`Enemy` extend it. `setTexture`, `setTint`, `setScale`, `setFlipX`, `setDepth` are the
workhorses. We swap textures to fake animation frames.

## Groups

A `Group` is a managed collection. `this.enemies = this.physics.add.group()` lets us add
many enemies and run a single collider against all of them. `group.getChildren()` returns
the members (we cast to `Enemy[]`).

## Animations

Frame-based animations are registered on the global anim manager from a spritesheet. Our
shipped art is single-frame, so we animate **procedurally** with tweens instead (see below).
The hooks to add real frame animations live in `utils/animation.ts`.

## Colliders / overlaps

`this.physics.add.overlap(a, b, callback)` fires `callback(objA, objB)` while two bodies
overlap (no physical response), used for contact damage and pickups in `CollisionSystem`.
`collider` would also separate the bodies. AOE pie damage uses plain distance math instead.

## Cameras

`this.cameras.main` is the view. We use `camera.shake(duration, intensity)` and
`camera.flash(...)` for impact feedback. UI uses `setScrollFactor(0)` to stay fixed.

## Particles

`this.add.particles(x, y, textureKey, config)` creates an emitter. We call
`emitter.explode(count, x, y)` for one-shot bursts (impacts, deaths) and destroy the emitter
after its lifespan. See `EffectsSystem.burst`.

## Tweens

`this.tweens.add({ targets, ...props, duration, ease, yoyo, repeat })` interpolates any
numeric property over time. We use tweens for squash/stretch, pop-in, pulsing warning
markers, floating damage text, ring shockwaves and hit flashes.

## Input

`this.input.keyboard.addKeys(...)` / `createCursorKeys()` for the keyboard;
`Phaser.Input.Keyboard.JustDown(key)` for single-press edges. Pointer events
(`this.input.on('pointerdown', ...)`, `pointer.worldX/worldY`) for mouse/touch. All
centralised in `InputSystem`.

## Asset keys

Every texture/audio/animation is referenced by a **string key**. We keep them all in
`utils/assetKeys.ts` as constants so there are no scattered magic strings, and the loader +
placeholder generator agree on names.

## Scene transitions

`scene.start(key, data)` shuts down the current scene and starts another, passing `data`
into its `create(data)`. `scene.launch` runs a scene **alongside** the current one (overlays).
`scene.pause` / `scene.resume` / `scene.stop` manage lifecycle. Restarting `GameScene`
re-runs `create`, so we reset all state there and tear down listeners on `SHUTDOWN`.

## Object pooling (note)

We don’t pool aggressively — pies and particles are short-lived and explicitly destroyed,
and enemy counts are modest. If counts grew, `Group` with `get()`/`killAndHide()` recycling
would be the next step. Cooldowns are pooled-by-design as reusable `Cooldown` counters.

## Gotchas we hit

- **Reserved scene fields** — don’t shadow `Scene.input` (the input plugin). Our input
  system field is named `inputSystem` for that reason; `GameObject.state` is reserved too.
- **`requestAnimationFrame` throttling** — background/hidden tabs freeze the loop; the loop
  is delta-driven, so it resumes correctly when visible.
- **Event listener leaks** — gameplay events go through a dedicated `EventEmitter`
  (`scene.bus`) that is destroyed on shutdown, so restarts don’t stack duplicate handlers.
