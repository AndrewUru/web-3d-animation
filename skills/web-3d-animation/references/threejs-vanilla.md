# Vanilla Three.js

## Contents
- Setup (import map or npm)
- Renderer, scene, camera, lights
- Render loop and resize
- Hero: floating object with mouse parallax
- GLTF models and animation clips
- Embedding in a page (Astro, WordPress)
- Cleanup

## Setup

**No build step** (static HTML, WordPress, quick demos) — import map:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
} }
</script>
<script type="module">
  import * as THREE from 'three';
  import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
</script>
```

**With a bundler** (Vite, Astro, Next): `npm i three@^0.186` and `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'`. For TypeScript also `npm i -D @types/three`.

## Renderer, scene, camera, lights

```js
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap DPR: 3x phones kill fill rate
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
// outputColorSpace is SRGBColorSpace by default in r152+

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 6);

// Image-based lighting: cheap, gives PBR materials real reflections
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;

const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(3, 4, 5);
scene.add(key);
```

`alpha: true` + no `scene.background` lets the page background show through, which is what you usually want for a hero.

## Render loop and resize

Use `renderer.setAnimationLoop` (works with WebXR too) and `THREE.Timer` or `THREE.Clock` for delta time.

```js
const timer = new THREE.Timer();          // r168+; handles tab-hidden gaps better than Clock
timer.connect(document);

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);         // false: CSS controls display size
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
new ResizeObserver(resize).observe(canvas);

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.1); // clamp: avoids jumps after tab switch
  const t = timer.getElapsed();
  update(dt, t);
  renderer.render(scene, camera);
});
```

Size the canvas with CSS (`width:100%; height:100%; display:block`) and let ResizeObserver sync the drawing buffer. Observing the canvas rather than `window` handles containers that change size.

## Hero: floating object with mouse parallax

```js
const mesh = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.32, 220, 32),
  new THREE.MeshPhysicalMaterial({ color: '#6c5ce7', roughness: 0.15, metalness: 0.2, clearcoat: 1 })
);
const group = new THREE.Group();   // parent receives parallax, child receives spin
group.add(mesh);
scene.add(group);

const pointer = new THREE.Vector2();
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function update(dt, t) {
  if (reduce) return;
  mesh.rotation.y += dt * 0.4;                 // slow main spin
  mesh.position.y = Math.sin(t * 1.2) * 0.12;  // float
  const damp = THREE.MathUtils.damp;
  group.rotation.x = damp(group.rotation.x, pointer.y * 0.3, 5, dt);
  group.rotation.y = damp(group.rotation.y, pointer.x * 0.5, 5, dt);
}
```

Separating spin (child) and parallax (parent) keeps the two motions from fighting.

## GLTF models and animation clips

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const loader = new GLTFLoader().setDRACOLoader(draco);

let mixer;
loader.load('/models/robot.glb', (gltf) => {
  const model = gltf.scene;
  // Center and scale to fit ~2 units regardless of source units
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  model.position.sub(box.getCenter(new THREE.Vector3()));
  model.scale.setScalar(2 / size);
  scene.add(model);

  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
    // crossfade later: actionB.reset().play(); action.crossFadeTo(actionB, 0.4, true);
  }
}, undefined, (err) => console.error('GLTF load failed', err));

// in update(): mixer?.update(dt);
```

Compress models before shipping: `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`. Aim for < 2–3 MB per hero model.

Show a loading state with `THREE.LoadingManager` (`onProgress`, `onLoad`) and fade the canvas in when ready rather than popping.

## Embedding in a page

- **Layering**: put the canvas in a positioned container; HTML text on top with `position: relative; z-index: 1`. If the canvas is a background, give it `pointer-events: none` so links stay clickable (and listen to pointer on `window`).
- **Astro**: put the Three code in a `<script>` inside the component (Astro bundles it, client-only by nature). Use `import * as THREE from 'three'` after `npm i three`.
- **WordPress**: enqueue a module script, or paste the import-map snippet into a Custom HTML block; give the canvas a fixed-height wrapper.
- **Multiple canvases** on one page each cost a WebGL context (browsers cap ~16). For many small 3D bits, use one full-page canvas and scissor/viewport per element (drei `<View>` does this in R3F).

## Cleanup

```js
function dispose() {
  renderer.setAnimationLoop(null);
  scene.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;
      Object.values(m).forEach((v) => v?.isTexture && v.dispose());
      m.dispose();
    });
  });
  envTex.dispose(); pmrem.dispose();
  renderer.dispose();
}
```

Call it on SPA route change / component unmount, along with removing event listeners and disconnecting the ResizeObserver.
