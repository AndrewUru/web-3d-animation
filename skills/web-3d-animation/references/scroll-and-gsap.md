# Scroll-driven 3D and GSAP timelines

## Contents
- Choosing an approach
- GSAP ScrollTrigger + vanilla Three
- Smooth scroll with Lenis
- R3F: drei ScrollControls
- R3F: GSAP with useGSAP
- Pitfalls

## Choosing an approach

- **3D is a fixed/sticky background, normal HTML scrolls over it** → GSAP ScrollTrigger (works with vanilla or R3F). Most landing pages.
- **The whole experience lives inside the canvas** (HTML overlays positioned by scroll) → drei `<ScrollControls>` in R3F.
- **Simple "progress 0→1 across a section"** without GSAP → compute it yourself from `getBoundingClientRect()` and damp toward it.

`npm i gsap lenis` — GSAP and all its plugins (ScrollTrigger, SplitText, etc.) are free since 3.13.

## GSAP ScrollTrigger + vanilla Three

Animate plain Three properties directly; GSAP tweens any numeric property.

```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Canvas is position: fixed behind a tall page with sections #intro, #features, #cta
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '#story',      // wrapper around the sections
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,               // number = seconds of smoothing; true = locked to scrollbar
  },
  defaults: { ease: 'none' } // scrubbed timelines usually want linear segments
});

tl.to(camera.position, { x: 2, z: 4 }, 0)
  .to(mesh.rotation, { y: Math.PI * 2 }, 0)
  .to(mesh.material.color, { r: 1, g: 0.4, b: 0.2 }, 0.5)  // .color is linear RGB
  .to(camera.position, { x: 0, y: 1.5, z: 8 }, 1);

// The Three render loop keeps running and just reads the tweened values.
```

Labels per section make timing readable: `tl.addLabel('features')`. For camera moves, tween a `lookAt` target object too and call `camera.lookAt(target)` in the render loop.

**Pinning a section** while 3D plays: `scrollTrigger: { trigger: '#product', pin: true, start: 'top top', end: '+=200%', scrub: true }`.

**One-shot entrance animations** (not scrubbed): `gsap.from(mesh.scale, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '#product', start: 'top 70%' } })`.

## Smooth scroll with Lenis

Lenis makes scrubbed 3D feel buttery on trackpads/wheels. Drive it from GSAP's ticker so both share one clock:

```js
import Lenis from 'lenis';
const lenis = new Lenis({ lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Skip Lenis when `prefers-reduced-motion: reduce`. Don't add it to pages with heavy nested scroll areas without testing — it can interfere.

## R3F: drei ScrollControls

```tsx
import { ScrollControls, Scroll, useScroll } from '@react-three/drei';

function Rig() {
  const scroll = useScroll();
  useFrame((state, delta) => {
    const o = scroll.offset;              // 0..1 over all pages
    const a = scroll.range(0, 1 / 3);     // 0..1 during first third
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, 6 - o * 3, 4, delta);
    model.current.rotation.y = a * Math.PI;
  });
  return null;
}

<Canvas>
  <ScrollControls pages={3} damping={0.2}>
    <Rig />
    <Scroll html>
      <section style={{ height: '100vh' }}><h1>Intro</h1></section>
      <section style={{ height: '100vh' }}>…</section>
    </Scroll>
  </ScrollControls>
</Canvas>
```

ScrollControls creates its own scroll container, so the canvas wrapper must be full-viewport.

## R3F: GSAP with useGSAP

```tsx
import { useGSAP } from '@gsap/react';  // npm i @gsap/react
useGSAP(() => {
  gsap.to(ref.current.rotation, {
    y: Math.PI * 2,
    scrollTrigger: { trigger: '#features', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}); // auto-reverts on unmount
```

`useGSAP` must run in a component inside `<Canvas>` if it needs refs to meshes; its trigger elements are ordinary DOM nodes outside the canvas, which is fine.

## Pitfalls

- **Refresh after layout changes**: images/fonts loading shift positions → call `ScrollTrigger.refresh()` after the model or webfonts load.
- **Next.js route changes**: kill triggers on unmount (`useGSAP` does it; otherwise `ctx.revert()` from `gsap.context`).
- **Don't tween `rotation` and also set it in the render loop** — they'll fight. Tween a parent group and do idle motion on a child.
- **Mobile address bar resizing** jitters `100vh` → use `100svh`/`100lvh` for pinned sections, and `ScrollTrigger.config({ ignoreMobileResize: true })`.
- **Reduced motion**: replace the scrubbed timeline with `tl.progress(1)` or a few static states per section.
