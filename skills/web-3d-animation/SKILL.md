---
name: web-3d-animation
description: Build smooth, production-ready 3D animations for the web with Three.js and React Three Fiber — animated hero sections, scroll-driven 3D, rotating product viewers, particle fields, floating/morphing objects, GLTF model animation, shader effects and interactive scenes that react to the mouse. Use this skill whenever the user wants anything 3D moving on a web page, mentions Three.js, R3F, react-three-fiber, drei, WebGL, GLB/GLTF models, "3D hero", "3D scroll animation", "3D landing page", particles, or asks to make a site "more 3D/immersive", even if they don't name a library.
---

# Web 3D Animation

Goal: a 3D scene that looks intentional, runs at 60 fps on a mid-range laptop and phone, and degrades gracefully. Most bad web 3D fails on the same few things — frame-rate-dependent motion, flat lighting, wrong color space, no resize/DPR handling, and leaked GPU memory — so this skill front-loads those.

## 1. Pick the stack

Decide from the user's project, not preference:

| Situation | Use | Read |
|---|---|---|
| Plain HTML, Astro, WordPress, a single demo file, or no framework mentioned | Vanilla Three.js via ES modules | `references/threejs-vanilla.md` |
| React / Next.js / Remix / Vite-React | React Three Fiber + drei | `references/react-three-fiber.md` |
| Animation tied to page scroll, or timeline/sequenced motion | Add GSAP (+ ScrollTrigger) and optionally Lenis | `references/scroll-and-gsap.md` |
| Custom look: gradients, noise, distortion, glow | Shader material | `references/shaders.md` |

Always read `references/performance.md` before shipping anything with many objects, particles, models or post-processing.

Known-good versions (Oct 2026): `three@0.186`, `@react-three/fiber@9` (needs React 19), `@react-three/drei@10`, `@react-three/postprocessing@3`, `gsap@3.15` (all plugins incl. ScrollTrigger are free), `lenis@1.3`. Pin the same `three` version everywhere — mixing an import-map URL of one version with addons from another is a common silent breakage.

For a quick standalone demo, start from `assets/starter.html` (import map, renderer, lights, resize, reduced motion, cleanup already done) and replace the scene content.

## 2. Workflow

1. **Clarify the brief in one pass** if it's vague: what object(s), what motion, what triggers it (load / scroll / hover / loop), where it lives on the page, brand colors. If the user is unavailable, choose sensible defaults and state them.
2. **Block out** the scene with primitives first (box, sphere, torus knot) to nail camera framing and motion timing before investing in models or shaders.
3. **Light and shade**: environment map + one key light beats five point lights (see §3).
4. **Animate** with time-based motion and easing (see §3).
5. **Integrate** into the page: canvas sizing, layering under/over HTML, pointer events, loading state.
6. **Harden**: reduced motion, resize/DPR, visibility pause, dispose, mobile check (see `performance.md`).
7. **Verify** — open it in a browser if you can (Playwright/headless Chrome with `--use-gl=swiftshader` or `--enable-unsafe-swiftshader`), take a screenshot, and check the console for errors. Look at the screenshot: is the object framed, lit, and visible? A black canvas usually means camera inside/behind the object, no lights on a lit material, or a failed import.

## 3. Principles that make it look good

**Motion is time-based, never frame-based.** Use `clock.getDelta()` / R3F's `delta`. `rotation.y += 0.01` runs twice as fast on a 120 Hz screen.

**Ease and damp, don't snap.** For following a target (mouse, scroll), damp toward it every frame: `THREE.MathUtils.damp(current, target, lambda, delta)` (lambda ≈ 4–8). For authored sequences use GSAP easing (`power3.out`, `expo.inOut`). Linear motion reads as mechanical.

**Layer motion at different frequencies.** A main slow rotation + a small sine "float" + subtle mouse parallax feels alive; a single spin feels like a screensaver. Keep secondary motions small (amplitude ~0.05–0.2 units).

**Light with an environment.** `RoomEnvironment` + `PMREMGenerator` (vanilla) or drei `<Environment preset="city" />` gives physically based materials real reflections. Add one directional key light for shape and shadows. `MeshStandardMaterial`/`MeshPhysicalMaterial` with no light or environment renders black.

**Color management.** Three r152+ defaults to sRGB output and linear workflow. Keep `renderer.outputColorSpace = THREE.SRGBColorSpace`, set `texture.colorSpace = THREE.SRGBColorSpace` on color/albedo textures only (not normal/roughness maps), and use `ACESFilmicToneMapping` or `AgXToneMapping` for a filmic look.

**Frame the camera deliberately.** Narrow FOV (30–45°) looks premium and product-like; wide FOV (60–75°) feels immersive. Leave negative space where HTML text sits.

**Respect the user.** Honor `prefers-reduced-motion` (stop autoplay loops, keep a static, well-composed frame). Pause rendering when the canvas is off-screen or the tab is hidden. Give the canvas `aria-hidden="true"` if decorative, or a text alternative if it conveys content.

**Clean up.** On unmount/navigation: cancel the animation loop, remove listeners, `dispose()` geometries, materials, textures, render targets and the renderer. R3F disposes what it created; you still dispose what you made manually.

## 4. Common patterns (where to find them)

- Rotating/floating hero object with mouse parallax → `threejs-vanilla.md` §Hero, `react-three-fiber.md` §Hero
- Scroll-scrubbed camera move or object transform → `scroll-and-gsap.md`
- GLB model with built-in animation clips → `threejs-vanilla.md` §GLTF, `react-three-fiber.md` §Models
- Thousands of particles / instances → `performance.md` §Instancing, `shaders.md` §Particles
- Gradient blob / noise distortion background → `shaders.md`
- Bloom/glow → `react-three-fiber.md` §Postprocessing (use sparingly; it's expensive on mobile)

## 5. Delivering

- State which stack you chose and why in one line.
- Give complete, runnable code: imports, the component/file, and where it mounts. No `// ...rest of setup` gaps.
- List install commands with versions when adding packages.
- If you used a model or texture, say where it should live (`/public/models/…`) and that the user must supply it, or use a primitive fallback so the code runs immediately.
- Mention the one or two knobs the user is most likely to tweak (speed, colors, camera distance).
