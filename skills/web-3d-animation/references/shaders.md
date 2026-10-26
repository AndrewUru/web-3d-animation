# Shaders: gradients, noise, distortion, particles

## Contents
- When to write a shader
- ShaderMaterial template (vanilla + R3F)
- Animated gradient blob (vertex noise)
- Full-screen gradient background
- GPU particles
- Extending built-in materials

## When to write a shader

Reach for a shader when the look is procedural (flowing gradients, noise displacement, dissolve, holographic) or when you need to move thousands of points every frame — the GPU does it for free, the CPU can't. For ordinary objects, a PBR material + environment is better looking and less work.

Three.js also ships TSL (Three Shading Language, node-based, works with WebGPU). It's the future direction, but GLSL `ShaderMaterial` remains fully supported with WebGLRenderer and has far more examples online; default to GLSL unless the project already uses `WebGPURenderer`.

## ShaderMaterial template

```js
const uniforms = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color('#ff6b6b') },
  uColorB: { value: new THREE.Color('#5f27cd') },
};
const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
// render loop: uniforms.uTime.value += dt;
```

R3F:

```tsx
const uniforms = useMemo(() => ({ uTime: { value: 0 }, /* … */ }), []);
useFrame((_, dt) => { uniforms.uTime.value += dt; });
<mesh><sphereGeometry args={[1, 128, 128]} /><shaderMaterial uniforms={uniforms} vertexShader={vs} fragmentShader={fs} /></mesh>
```

Keep `uniforms` stable (useMemo) — recreating the object resets the material every render.

Note: custom ShaderMaterial output skips tone mapping/color conversion unless you include `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` at the end of `main()`. Add them so colors match the rest of the scene.

## Animated gradient blob

Vertex displacement with simplex noise; normal-based color in the fragment.

```glsl
// vertexShader
uniform float uTime;
varying vec3 vNormal;
varying float vDisp;
// --- paste a 3D simplex noise function here: snoise(vec3) (Ashima/Stefan Gustavson, MIT) ---
void main() {
  float d = snoise(normal * 1.5 + uTime * 0.3) * 0.25;
  vDisp = d;
  vNormal = normalize(normalMatrix * normal);
  vec3 p = position + normal * d;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
```

```glsl
// fragmentShader
uniform vec3 uColorA; uniform vec3 uColorB;
varying vec3 vNormal; varying float vDisp;
void main() {
  float fres = pow(1.0 - abs(vNormal.z), 2.0);
  vec3 col = mix(uColorA, uColorB, smoothstep(-0.25, 0.25, vDisp));
  col += fres * 0.35;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

Use a high-segment sphere (128×128) or `IcosahedronGeometry(1, 64)` so displacement is smooth. Flat-looking blob → lower noise frequency; too busy → lower amplitude and speed.

Paste a well-known simplex noise implementation (e.g. `webgl-noise` by Ashima Arts / Stefan Gustavson, MIT). Don't invent one.

## Full-screen gradient background

Render a `PlaneGeometry(2, 2)` with a vertex shader that outputs `gl_Position = vec4(position.xy, 0.0, 1.0)` (ignores camera), set `depthWrite: false`, `renderOrder = -1`. In the fragment, mix 3–4 brand colors with low-frequency noise of `vUv + uTime * 0.05`. This is the classic "Stripe-style" mesh gradient and is very cheap.

## GPU particles

```js
const COUNT = 20000;
const pos = new Float32Array(COUNT * 3);
const seed = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  const r = 3 * Math.cbrt(Math.random());          // uniform in a sphere
  const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
  pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
  seed[i] = Math.random();
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSize: { value: 18 * renderer.getPixelRatio() } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    uniform float uTime; uniform float uSize; attribute float aSeed;
    void main() {
      vec3 p = position;
      p.y += sin(uTime * 0.6 + aSeed * 6.28) * 0.15;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = uSize * (0.5 + aSeed) / -mv.z;   // size attenuation
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);              // soft round dot
      gl_FragColor = vec4(vec3(0.8, 0.85, 1.0), a);
    }`,
});
scene.add(new THREE.Points(geo, mat));
```

All motion happens in the vertex shader, so 20k–200k points stay at 60 fps. To morph between shapes, store a second position attribute (`aTarget`) and `mix(position, aTarget, uProgress)` driven by GSAP/scroll.

## Extending built-in materials

To keep PBR lighting but add a twist (e.g. vertex wobble), patch a standard material instead of rewriting it:

```js
const mat = new THREE.MeshStandardMaterial({ color: '#888' });
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uniforms.uTime;
  shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n transformed += normal * sin(position.y * 4.0 + uTime) * 0.05;'
  );
};
```

The `three-custom-shader-material` package wraps this pattern with a nicer API for R3F.
