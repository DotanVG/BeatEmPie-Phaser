# Rendering and scaling audit

This document records the experimental rendering pass on
`experiment/rendering-and-scaling-pass`. The gameplay coordinate system remains unchanged.

## Pipeline inventory

| Area | Implementation |
| --- | --- |
| Phaser | 4.2.1 (resolved dependency) |
| Renderer | `Phaser.AUTO`: WebGL when available, Canvas fallback |
| Internal resolution | Fixed 1920×1080 framebuffer and 1920×1080 logical world |
| Scale mode | `Phaser.Scale.NONE` with a discrete `ScaleManager.setZoom()` controller |
| Display scaling | Phaser writes the canvas CSS width, height, margins, bounds, and input transform |
| Centering | `Phaser.Scale.CENTER_BOTH`; unused viewport area uses the navy shell background |
| Pixel policy | Integer upscale; exact reciprocal downscale using a divisor shared by 1920 and 1080 |
| Fullscreen | Fullscreen API targets `#game-root`; F11-style desktop fullscreen is detected separately |
| Resize | `ResizeObserver`, window/visual viewport resize, orientation, and fullscreen events queue one animation-frame refresh |
| Orientation | Coarse-pointer portrait detection uses layout viewport dimensions; gameplay/audio pause ownership is tracked |
| Portrait view | Responsive DOM overlay inside the fullscreen target, with safe-area padding and reduced-motion support |
| Texture filtering | Global `pixelArt: true` plus explicit nearest-neighbour enforcement for existing and newly added textures |
| Camera | Static 1920×1080 main camera, zoom 1, global `roundPixels: true`; impact shake/flash only |
| HUD | Screen-space objects in the gameplay scene via `setScrollFactor(0)` |
| Device pixel ratio | No dynamic framebuffer multiplication; the fixed 1080p buffer caps fill cost. Browser DPR composites the discretely sized canvas |

## Previous scaling path

The renderer produced a 1920×1080 canvas. `Scale.NONE` left its display size alone, then CSS
forced both dimensions to the complete viewport with `!important`. Phaser refreshed bounds and
input transforms after resize, but it did not control the display aspect ratio.

Scaling therefore happened in the browser, not in Phaser. A 1440×900 window displayed the
16:9 framebuffer as 16:10, and a portrait phone compressed it into a tall rectangle. `pixelated`
kept nearest sampling but could not prevent geometric distortion or uneven pixel sizes when the
horizontal and vertical ratios differed.

## Scale Manager decision

- `FIT` preserves aspect ratio and is the best general-purpose Phaser mode, but it consumes the
  available area with arbitrary ratios such as 0.711× or 1.333×.
- `ENVELOP` preserves aspect ratio by cropping, which can remove HUD and arena edges.
- `RESIZE` changes the logical canvas and camera dimensions. BeatEmPie is authored around a fixed
  1920×1080 arena, so this would require responsive gameplay coordinates and increase variable GPU fill.
- `EXPAND` changes the logical viewport to expose more world on one axis, affecting arena composition,
  screen-space UI assumptions, and render cost.
- `NONE` remains justified only because the custom controller now delegates sizing back to Phaser
  through `setZoom()` instead of overriding the canvas with CSS.

The selected policy is intentionally conservative: it letterboxes rather than choosing a fractional
upscale, and uses `1 / n` downscales where `n` divides both internal dimensions. Examples:

| Available area | Display canvas | Scale |
| --- | --- | --- |
| 3840×2160 | 3840×2160 | 2× |
| 2560×1440 | 1920×1080 | 1× |
| 1440×900 | 960×540 | 1/2× |
| 852×393 | 640×360 | 1/3× |
| 568×320 | 480×270 | 1/4× |

The policy is pure and covered by `tests/pixelPerfectScale.test.mjs`.

## CSS and viewport changes

The canvas no longer has forced viewport width or height. CSS retains only display behavior,
nearest-neighbour `image-rendering`, cursor suppression, and shell presentation. Phaser owns the
inline canvas dimensions and centering margins, which keeps pointer mapping aligned with rendering.

The portrait instruction is intentionally outside the 16:9 rendering surface but inside
`#game-root`. It therefore fills the portrait viewport, respects safe-area insets, remains visible
after entering element fullscreen, and is not distorted by game scaling.

## Texture audit

All shipped PNG images and sprite sheets use the same texture manager. Procedural enemies,
particles, warning markers, effects, and background textures are generated into that manager.
No project Render Texture is currently created. Phaser's `pixelArt` flag already defaults texture
sampling to nearest-neighbour; `textureFiltering.ts` now explicitly applies nearest filtering to
loaded/generated textures and listens for later additions, including dynamic textures.

## Camera and sprite audit

Gameplay does not pan, follow, interpolate, or zoom its camera. Camera zoom stays at integer 1, so
Phaser 4 can apply camera pixel rounding. Impact shakes are rounded by the same camera setting.
There is no camera change to make without changing the visual motion or gameplay feel.

Major display scales are authored values: player 1.4; base enemies 1–1.1; menu and pie effects use
additional animated fractional scales. Replacing these with nearby integers would change character
and effect proportions. Nearest filtering plus discrete whole-canvas scaling addresses sampling
consistency without changing those authored proportions.

## HUD decision

The camera is static, and every HUD object already uses `setScrollFactor(0)`. A second UI camera
would render through the same framebuffer and display scale, so it would not make the HUD sharper;
it would add ignore-list ownership, duplicated camera work, and more edge cases. The existing
screen-space HUD architecture is retained.

## Performance and limitations

- No shader, post-processing pass, bloom, blur, or extra camera was added.
- The framebuffer remains capped at 1920×1080 instead of multiplying by DPR, keeping fill and memory stable.
- Resize work is coalesced to one animation frame and only updates the display zoom when a threshold changes.
- Letterboxing is deliberate. At some laptop and QHD sizes the game uses less screen area than `FIT`
  would, in exchange for a discrete pixel ratio.
- OS-level fractional display scaling can still introduce a final compositor resample. Web content
  cannot reliably control that device-level transform.
- Canvas text uses Phaser's dynamic textures and the same nearest filtering. Increasing per-text DPR
  would raise texture memory and is not justified while the complete framebuffer is discretely scaled.
