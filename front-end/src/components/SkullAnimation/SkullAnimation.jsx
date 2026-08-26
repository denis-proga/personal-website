import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import './SkullAnimation.css';

const MODEL_URL = '/models/skull.glb';
const LANGUAGES = ['Python', 'MySQL', 'React', 'JavaScript', 'PHP', 'Django', 'Java', 'CSS'];

/**
 * Параметры разреза модели на череп и нижнюю челюсть.
 * Модель монолитная, поэтому режем её по треугольникам:
 * треугольник уходит в челюсть, если его центр ниже наклонной линии.
 * Координаты нормализованы в 0..1 внутри габаритов модели.
 *
 * Линия наклонная, потому что челюсть спереди низкая (тело),
 * а сзади поднимается высоко (ветвь к суставу).
 *
 * ЭТИ ЧИСЛА МОЖНО КРУТИТЬ, если разрез пройдёт не там:
 *  JAW_FRONT_Y — высота реза спереди (больше = больше уходит в челюсть)
 *  JAW_BACK_Y  — высота реза сзади
 *  JAW_MIN_Z   — глубина, дальше которой ничего не режем (затылок целый)
 */
const JAW_FRONT_Y = 0.22;
const JAW_BACK_Y = 0.38;
const JAW_MIN_Z = 0.32;

// Точка шарнира челюсти (нормализовано 0..1 в габаритах модели)
const HINGE_Y = 0.42;
const HINGE_Z = 0.36;

/**
 * Удаление обломков: тонкая полоса прямо над линией реза в передней части.
 * Туда попадают застрявшие кусочки нижних зубов, которые иначе торчат во рту.
 *  STRAY_BAND  — толщина полосы (больше = удаляем больше)
 *  STRAY_MIN_Z — только передняя часть, затылок не трогаем
 */
const STRAY_BAND = 0.035;
const STRAY_MIN_Z = 0.66;

// Маски сквозных отверстий (множители от радиуса модели) — тоже подстраиваемые
const EYE_MASK = { x: 0.3, y: 0.14, z: 0.2, radius: 0.2 };
const NOSE_MASK = { y: -0.16, z: 0.25, radius: 0.11 };

function SkullAnimation() {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    function resize() {
      const size = parent.clientWidth;
      renderer.setSize(size, size);
      camera.updateProjectionMatrix();
    }
    resize();

    scene.add(new THREE.AmbientLight('#ffffff', 0.75));
    const keyLight = new THREE.DirectionalLight('#fff6e8', 1.6);
    keyLight.position.set(2.5, 3.5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#a9bfd8', 0.6);
    fillLight.position.set(-3, -1, 2);
    scene.add(fillLight);
    const backLight = new THREE.DirectionalLight('#ffffff', 0.4);
    backLight.position.set(0, 2, -4);
    scene.add(backLight);

    const skullGroup = new THREE.Group();
    scene.add(skullGroup);

    // ---------- Текст языка внутри рта ----------
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 320;
    const textCtx = textCanvas.getContext('2d');
    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.anisotropy = 8;

    function drawLanguage(name) {
      const w = textCanvas.width;
      const h = textCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      textCtx.clearRect(0, 0, w, h);

      const label = name.toUpperCase();
      textCtx.font = 'bold 108px "JetBrains Mono", monospace';
      textCtx.textAlign = 'center';
      textCtx.textBaseline = 'middle';

      // Тёмная подложка — даёт контраст, не перекрывая череп
      const textWidth = textCtx.measureText(label).width;
      const padX = 46;
      const boxW = textWidth + padX * 2;
      const boxH = 150;
      textCtx.fillStyle = 'rgba(8, 6, 4, 0.55)';
      textCtx.beginPath();
      if (textCtx.roundRect) {
        textCtx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 14);
      } else {
        textCtx.rect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
      }
      textCtx.fill();

      // Угловые засечки в дев-стиле
      textCtx.strokeStyle = 'rgba(255, 156, 46, 0.9)';
      textCtx.lineWidth = 5;
      const corner = 26;
      [
        [cx - boxW / 2, cy - boxH / 2, 1, 1],
        [cx + boxW / 2, cy - boxH / 2, -1, 1],
        [cx - boxW / 2, cy + boxH / 2, 1, -1],
        [cx + boxW / 2, cy + boxH / 2, -1, -1],
      ].forEach(([x, y, dx, dy]) => {
        textCtx.beginPath();
        textCtx.moveTo(x + dx * corner, y);
        textCtx.lineTo(x, y);
        textCtx.lineTo(x, y + dy * corner);
        textCtx.stroke();
      });

      // Свечение + чёткое светлое ядро букв
      textCtx.shadowColor = '#ff8a1f';
      textCtx.shadowBlur = 40;
      textCtx.fillStyle = '#ffbe63';
      textCtx.fillText(label, cx, cy + 4);
      textCtx.shadowBlur = 16;
      textCtx.fillStyle = '#fff6e2';
      textCtx.fillText(label, cx, cy + 4);
      textCtx.shadowBlur = 0;

      textTexture.needsUpdate = true;
    }
    drawLanguage(LANGUAGES[0]);

    const textMat = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), textMat);
    textPlane.renderOrder = 6;
    skullGroup.add(textPlane);

    // ---------- Огонь: пламя-силуэт, обволакивающее череп ----------
    const FIRE_COUNT = 2200;
    const BURN_DURATION = 1.5; // сколько секунд идёт эмиссия после клика
    const SPAWN_RATE = 2600; // частиц в секунду

    const firePositions = new Float32Array(FIRE_COUNT * 3);
    const fireLife = new Float32Array(FIRE_COUNT);
    const fireSize = new Float32Array(FIRE_COUNT);
    const fireVel = Array.from({ length: FIRE_COUNT }, () => new THREE.Vector3());
    const fireKind = new Uint8Array(FIRE_COUNT); // 0 = пламя вокруг, 1 = струя из отверстий
    const fireDecay = new Float32Array(FIRE_COUNT);

    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
    fireGeo.setAttribute('aLife', new THREE.BufferAttribute(fireLife, 1));
    fireGeo.setAttribute('aSize', new THREE.BufferAttribute(fireSize, 1));

    const fireMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: renderer.getPixelRatio() },
        uFadeStart: { value: 1.2 },
        uFadeEnd: { value: 1.75 },
      },
      vertexShader: `
        attribute float aLife;
        attribute float aSize;
        varying float vLife;
        varying float vFade;
        uniform float uPixelRatio;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        void main() {
          vLife = aLife;
          // Плавное угасание у границ канваса — чтобы не было видно
          // прямоугольного обреза по краю области рендера
          float d = length(position.xy);
          vFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, d);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mv.z) * (0.4 + aLife * 0.85);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vLife;
        varying float vFade;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          // Красные языки на остывающих концах, жёлто-белое ядро внизу
          vec3 hot  = vec3(1.0, 0.97, 0.82);
          vec3 mid  = vec3(1.0, 0.60, 0.12);
          vec3 cold = vec3(0.78, 0.09, 0.02);
          vec3 col = mix(cold, mid, smoothstep(0.0, 0.5, vLife));
          col = mix(col, hot, smoothstep(0.7, 1.0, vLife));
          gl_FragColor = vec4(col, soft * vLife * vFade * 0.9);
        }
      `,
    });

    const fire = new THREE.Points(fireGeo, fireMat);
    fire.renderOrder = 7;
    skullGroup.add(fire);

    const fireLight = new THREE.PointLight('#ff7a1a', 0, 8);
    skullGroup.add(fireLight);

    let fireEmitters = [new THREE.Vector3(0, 0, 0.8)];
    let modelRadius = 1;
    let burnTimer = 0;
    let spawnAccumulator = 0;

    function spawnParticle(i, kind) {
      const vel = fireVel[i];
      fireKind[i] = kind;

      if (kind === 0) {
        // Пламя вокруг черепа: рождается по эллипсу снизу и по бокам,
        // поднимается вверх и сходится к центру — получается язык пламени
        const a = Math.random() * Math.PI * 2;
        const r = modelRadius * (0.62 + Math.random() * 0.5);
        const baseY = -modelRadius * (0.35 + Math.random() * 0.7);
        firePositions[i * 3] = Math.cos(a) * r;
        firePositions[i * 3 + 1] = baseY + Math.abs(Math.sin(a)) * modelRadius * 0.35;
        firePositions[i * 3 + 2] = (Math.random() - 0.5) * modelRadius * 0.85;

        vel.set(
          Math.cos(a) * 0.18,
          1.15 + Math.random() * 1.05,
          (Math.random() - 0.5) * 0.25
        );
        fireLife[i] = 0.85 + Math.random() * 0.15;
        fireSize[i] = 0.45 + Math.random() * 0.75;
        fireDecay[i] = 0.62 + Math.random() * 0.28;
      } else {
        // Струи из глазниц и носа
        const origin = fireEmitters[i % fireEmitters.length];
        firePositions[i * 3] = origin.x + (Math.random() - 0.5) * 0.06;
        firePositions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.06;
        firePositions[i * 3 + 2] = origin.z;

        vel.set(
          (Math.random() - 0.5) * 0.7,
          0.65 + Math.random() * 1.2,
          0.45 + Math.random() * 0.85
        );
        fireLife[i] = 0.8 + Math.random() * 0.2;
        fireSize[i] = 0.3 + Math.random() * 0.5;
        fireDecay[i] = 0.9 + Math.random() * 0.35;
      }
    }

    function igniteFire() {
      burnTimer = BURN_DURATION;
      gsap.fromTo(
        fireLight,
        { intensity: 7 },
        { intensity: 0, duration: BURN_DURATION + 0.5, ease: 'power2.out' }
      );
    }

    // ---------- Разрез монолитной модели на череп и челюсть ----------
    function splitSkull(mesh) {
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const size = new THREE.Vector3().subVectors(bb.max, bb.min);

      const pos = geo.attributes.position.array;
      const nor = geo.attributes.normal?.array;
      const uv = geo.attributes.uv?.array;

      const skullData = { pos: [], nor: [], uv: [] };
      const jawData = { pos: [], nor: [], uv: [] };

      for (let t = 0; t < pos.length; t += 9) {
        // Центр треугольника
        const cy = (pos[t + 1] + pos[t + 4] + pos[t + 7]) / 3;
        const cz = (pos[t + 2] + pos[t + 5] + pos[t + 8]) / 3;

        const ny = (cy - bb.min.y) / size.y;
        const nz = (cz - bb.min.z) / size.z;

        // Наклонная линия реза: спереди ниже, сзади выше
        const threshold = THREE.MathUtils.lerp(JAW_BACK_Y, JAW_FRONT_Y, nz);
        const isJaw = nz > JAW_MIN_Z && ny < threshold;

        // Мелкие обломки нижних зубов, оставшиеся на верхней части у самой
        // линии реза, просто выбрасываем — иначе торчат кусками во рту
        const isDebris =
          !isJaw &&
          nz > STRAY_MIN_Z &&
          ny > threshold &&
          ny < threshold + STRAY_BAND;
        if (isDebris) continue;

        const target = isJaw ? jawData : skullData;
        for (let k = 0; k < 9; k++) target.pos.push(pos[t + k]);
        if (nor) for (let k = 0; k < 9; k++) target.nor.push(nor[t + k]);
        if (uv) {
          const uvBase = (t / 3) * 2;
          for (let k = 0; k < 6; k++) target.uv.push(uv[uvBase + k]);
        }
      }

      function buildGeometry(data) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
        if (data.nor.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(data.nor, 3));
        else g.computeVertexNormals();
        if (data.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
        return g;
      }

      const skullGeoPart = buildGeometry(skullData);
      const jawGeoPart = buildGeometry(jawData);

      // Шарнир челюсти в локальных координатах модели
      const hinge = new THREE.Vector3(
        (bb.min.x + bb.max.x) / 2,
        bb.min.y + size.y * HINGE_Y,
        bb.min.z + size.z * HINGE_Z
      );
      jawGeoPart.translate(-hinge.x, -hinge.y, -hinge.z);

      const material = mesh.material;
      const skullPart = new THREE.Mesh(skullGeoPart, material);
      const jawPart = new THREE.Mesh(jawGeoPart, material);

      const pivot = new THREE.Group();
      pivot.position.copy(hinge);
      pivot.add(jawPart);

      const parent = mesh.parent;
      skullPart.position.copy(mesh.position);
      skullPart.quaternion.copy(mesh.quaternion);
      skullPart.scale.copy(mesh.scale);

      const pivotWrapper = new THREE.Group();
      pivotWrapper.position.copy(mesh.position);
      pivotWrapper.quaternion.copy(mesh.quaternion);
      pivotWrapper.scale.copy(mesh.scale);
      pivotWrapper.add(pivot);

      parent.add(skullPart);
      parent.add(pivotWrapper);
      mesh.visible = false;

      console.log(
        `[SkullAnimation] Разрез выполнен: череп ${skullData.pos.length / 9} тр., ` +
          `челюсть ${jawData.pos.length / 9} тр.`
      );

      return { pivot, skullPart, jawPart };
    }

    // ---------- Загрузка ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hitTargets = [];
    let jawPivot = null;
    let hovered = false;
    const jawState = { open: 0, cycle: true };

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;

        const meshes = [];
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.side = THREE.DoubleSide;
            meshes.push(child);
          }
        });
        console.log(
          '[SkullAnimation] Меши:',
          meshes.map((m) => ({ name: m.name, v: m.geometry.attributes.position.count }))
        );

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        // Модель чуть меньше кадра — чтобы пламя вокруг помещалось целиком
        const scale = 1.65 / maxDim;

        model.position.sub(center);
        model.scale.setScalar(scale);
        model.position.multiplyScalar(scale);
        skullGroup.add(model);

        modelRadius = (maxDim * scale) / 2;

        // Режем самый крупный меш на череп + челюсть
        const biggest = meshes.reduce((a, b) =>
          a.geometry.attributes.position.count > b.geometry.attributes.position.count ? a : b
        );
        const parts = splitSkull(biggest);
        jawPivot = parts.pivot;
        hitTargets.push(parts.skullPart, parts.jawPart);
        meshes.forEach((m) => {
          if (m !== biggest) hitTargets.push(m);
        });

        // Сквозные отверстия: маски пишут глубину, но не цвет,
        // поэтому кость за ними обрезается и виден фон страницы
        const holeMat = new THREE.MeshBasicMaterial({ colorWrite: false });
        function addHole(geometry, position) {
          const hole = new THREE.Mesh(geometry, holeMat);
          hole.position.copy(position);
          hole.renderOrder = -1;
          skullGroup.add(hole);
        }

        // Высокая детализация — иначе края отверстий получаются гранёными
        const eyeGeo = new THREE.SphereGeometry(modelRadius * EYE_MASK.radius, 96, 64);
        eyeGeo.scale(1.12, 1, 1.6);
        addHole(
          eyeGeo,
          new THREE.Vector3(-modelRadius * EYE_MASK.x, modelRadius * EYE_MASK.y, modelRadius * EYE_MASK.z)
        );
        addHole(
          eyeGeo,
          new THREE.Vector3(modelRadius * EYE_MASK.x, modelRadius * EYE_MASK.y, modelRadius * EYE_MASK.z)
        );

        const noseGeo = new THREE.SphereGeometry(modelRadius * NOSE_MASK.radius, 72, 48);
        noseGeo.scale(0.9, 1.35, 1.6);
        addHole(noseGeo, new THREE.Vector3(0, modelRadius * NOSE_MASK.y, modelRadius * NOSE_MASK.z));

        // Точки вылета огня
        fireEmitters = [
          new THREE.Vector3(-modelRadius * EYE_MASK.x, modelRadius * EYE_MASK.y, modelRadius * 0.8),
          new THREE.Vector3(modelRadius * EYE_MASK.x, modelRadius * EYE_MASK.y, modelRadius * 0.8),
          new THREE.Vector3(0, modelRadius * NOSE_MASK.y, modelRadius * 0.85),
        ];
        fireLight.position.set(0, 0, modelRadius * 0.6);

        textPlane.position.set(0, -modelRadius * 0.6, modelRadius * 0.55);
        textPlane.scale.setScalar(modelRadius * 0.85);

        setStatus('ready');
      },
      undefined,
      (err) => {
        console.error('[SkullAnimation] Не удалось загрузить модель:', err);
        setStatus('error');
      }
    );

    // ---------- Взаимодействие ----------
    function setHover(state) {
      if (hovered === state) return;
      hovered = state;
      if (state) {
        jawState.cycle = false;
        gsap.to(jawState, { open: 0, duration: 0.14, ease: 'power3.in' });
      } else {
        // Цикл начинается заново: рот закрыт, голова в исходном положении
        resetCycle();
        jawState.cycle = true;
      }
      canvas.style.cursor = state ? 'pointer' : 'default';
    }

    function updatePointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function handlePointerMove(event) {
      if (!hitTargets.length) return;
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      setHover(raycaster.intersectObjects(hitTargets, true).length > 0);
    }

    function handlePointerLeave() {
      setHover(false);
    }

    function handleClick(event) {
      if (!hitTargets.length) return;
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObjects(hitTargets, true).length > 0) igniteFire();
    }

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('click', handleClick);

    // ---------- Цикл ----------
    let rafId;
    let langIndex = 0;
    let cyclePhase = 0;
    let swayTime = 0;
    let prevOpen = 0;
    const clock = new THREE.Clock();

    function resetCycle() {
      cyclePhase = 0; // рот закрыт (см. формулу open ниже)
      swayTime = 0; // голова смотрит прямо, покачивание с нуля
      prevOpen = 0;
    }

    function render() {
      const dt = Math.min(clock.getDelta(), 0.05);

      if (jawState.cycle) {
        cyclePhase += dt * 1.15;
        // (1 - cos) даёт 0 в начале цикла — рот стартует закрытым
        jawState.open = (1 - Math.cos(cyclePhase)) / 2;

        // Язык меняется в момент полного закрытия рта, когда текст не виден,
        // поэтому подмена происходит незаметно
        if (prevOpen > 0.04 && jawState.open <= 0.04) {
          langIndex = (langIndex + 1) % LANGUAGES.length;
          drawLanguage(LANGUAGES[langIndex]);
        }
        prevOpen = jawState.open;
      }

      if (jawPivot) jawPivot.rotation.x = jawState.open * 0.32;
      textMat.opacity = Math.max(0, jawState.open - 0.15) * 1.5;

      swayTime += dt;
      skullGroup.position.y = Math.sin(swayTime * 1.1) * 0.05;
      const targetRotY = hovered ? 0 : Math.sin(swayTime * 0.32) * 0.32;
      skullGroup.rotation.y += (targetRotY - skullGroup.rotation.y) * 0.05;

      // Эмиссия, пока идёт горение
      if (burnTimer > 0) {
        burnTimer -= dt;
        spawnAccumulator += SPAWN_RATE * dt;
        let toSpawn = Math.floor(spawnAccumulator);
        spawnAccumulator -= toSpawn;
        for (let i = 0; i < FIRE_COUNT && toSpawn > 0; i++) {
          if (fireLife[i] > 0) continue;
          // 70% на объёмное пламя вокруг, 30% на струи из отверстий
          spawnParticle(i, Math.random() < 0.7 ? 0 : 1);
          toSpawn--;
        }
        fireGeo.attributes.aSize.needsUpdate = true;
      }

      let anyAlive = false;
      for (let i = 0; i < FIRE_COUNT; i++) {
        if (fireLife[i] <= 0) continue;
        anyAlive = true;
        const v = fireVel[i];
        const px = firePositions[i * 3];
        const py = firePositions[i * 3 + 1];
        const pz = firePositions[i * 3 + 2];

        if (fireKind[i] === 0) {
          // Пламя: подъём + схождение к оси, чем выше, тем сильнее —
          // это и даёт узкий язык пламени над черепом
          v.y += dt * 1.5;
          const converge = THREE.MathUtils.clamp((py + modelRadius) / (modelRadius * 2), 0, 1);
          v.x -= px * dt * (1.1 + converge * 2.6);
          v.z -= pz * dt * (0.9 + converge * 2.2);
          // лёгкое колыхание
          v.x += Math.sin(swayTime * 3 + i) * dt * 0.35;
        } else {
          v.y += dt * 0.9;
        }

        v.multiplyScalar(1 - dt * 0.9);
        firePositions[i * 3] += v.x * dt;
        firePositions[i * 3 + 1] += v.y * dt;
        firePositions[i * 3 + 2] += v.z * dt;
        fireLife[i] = Math.max(0, fireLife[i] - dt * fireDecay[i]);
      }
      if (anyAlive || burnTimer > 0) {
        fireGeo.attributes.position.needsUpdate = true;
        fireGeo.attributes.aLife.needsUpdate = true;
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(render);
    }
    render();

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      renderer.dispose();
      textTexture.dispose();
    };
  }, []);

  return (
    <div className="skull-animation">
      <canvas ref={canvasRef} className="skull-animation__canvas" />
      {status === 'error' && (
        <p className="skull-animation__error">
          Модель не загрузилась — проверь <code>public/models/skull.glb</code>
        </p>
      )}
    </div>
  );
}

export default SkullAnimation;
