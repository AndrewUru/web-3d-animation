// All assets are procedural. Three.js 0.186.1 is bundled in vendor/.
const CONFIG = {color:'#adf4d4', speed:0.35, energy:0.35, cameraZ:6.7};
const $ = id => document.getElementById(id);
const prompts = [
['01','Materia viva','Superficie ondulada, reflejos y color iridiscente.','Crea una escultura procedural en HTML y Three.js: esfera con deformación sinusoidal en un vertex shader GLSL, normales recalculadas en el fragment shader mediante derivadas, gradiente verde menta y azul, efecto Fresnel y rotación basada en delta time. Añade controles de distorsión, color y velocidad, y alternativa estática sin WebGL.','La posición de cada vértice se desplaza en la GPU; las normales de la superficie deformada definen su iluminación.'],
['02','Un viaje al desplazarte','La página dirige la cámara y la separación de las piezas.','Crea una historia de tres capítulos con un canvas sticky de Three.js. Usa el progreso normalizado del scroll para separar una escultura en fragmentos y desplazar la cámara. Suaviza el progreso con MathUtils.damp y delta time. Mantén el texto en HTML y desactiva el movimiento vinculado al scroll con prefers-reduced-motion.','El scroll se convierte en un valor de 0 a 1; ese valor controla la cámara, la escala y la expansión.'],
['03','Universo de partículas','De una esfera a una galaxia en espiral.','Crea un campo de partículas con THREE.Points y ShaderMaterial. Almacena una distribución esférica en position y otra espiral en aTarget. Interpola ambas en el vertex shader con uProgress y añade una repulsión suave alrededor del puntero. Reduce el número de puntos y el DPR en móvil.','Dos posiciones por partícula permiten transformar toda la nube en la GPU con una sola llamada de dibujo.'],
['04','Un objeto, tres materiales','Aurora líquida, metal pulido y holograma.','Añade un configurador accesible para cambiar entre un shader iridiscente, MeshPhysicalMaterial metálico con RoomEnvironment y un holograma con líneas de barrido. Incluye selector de geometría, color e iluminación. Actualiza los cambios incluso cuando la animación está pausada y libera las geometrías reemplazadas.','El objeto conserva su geometría y cambia de material. El metal utiliza iluminación de entorno; los otros materiales son GLSL.'],
['05','Fragmentar sin saturar','Cientos de piezas, una geometría compartida.','Construye una escultura orbital con 480 fragmentos mediante InstancedMesh. Comparte geometría y material; coloca cada pieza sobre un toro y expándela radialmente según el scroll. Añade una semilla determinista por pieza y rotación temporal suave. Evita asignaciones de memoria en el bucle.','InstancedMesh dibuja las piezas con matrices individuales y una geometría compartida.'],
['06','La experiencia completa','Un prompt para construir tu propia versión.','Construye una experiencia premium llamada Órbita con HTML, CSS y Three.js. Incluye portada con escultura líquida procedural, configurador de geometría/material/color/iluminación/velocidad/distorsión, historia sticky de tres capítulos con fragmentación y morph de partículas, y una galería de prompts copiables con explicaciones. Usa fondo azul negro, acentos menta y tipografía editorial. No requieras assets externos. Incluye calidad móvil, pausa global, movimiento reducido, fallback, cleanup, guía y pruebas en navegador.','Combina las técnicas anteriores en escenas independientes con un estado común y renderizado solo mientras son visibles.']
];
for (const [n,title,description,prompt,how] of prompts) {
 const card=document.createElement('article');card.className='prompt-card';
 card.innerHTML=`<span class="number">${n} / PROMPT</span><h3>${title}</h3><p>${description}</p><details><summary>Ver prompt y técnica</summary><blockquote></blockquote><p>${how}</p></details><button>Copiar prompt ↗</button><span class="copy-status" role="status"></span>`;
 const full='Usa $web-3d-animation. '+prompt;card.querySelector('blockquote').textContent=full;
 card.querySelector('button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(full);card.querySelector('.copy-status').textContent='Copiado. Pégalo en Codex.';}catch{card.querySelector('details').open=true;card.querySelector('.copy-status').textContent='Selecciona y copia el prompt.';}});
 $('prompt-grid').append(card);
}
const cleanups=[];
try {
 const THREE=await import('three');const {RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
 createExperience(THREE,RoomEnvironment);
} catch(error){
 cleanups.forEach(fn=>fn());$('settings').disabled=true;$('poster').hidden=false;$('journey-poster').hidden=false;
 $('scene').style.visibility='hidden';$('journey-canvas').style.visibility='hidden';
 $('status').textContent='Vista estática: no se pudo iniciar WebGL. Consulta README.md.';console.warn(error);
}
function createExperience(T,RoomEnvironment){
 const state={paused:false,speed:CONFIG.speed,energy:CONFIG.energy,quality:'auto',progress:0,pointer:new T.Vector2()};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const events=new AbortController(),opts={signal:events.signal};cleanups.push(()=>events.abort());
 const views=[];const geometries=new Set(),materials=new Set();
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 function view(canvasId,stageId){
  const canvas=$(canvasId),stage=$(stageId),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,0.1,100);camera.position.z=CONFIG.cameraZ;
  const v={canvas,stage,renderer,scene,camera,visible:true,lost:false,last:null,time:0,update:()=>{},layout:()=>{}};
  const env=new RoomEnvironment(),pm=new T.PMREMGenerator(renderer),target=pm.fromScene(env,0.04);scene.environment=target.texture;env.dispose();pm.dispose();
  v.draw=()=>{if(!v.lost)renderer.render(scene,camera);};
  v.resize=()=>{const r=stage.getBoundingClientRect();const low=state.quality==='low'||(state.quality==='auto'&&innerWidth<700);renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:2));renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();v.layout();v.draw();};
  v.sync=()=>{v.last=null;renderer.setAnimationLoop(v.visible&&!document.hidden&&!v.lost&&!state.paused&&!reduced.matches?time=>{const dt=v.last===null?0:Math.min((time-v.last)/1000,.1);v.last=time;v.time+=dt;v.update(dt,v.time);v.draw();}:null);if(v.visible&&!document.hidden)v.draw();};
  const ro=new ResizeObserver(v.resize);ro.observe(stage);
  const io=new IntersectionObserver(([entry])=>{v.visible=entry.isIntersecting;v.sync();});io.observe(stage);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();v.lost=true;$(canvasId==='scene'?'poster':'journey-poster').hidden=false;canvas.style.visibility='hidden';v.sync();if(canvasId==='scene')$('status').textContent='Vista estática · contexto gráfico perdido';},opts);
  canvas.addEventListener('webglcontextrestored',()=>{v.lost=false;$(canvasId==='scene'?'poster':'journey-poster').hidden=true;canvas.style.visibility='visible';v.resize();v.sync();},opts);
  views.push(v);cleanups.push(()=>{renderer.setAnimationLoop(null);ro.disconnect();io.disconnect();target.dispose();renderer.dispose();});return v;
 }
 const hero=view('scene','stage'),journey=view('journey-canvas','journey-stage');
 function lights(v){const key=new T.DirectionalLight(0xffffff,3);key.position.set(3,4,5);v.scene.add(key);const fill=new T.PointLight(0x7ee7ff,15);fill.position.set(-3,-1,3);v.scene.add(fill);return [key,fill];}
 const heroLights=lights(hero);lights(journey);
 const uniforms={uTime:{value:0},uEnergy:{value:CONFIG.energy},uColor:{value:new T.Color(CONFIG.color)},uHolo:{value:0},uLight:{value:new T.Color('#ffffff')}};
 const liquid=mat(new T.ShaderMaterial({uniforms,side:T.DoubleSide,vertexShader:`
 uniform float uTime;uniform float uEnergy;varying vec3 vPosition;varying vec3 vView;varying float vWave;
 void main(){float wave=sin(position.x*3.+uTime)*sin(position.y*3.7-uTime*.7)*sin(position.z*3.3+uTime*.5);vec3 p=position+normal*wave*uEnergy*.4;vWave=wave;vPosition=p;vec4 mv=modelViewMatrix*vec4(p,1.);vView=mv.xyz;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform vec3 uColor;uniform vec3 uLight;uniform float uTime;uniform float uHolo;varying vec3 vPosition;varying vec3 vView;varying float vWave;
 void main(){vec3 n=normalize(cross(dFdx(vView),dFdy(vView)));if(!gl_FrontFacing)n=-n;vec3 eye=normalize(-vView);float fres=pow(1.-abs(dot(n,eye)),2.4);float diffuse=max(dot(n,normalize(vec3(2.,3.,4.))),0.);float bands=.5+.5*sin(vPosition.y*3.+vWave*2.+uTime*.25);vec3 color=mix(uColor*.12,vec3(.14,.28,.78),bands*.65);color+=uColor*diffuse*.65+pow(max(dot(reflect(-normalize(vec3(2.,3.,4.)),n),eye),0.),45.)*1.3;color+=fres*vec3(.5,.9,1.);color*=uLight;float scan=pow(.5+.5*sin(vPosition.y*75.-uTime*3.),6.);color=mix(color,uColor*(.16+fres*2.+scan*.7),uHolo);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));
 const metal=mat(new T.MeshPhysicalMaterial({color:CONFIG.color,metalness:.88,roughness:.18,clearcoat:1}));
 function shape(kind){if(kind==='knot')return new T.TorusKnotGeometry(.88,.3,160,24);if(kind==='torus')return new T.TorusGeometry(1.1,.36,32,100);if(kind==='ico')return new T.IcosahedronGeometry(1.4,0);return new T.SphereGeometry(1.35,160,128);}
 const mesh=new T.Mesh(geo(shape('sphere')),liquid),group=new T.Group();mesh.rotation.set(.3,.2,.1);group.add(mesh);hero.scene.add(group);
 const orbitMaterial=mat(new T.MeshBasicMaterial({color:0x80b5c5,transparent:true,opacity:.23}));
 for(let i=0;i<2;i++){const ring=new T.Mesh(geo(new T.TorusGeometry(1.95+i*.22,.006,6,180)),orbitMaterial);ring.rotation.set(1.1+i*.4,.2+i*.4,.3);hero.scene.add(ring);}
 hero.layout=()=>{hero.camera.position.z=Math.max(CONFIG.cameraZ,4.9/hero.camera.aspect);};
 hero.update=(dt,t)=>{uniforms.uTime.value=t;mesh.rotation.y+=dt*state.speed;mesh.position.y=Math.sin(t)*.09;group.rotation.x=T.MathUtils.damp(group.rotation.x,-state.pointer.y*.12,5,dt);group.rotation.y=T.MathUtils.damp(group.rotation.y,state.pointer.x*.2,5,dt);};
 // 480 fragments share a geometry/material; no objects are allocated in update().
 const count=480,instances=new T.InstancedMesh(geo(new T.IcosahedronGeometry(.065,0)),metal,count);instances.instanceMatrix.setUsage(T.DynamicDrawUsage);instances.frustumCulled=false;
 const sculpture=new T.Group();sculpture.add(instances);journey.scene.add(sculpture);
 let seed=12345;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const bases=[];for(let i=0;i<count;i++){const a=i/count*Math.PI*2*13,b=i/count*Math.PI*2;const r=1.25+.38*Math.cos(a);bases.push([r*Math.cos(b),.38*Math.sin(a),r*Math.sin(b),random()]);}
 const dummy=new T.Object3D();
 const n=12000,positions=new Float32Array(n*3),targets=new Float32Array(n*3),seeds=new Float32Array(n);
 for(let i=0;i<n;i++){const a=random()*Math.PI*2,z=random()*2-1,r=1.8+random()*.7,s=Math.sqrt(1-z*z);positions.set([r*s*Math.cos(a),r*z,r*s*Math.sin(a)],i*3);const radius=.3+Math.sqrt(random())*4.7,angle=radius*1.3+(i%3)*Math.PI*2/3+(random()-.5)*.4;targets.set([Math.cos(angle)*radius,(random()-.5)*.35,Math.sin(angle)*radius],i*3);seeds[i]=random();}
 const pg=geo(new T.BufferGeometry());pg.setAttribute('position',new T.BufferAttribute(positions,3));pg.setAttribute('aTarget',new T.BufferAttribute(targets,3));pg.setAttribute('aSeed',new T.BufferAttribute(seeds,1));
 const pu={uTime:{value:0},uProgress:{value:0},uPointer:{value:new T.Vector2()},uDpr:{value:1}};
 const particlesMat=mat(new T.ShaderMaterial({uniforms:pu,transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:`attribute vec3 aTarget;attribute float aSeed;uniform float uTime;uniform float uProgress;uniform vec2 uPointer;uniform float uDpr;varying float vSeed;void main(){vSeed=aSeed;vec3 p=mix(position,aTarget,uProgress);p.y+=sin(uTime*.5+aSeed*6.28)*.08;vec2 delta=p.xy-uPointer;float d=length(delta);p.xy+=delta/max(d,.01)*exp(-d*d)*.35;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((13.+aSeed*10.)*uDpr/-mv.z,1.,8.);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float vSeed;void main(){float d=length(gl_PointCoord-.5);float alpha=1.-smoothstep(.05,.5,d);gl_FragColor=vec4(mix(vec3(.25,.55,1.),vec3(.7,1.,.8),vSeed),alpha*.75);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));
 const particles=new T.Points(pg,particlesMat);particles.frustumCulled=false;journey.scene.add(particles);
 let smoothProgress=0;
 function composition(progress,t){
  const spread=T.MathUtils.smoothstep(progress,.12,.68),galaxy=T.MathUtils.smoothstep(progress,.48,1);
  for(let i=0;i<count;i++){const [x,y,z,s]=bases[i];dummy.position.set(x*(1+spread*1.8),y*(1+spread*4),z*(1+spread*1.8));dummy.rotation.set(s*6+t*.12,x+t*.1,z);dummy.scale.setScalar((.7+s*.8)*(1-galaxy*.94));dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);}instances.instanceMatrix.needsUpdate=true;
  sculpture.rotation.set(.4+spread*.5,t*.08+progress*1.5,.15);
  particles.rotation.set(.1+galaxy*.55,t*.025,galaxy*.18);pu.uProgress.value=galaxy;pu.uTime.value=t;
  const mobile=innerWidth<650;sculpture.position.set(mobile?0:1.65,mobile?.8:0,0);particles.position.copy(sculpture.position);
  journey.camera.position.set(Math.sin(progress*2)*.5,galaxy*1.8,mobile?10.5+galaxy*3:8+galaxy*2.5);journey.camera.lookAt(0,0,0);
 }
 function quality(){const low=state.quality==='low'||(state.quality==='auto'&&innerWidth<700);pg.setDrawRange(0,low?4000:n);instances.count=low?240:count;views.forEach(v=>v.resize());pu.uDpr.value=journey.renderer.getPixelRatio();}
 journey.layout=()=>{composition(reduced.matches?.45:smoothProgress,journey.time);pu.uDpr.value=journey.renderer.getPixelRatio();};
 journey.update=(dt,t)=>{smoothProgress=T.MathUtils.damp(smoothProgress,state.progress,4,dt);pu.uPointer.value.lerp(state.pointer,1-Math.exp(-4*dt));composition(smoothProgress,t);};
 function scroll(){const r=$('viaje').getBoundingClientRect();state.progress=T.MathUtils.clamp(-r.top/(r.height-innerHeight),0,1);$('progress-bar').style.width=state.progress*100+'%';$('chapter').textContent=state.progress<.33?'01 — ENSAMBLAR':state.progress<.67?'02 — FRAGMENTAR':'03 — EXPANDIR';}
 function sync(){views.forEach(v=>v.sync());$('pause').textContent=reduced.matches?'Movimiento reducido':state.paused?'Reanudar':'Pausar todo';$('pause').disabled=reduced.matches;$('pause').setAttribute('aria-pressed',String(state.paused||reduced.matches));$('status').textContent=reduced.matches?'Movimiento reducido · composición estática':state.paused?'Experiencia en pausa':'Mueve el puntero · transforma la materia';}
 function redraw(){views.forEach(v=>{if(v.visible)v.draw();});}
 function replaceShape(){const old=mesh.geometry;old.dispose();geometries.delete(old);mesh.geometry=geo(shape($('shape').value));redraw();}
 $('shape').addEventListener('change',replaceShape,opts);
 $('material').addEventListener('change',()=>{mesh.material=$('material').value==='metal'?metal:liquid;uniforms.uHolo.value=$('material').value==='holo'?1:0;redraw();},opts);
 $('color').value=CONFIG.color;
 $('color').addEventListener('input',e=>{uniforms.uColor.value.set(e.target.value);metal.color.set(e.target.value);redraw();},opts);
 $('speed').addEventListener('input',e=>{state.speed=Number(e.target.value);$('speed-value').value=state.speed.toFixed(2);},opts);
 $('energy').addEventListener('input',e=>{state.energy=Number(e.target.value);uniforms.uEnergy.value=state.energy;$('energy-value').value=state.energy.toFixed(2);redraw();},opts);
 function setLight(){const colors={studio:['#ffffff','#7ee7ff'],sunset:['#ffc599','#ff5599'],ice:['#b5d8ff','#456bff']};const [a,b]=colors[$('light').value];heroLights[0].color.set(a);heroLights[1].color.set(b);uniforms.uLight.value.set(a);redraw();}
 $('light').addEventListener('change',setLight,opts);
 $('quality').addEventListener('change',()=>{state.quality=$('quality').value;quality();},opts);
 $('pause').addEventListener('click',()=>{state.paused=!state.paused;sync();},opts);
 $('reset').addEventListener('click',()=>{
  Object.assign(state,{paused:false,speed:CONFIG.speed,energy:CONFIG.energy,quality:'auto'});state.pointer.set(0,0);
  $('shape').value='sphere';$('material').value='liquid';$('light').value='studio';$('quality').value='auto';$('color').value=CONFIG.color;$('speed').value=CONFIG.speed;$('energy').value=CONFIG.energy;
  $('speed-value').value=CONFIG.speed.toFixed(2);$('energy-value').value=CONFIG.energy.toFixed(2);uniforms.uEnergy.value=CONFIG.energy;uniforms.uHolo.value=0;uniforms.uColor.value.set(CONFIG.color);metal.color.set(CONFIG.color);mesh.material=liquid;mesh.rotation.set(.3,.2,.1);mesh.position.y=0;group.rotation.set(0,0,0);views.forEach(v=>v.time=0);uniforms.uTime.value=0;replaceShape();setLight();quality();sync();
 },opts);
 window.addEventListener('pointermove',e=>{if(!reduced.matches&&!state.paused)state.pointer.set((e.clientX/innerWidth*2-1)*3,-(e.clientY/innerHeight*2-1)*3);},opts);
 window.addEventListener('scroll',scroll,{...opts,passive:true});window.addEventListener('resize',()=>{scroll();quality();},opts);
 document.addEventListener('visibilitychange',sync,opts);
 reduced.addEventListener('change',()=>{if(reduced.matches){uniforms.uTime.value=0;mesh.rotation.set(.3,.2,.1);mesh.position.y=0;group.rotation.set(0,0,0);composition(.45,0);}sync();},opts);
 cleanups.push(()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());});
 let disposed=false;window.disposeHero=()=>{if(disposed)return;disposed=true;cleanups.forEach(fn=>fn());};
 window.addEventListener('pagehide',e=>{if(!e.persisted)window.disposeHero();},opts);
 scroll();quality();composition(reduced.matches?.45:state.progress,0);$('settings').disabled=false;$('poster').hidden=true;$('journey-poster').hidden=true;sync();
}
