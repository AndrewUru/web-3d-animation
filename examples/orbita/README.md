# Órbita — Materia imposible

Demostración avanzada de `web-3d-animation`, con recursos generados por código. HTML, CSS y JavaScript sin framework; Three.js 0.186.1 está incluido en vendor. No necesita npm, conexión a Internet, imágenes ni modelos externos para funcionar.

## Ejecutar

1. Extrae el ZIP completo.
2. Abre una terminal dentro de `ejemplo-web-3d`.
3. Con Python 3 instalado, ejecuta:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

4. Abre http://127.0.0.1:8000. Detén el servidor con Ctrl+C.

También puedes usar un servidor HTTP de tu editor. No abras index.html con doble clic: los módulos requieren HTTP. Usa un navegador moderno con WebGL 2.

## Explorar la experiencia

### 1. Materia viva

La portada contiene una esfera deformada mediante ondas sinusoidales en un vertex shader GLSL. Las derivadas de su posición deformada permiten calcular normales en el fragment shader. Un gradiente, iluminación direccional aproximada y Fresnel producen el acabado iridiscente. Dos anillos enmarcan la escultura.

### 2. El configurador

- Geometría: esfera líquida, nudo, anillo o cristal.
- Materia: aurora líquida, metal pulido con iluminación de entorno o holograma con líneas de barrido.
- Color, velocidad de rotación y amplitud de distorsión.
- Iluminación: estudio, atardecer o polar.
- Calidad: automática (ligera en móvil), ligera o alta.
- Pausar todo: detiene ambas escenas y las transformaciones por desplazamiento. Los controles visuales siguen funcionando.
- Restablecer: devuelve los controles a sus valores iniciales.

La distorsión afecta a los materiales de shader; el metal usa geometría sin deformación. La velocidad controla la rotación de la escultura principal; para detener todos los efectos usa Pausar todo.

### 3. El viaje

Una escena sticky acompaña tres capítulos: ensamblar, fragmentar y expandir. El progreso del desplazamiento, suavizado por tiempo, dirige la cámara y las transformaciones. Las piezas usan InstancedMesh: 480 en calidad alta y 240 en ligera. La nube utiliza THREE.Points con 12 000 puntos en alta y 4 000 en ligera. El shader interpola entre posiciones esféricas y una galaxia de tres brazos. El puntero desplaza suavemente un área del campo.

### 4. Los prompts

Seis tarjetas incluyen un prompt completo, una explicación de la técnica y un botón para copiar:

1. Materia viva: deformación e iridiscencia.
2. Viaje al desplazarte: progreso, cámara y estructura sticky.
3. Universo de partículas: morph en GPU y respuesta al puntero.
4. Tres materiales: configurador de materiales y luz.
5. Fragmentación: geometría compartida con InstancedMesh.
6. Experiencia completa: instrucciones para recrear el conjunto.

Abre «Ver prompt y técnica», o pulsa «Copiar prompt» y pégalo en Codex. Si el navegador no permite el portapapeles, el texto se despliega para copiarlo manualmente.

## Usar la habilidad

En este equipo ya está instalada como `web-3d-animation`. Invócala con `$web-3d-animation`. Para otro equipo, adjunta a Codex el `.skill` del paquete y solicita su instalación.

Ejemplo de adaptación:

> Usa $web-3d-animation y adapta Órbita a mi marca [nombre]. Usa [colores], cambia la esfera por [objeto procedural o modelo GLB] y conserva los controles, los prompts y las opciones de accesibilidad. Mi proyecto usa [HTML / React / Next.js].

## Personalizar el código

- `index.html`: contenido, controles, capítulos y mapa de imports.
- `styles.css`: aspecto, colores, diseño móvil y escena sticky.
- `app.js`: configuración, prompts, shaders, escenas, instancias y eventos.
- `vendor/`: Three.js y su licencia MIT; conserva LICENSE al redistribuir.

`CONFIG` define color, velocidad, distorsión y distancia de cámara. Sincroniza los valores visibles de los inputs al cambiar los valores iniciales. `prompts` contiene los textos de las seis tarjetas. `composition()` controla la fragmentación y la cámara; `aTarget` define las posiciones de la galaxia. `quality()` define los límites de partículas e instancias.

No se utiliza ruido externo: la deformación combina ondas sinusoidales. La iluminación de shader es una aproximación artística, mientras que el metal usa MeshPhysicalMaterial y RoomEnvironment. No hay bloom ni texturas externas.

## Accesibilidad y rendimiento

La interfaz es HTML con controles etiquetados, navegación por teclado y foco visible. La preferencia del sistema de movimiento reducido detiene los bucles y fija la escena narrativa en una composición estática. Las escenas dejan de renderizarse fuera de pantalla o al ocultar la pestaña. La calidad ligera limita el DPR a 1. Una alternativa estática permanece disponible si WebGL falla o pierde su contexto.

En navegación de una aplicación SPA, llama a `window.disposeHero()` al desmontar la página; elimina eventos, observadores y recursos GPU. Para volver a mostrarla, reinicializa la experiencia en el ciclo de vida de tu aplicación.

## Publicar

Sube el contenido completo de esta carpeta a cualquier alojamiento estático conservando vendor. No requiere backend ni claves. La entrega es local: no se ha publicado en Internet.

## Referencias técnicas

- https://threejs.org/docs/pages/WebGLRenderer
- https://threejs.org/manual/pages/creating-a-scene.html

Las cifras de partículas describen la implementación, no una garantía de rendimiento. Prueba los dispositivos objetivo antes de publicar.

## Validación realizada

Verificado en Chromium con renderizado por software: carga y shaders sin errores de consola; geometría, materiales, iluminación, distorsión, calidad, color, velocidad, pausa y restablecimiento; recorrido por scroll; seis prompts y copia real al portapapeles; movimiento reducido; móvil de 390 px sin desbordamiento; pérdida simulada de contexto y limpieza. Capturas revisadas visualmente. No probado en Safari/iOS ni en dispositivos físicos.
