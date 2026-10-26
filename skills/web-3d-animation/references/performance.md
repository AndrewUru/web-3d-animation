# Performance and robustness checklist

Target: 60 fps on a mid-range laptop and a 3-year-old phone. Measure, don't guess — Chrome DevTools Performance panel, `renderer.info` (draw calls, triangles, textures), and `stats-gl` or drei `<Perf>` from `r3f-perf` during development.

## Budget rules of thumb (mobile-safe hero)

- Draw calls: < 100 (each mesh with its own material ≈ 1+ call)
- Triangles: < 500k visible
- Textures: ≤ 2048px, compressed (KTX2/Basis via `KTX2Loader`, or WebP), power-of-two
- Model download: < 2–3 MB after Draco/Meshopt
- Pixel ratio capped at 2 (1.5 on low-end), antialias off if using post-processing with SMAA/FXAA

## Biggest wins, in order

1. **Cap DPR.** `setPixelRatio(Math.min(devicePixelRatio, 2))`. Fill rate is the #1 mobile bottleneck.
2. **Stop rendering when nobody can see it.** IntersectionObserver on the canvas container + `visibilitychange`: call `renderer.setAnimationLoop(null)` (vanilla) or set R3F `frameloop="never"`/`"demand"` when off-screen.
3. **Instancing** for repeated objects: one `InstancedMesh` with N matrices instead of N meshes.
   ```js
   const inst = new THREE.InstancedMesh(geo, mat, 1000);
   const m = new THREE.Matrix4();
   for (let i = 0; i < 1000; i++) { m.setPosition(rx(), ry(), rz()); inst.setMatrixAt(i, m); }
   inst.instanceMatrix.needsUpdate = true;
   ```
   Animate per-instance in a shader when possible; updating 1000 matrices on CPU each frame is OK, 50k isn't.
4. **Share geometries and materials.** Create once, reuse across meshes.
5. **Bake lighting** into textures for static scenes; avoid realtime shadows or limit to one light with a small `shadow.mapSize` (1024) and tight shadow camera bounds. `ContactShadows` (R3F) is often enough.
6. **Post-processing is expensive** — every pass is a full-screen draw. Use one composer with merged effects (pmndrs `postprocessing` merges automatically), and skip it on mobile.
7. **Avoid per-frame allocations** (`new Vector3()` in the loop) and per-frame `traverse()`.
8. **Lazy-load** three.js and models: dynamic import after first paint, or when the section scrolls near the viewport. Show a poster image until ready.

## Adaptive quality

- R3F: `<PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(2)} />` and `<AdaptiveDpr pixelated />`.
- Vanilla: measure average frame time over ~60 frames; if > 20 ms, drop pixel ratio and disable effects.
- Feature-detect low-end: `navigator.hardwareConcurrency <= 4` or a small-screen media query → simpler scene (fewer particles, no transmission/glass material, no bloom).

## Robustness

- **WebGL unavailable / context lost**: wrap renderer creation in try/catch and show a static image fallback. Listen for `webglcontextlost` on the canvas and show the fallback too.
- **Reduced motion**: `matchMedia('(prefers-reduced-motion: reduce)')` → render one composed frame (or very slow idle) and skip scroll scrubbing and smooth scroll.
- **Resize**: ResizeObserver on the canvas container; update camera aspect and renderer size.
- **Memory leaks on SPA navigation**: dispose geometries, materials, textures, render targets, PMREM targets and the renderer; remove listeners; kill GSAP/ScrollTrigger instances. Check `renderer.info.memory` stays flat when navigating back and forth.
- **Safari/iOS**: test there. Large textures (> 4096), many float textures and some post effects fail or crash silently on older iPhones.

## Verifying headlessly

When you can run a browser, a quick smoke test catches most breakage:

```bash
pip install playwright && python -m playwright install chromium
```

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto("file:///path/to/index.html"); pg.wait_for_timeout(2500)
    pg.screenshot(path="shot.png"); print(errors or "no console errors")
```

Then look at `shot.png`: framed, lit, not black. Software rendering is slow, so don't read fps from it.
