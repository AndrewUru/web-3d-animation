# React Three Fiber (R3F) + drei

## Contents
- Install and versions
- Next.js integration
- Hero: floating object with mouse parallax
- Models (GLTF, gltfjsx, animations)
- Useful drei helpers
- Postprocessing
- Pitfalls

## Install

```bash
npm i three @react-three/fiber @react-three/drei
npm i -D @types/three   # TypeScript
```

R3F v9 pairs with React 19. On React 18, use `@react-three/fiber@8` and `@react-three/drei@9`.

## Next.js integration

The Canvas touches `window`, so it must be a client component. In the App Router:

```tsx
// components/Scene.tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Hero } from './Hero';

export default function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <Environment preset="city" />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <Hero />
    </Canvas>
  );
}
```

```tsx
// app/page.tsx — lazy-load so three.js isn't in the initial JS
import dynamic from 'next/dynamic';
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });
```

(`ssr: false` with `dynamic` must be called from a client component in recent Next versions; if the page is a server component, wrap it in a small client component.)

Give the Canvas parent an explicit height (`h-[80vh]`, `absolute inset-0`, etc.) — Canvas fills its parent, and a parent with no height means an invisible scene.

**Astro + React**: `<Scene client:only="react" />`.

## Hero: floating object with mouse parallax

```tsx
'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

export function Hero() {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.Mesh>(null!);
  const reduce = typeof window !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame((state, delta) => {
    if (reduce) return;
    mesh.current.rotation.y += delta * 0.4;
    // state.pointer is normalized -1..1 relative to the canvas
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, state.pointer.y * 0.3, 5, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, state.pointer.x * 0.5, 5, delta);
  });

  return (
    <group ref={group}>
      <Float speed={reduce ? 0 : 1.5} floatIntensity={0.6} rotationIntensity={0.2}>
        <mesh ref={mesh}>
          <torusKnotGeometry args={[1, 0.32, 220, 32]} />
          <meshPhysicalMaterial color="#6c5ce7" roughness={0.15} metalness={0.2} clearcoat={1} />
        </mesh>
      </Float>
    </group>
  );
}
```

Note: `state.pointer` only updates while the pointer is over the canvas. For a background canvas with `pointer-events: none`, pass `eventSource={document.body}` and `eventPrefix="client"` to `<Canvas>` so pointer tracking works page-wide.

## Models

```tsx
import { useGLTF, useAnimations } from '@react-three/drei';
import { useEffect, useRef } from 'react';

export function Robot(props: JSX.IntrinsicElements['group']) {
  const ref = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF('/models/robot.glb'); // Draco handled automatically
  const { actions, names } = useAnimations(animations, ref);
  useEffect(() => { actions[names[0]]?.reset().fadeIn(0.4).play(); }, [actions, names]);
  return <primitive ref={ref} object={scene} {...props} />;
}
useGLTF.preload('/models/robot.glb');
```

Wrap in `<Suspense fallback={null}>` (or drei `<Loader />` / `useProgress` for a progress UI). Use `<Center>` and `<Bounds fit clip observe>` to auto-frame models of unknown scale.

To get typed, editable JSX from a model: `npx gltfjsx model.glb --transform --types` (also compresses).

If the same GLB is rendered more than once, clone it (`scene.clone()` or drei `<Clone object={scene} />`) — a Three object can only have one parent.

## Useful drei helpers

- `<Float>` — idle bobbing/rotation
- `<Environment preset|files>` — IBL lighting; `<ContactShadows>` — cheap soft ground shadow
- `<PresentationControls>` — drag-to-rotate product viewer with spring-back, nicer than OrbitControls for heroes
- `<OrbitControls enableZoom={false} enableDamping />` — free inspection
- `<ScrollControls pages={3}>` + `useScroll()` — scroll-driven scenes inside the canvas (see scroll-and-gsap.md)
- `<Text>` / `<Text3D>` — SDF / extruded text
- `<Instances>` / `<Merged>` — instancing with JSX ergonomics
- `<MeshTransmissionMaterial>` — glass; `<MeshDistortMaterial>` — wobbly blob (both heavier than standard)
- `<PerformanceMonitor>` + `<AdaptiveDpr>` — lower quality automatically when fps drops
- `<View>` — many 3D "islands" in HTML layout sharing one canvas

## Postprocessing

```bash
npm i @react-three/postprocessing
```

```tsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
<EffectComposer>
  <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.9} />
  <Vignette darkness={0.4} />
</EffectComposer>
```

Bloom only glows what's brighter than the threshold — push emissive materials above 1 (`emissive="#fff" emissiveIntensity={3}` + `toneMapped={false}`). Disable or reduce effects on mobile.

## Pitfalls

- **Never `setState` inside `useFrame`.** It re-renders React 60×/s. Mutate refs; use zustand (`useStore.getState()`) for shared animation state.
- **Don't create objects in `useFrame`** (`new Vector3()` every frame → GC stutter). Hoist them to module scope or `useMemo`.
- **`frameloop="demand"`** for mostly static scenes; call `invalidate()` when something changes. Saves battery.
- **Hooks like `useFrame`/`useThree` only work inside `<Canvas>`** — the component that renders `<Canvas>` can't use them.
- **Interaction**: `onPointerOver`, `onClick` work on meshes directly; set `document.body.style.cursor` on hover for affordance.
