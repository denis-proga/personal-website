import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import './IntroAnimation.css';

const DURATION = 2.4;

// Момент, когда камера уже у экрана и начинается «проваливание» внутрь
const PHASE_SPLIT = 0.55;

// Насколько круто тормозит камера во второй фазе. Число не произвольное:
// при нём скорость в начале второй фазы совпадает со скоростью в конце
// первой, и переход между ними перестаёт быть заметным. Если менять
// геометрию пролёта выше — это значение нужно пересчитать (см. комментарий
// у cameraZ).
const PHASE_B_EASE = 3.5;

// Пул "команд" для терминала — создаёт эффект живого деплоя/апгрейда
const COMMAND_POOL = [
  '$ npm install',
  'added 842 packages in 6s',
  '$ npm run build',
  '✓ compiled successfully',
  '$ git add .',
  '$ git commit -m "update portfolio"',
  '$ git push origin main',
  '$ npm run deploy',
  'uploading assets... done',
  'optimizing bundle... done',
  'deploying to production...',
  '✓ deploy complete',
  '$ npm run dev',
  'ready on http://localhost:5173',
];

// Плавный старт и плавное завершение: производная равна нулю на обоих
// концах, поэтому величина не «включается» рывком
function smoothstep(p) {
  const x = Math.min(1, Math.max(0, p));
  return x * x * (3 - 2 * x);
}

/**
 * Положение камеры по оси Z.
 *
 * Раньше две фазы стыковались только по координате, но не по скорости:
 * в конце первой камера шла примерно 17 единиц за единицу времени, а
 * вторая стартовала с 4.9 — втрое медленнее, мгновенно. Позиция при этом
 * не прыгала, поэтому в коде это выглядело безобидно, а на экране читалось
 * как подёргивание ровно посередине вступления.
 *
 * Теперь вторая фаза начинается с той же скоростью и плавно тормозит:
 * 1-(1-p)^3.5 в нуле имеет наклон 3.5, что после деления на длительность
 * фазы даёт ровно скорость конца первой.
 */
function cameraZ(t) {
  if (t < PHASE_SPLIT) {
    const p = t / PHASE_SPLIT;
    return 6.5 - p * p * 4.7;
  }
  const p = (t - PHASE_SPLIT) / (1 - PHASE_SPLIT);
  return 1.8 - 2.2 * (1 - Math.pow(1 - p, PHASE_B_EASE));
}

/**
 * Вступительная 3D-сцена: тёмная комната, стол с текстурой дерева,
 * детализированный монитор (объёмный корпус + рамка + подставка),
 * полноэкранный терминал с прокруткой команд и таскбаром снизу,
 * геймерская мышка с RGB-подсветкой и аккуратным проводом.
 * Камера "влетает" в экран, растущий чёрный круг стягивает кадр
 * до полной тьмы, затем сайт проявляется поверх.
 */
function IntroAnimation({ onFinish }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [hidden, setHidden] = useState(false);
  const timelineRef = useRef(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    // Облегчённый режим для телефонов и слабых машин — те же критерии, что
    // в EmberField: ширина, тач-указатель (ловит планшеты, которые по
    // ширине сошли бы за десктоп) и число ядер (слабые ноутбуки).
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
    const lite = window.innerWidth < 900 || isCoarsePointer || fewCores;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');
    scene.fog = new THREE.FogExp2('#050505', 0.045);

    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 1.6, 6.5);

    // antialias на мобильном стоит дорого, а при высоком DPR разница почти
    // не читается — сглаживание берёт на себя сама плотность пикселей
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.5 : 2));

    scene.add(new THREE.AmbientLight('#404040', 1.4));
    const key = new THREE.DirectionalLight('#ffffff', 0.7);
    key.position.set(3, 5, 4);
    scene.add(key);

    // --- Процедурная текстура дерева для стола ---
    function createWoodTexture() {
      const c = document.createElement('canvas');
      // Вдвое меньше на мобильном: текстура стола видна мельком и под углом
      const size = lite ? 256 : 512;
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 26; i++) {
        const y = (i / 26) * c.height + (Math.random() - 0.5) * 14;
        ctx.strokeStyle = `rgba(58, 32, 14, ${0.08 + Math.random() * 0.14})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= c.width; x += 32) {
          const wobble = Math.sin(x * 0.02 + i) * 6 + (Math.random() - 0.5) * 4;
          ctx.lineTo(x, y + wobble);
        }
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 1);
      return tex;
    }
    const woodTexture = createWoodTexture();

    // --- Стол ---
    const deskMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      flatShading: true,
      roughness: 0.75,
    });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 2.2), deskMat);
    desk.position.set(0, 0, 0.5);
    scene.add(desk);

    // Ножки — слегка конические (реалистичнее плоского бокса), симметрично по x
    const legMat = new THREE.MeshStandardMaterial({ color: '#4a2c14', flatShading: true });
    [-2.5, 2.5].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.4, 8), legMat);
      leg.position.set(x, -0.7, 1.1);
      scene.add(leg);
    });

    // --- Монитор: объёмный корпус + рамка + подставка ---
    const monitor = new THREE.Group();
    const silverMat = new THREE.MeshStandardMaterial({
      color: '#c7cbd1',
      metalness: 0.75,
      roughness: 0.3,
      flatShading: true,
    });
    const casingMat = new THREE.MeshStandardMaterial({
      color: '#161616',
      metalness: 0.4,
      roughness: 0.55,
      flatShading: true,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 20), silverMat);
    base.position.set(0, 0.1, 0.25);
    monitor.add(base);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), silverMat);
    neck.position.set(0, 0.375, 0.22);
    monitor.add(neck);

    // Тёмный корпус сзади — даёт реальный объём вместо плоской панели
    const casing = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.28), casingMat);
    casing.position.set(0, 1.35, -0.06);
    monitor.add(casing);

    // Тонкая серебристая рамка спереди
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.62, 1.62, 0.05), silverMat);
    frame.position.set(0, 1.35, 0.09);
    monitor.add(frame);

    // Веб-камера — маленькая деталь для реализма
    const webcam = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#000000' })
    );
    webcam.position.set(0, 2.13, 0.14);
    monitor.add(webcam);

    // --- Экран: полноэкранный терминал с таскбаром и прокруткой команд ---
    const termCanvas = document.createElement('canvas');
    // На мобильном экран монитора занимает малую часть кадра — текстура
    // вдвое меньше по стороне, то есть вчетверо меньше пикселей на
    // перерисовку каждый кадр
    termCanvas.width = lite ? 512 : 1024;
    termCanvas.height = lite ? 292 : 584;
    const termCtx = termCanvas.getContext('2d');
    const termTexture = new THREE.CanvasTexture(termCanvas);
    // Все размеры внутри терминала считались под 1024×584 — множитель
    // сохраняет пропорции при уменьшенной текстуре
    const ts = lite ? 0.5 : 1;

    let termLines = [];
    let cmdIndex = 0;
    function pushLine() {
      termLines.push(COMMAND_POOL[cmdIndex % COMMAND_POOL.length]);
      cmdIndex++;
      if (termLines.length > 15) termLines.shift();
    }

    // Время в таскбаре меняется раз в минуту, а не раз в кадр: форматирование
    // даты — операция недешёвая, чтобы делать её тридцать раз в секунду
    let cachedTime = '';
    let cachedTimeAt = 0;
    function currentTime(now) {
      if (!cachedTime || now - cachedTimeAt > 10000) {
        cachedTime = new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });
        cachedTimeAt = now;
      }
      return cachedTime;
    }

    function drawTerminal(cursorOn, now) {
      const w = termCanvas.width;
      const h = termCanvas.height;
      const taskbarH = h * 0.1;

      termCtx.fillStyle = '#0a0a0a';
      termCtx.fillRect(0, 0, w, h - taskbarH);

      termCtx.font = `${22 * ts}px monospace`;
      termCtx.textBaseline = 'top';
      const lineHeight = 30 * ts;
      termLines.forEach((line, i) => {
        termCtx.fillStyle = line.startsWith('✓')
            ? '#2bd97f'
            : line.startsWith('$')
                ? '#7fe0a8'
                : '#54946f';
        termCtx.fillText(line, 24 * ts, 14 * ts + i * lineHeight);
      });

      if (cursorOn) {
        const cursorY = 14 * ts + termLines.length * lineHeight;
        termCtx.fillStyle = '#2bd97f';
        termCtx.fillRect(24 * ts, cursorY, 13 * ts, 22 * ts);
      }

      // Обобщённый тёмный таскбар (без копирования конкретной ОС)
      termCtx.fillStyle = '#161616';
      termCtx.fillRect(0, h - taskbarH, w, taskbarH);

      const iconColors = ['#3fa7ff', '#ff5f56', '#2bd97f', '#ffbd2e', '#a066ff'];
      iconColors.forEach((color, i) => {
        const size = taskbarH * 0.5;
        const x = 24 * ts + i * (size + 16 * ts);
        const y = h - taskbarH / 2 - size / 2;
        termCtx.fillStyle = color;
        termCtx.beginPath();
        if (termCtx.roundRect) {
          termCtx.roundRect(x, y, size, size, 6 * ts);
        } else {
          termCtx.rect(x, y, size, size);
        }
        termCtx.fill();
      });

      termCtx.fillStyle = '#cfcfcf';
      termCtx.font = `${20 * ts}px monospace`;
      termCtx.textAlign = 'right';
      termCtx.fillText(currentTime(now), w - 24 * ts, h - taskbarH / 2 + 7 * ts);
      termCtx.textAlign = 'left';

      termTexture.needsUpdate = true;
    }
    drawTerminal(true, 0);

    const screenMat = new THREE.MeshBasicMaterial({ map: termTexture });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.42), screenMat);
    screen.position.set(0, 1.35, 0.13);
    monitor.add(screen);

    scene.add(monitor);

    // --- Мышка: округлая форма + кольцо RGB-подсветки + провод к монитору ---
    const mouseGroup = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.14, lite ? 10 : 14, lite ? 7 : 10);
    bodyGeo.scale(1, 0.55, 1.5);
    const mouseBodyMat = new THREE.MeshStandardMaterial({
      color: '#0f0f0f',
      flatShading: true,
      roughness: 0.35,
    });
    const mouseBody = new THREE.Mesh(bodyGeo, mouseBodyMat);
    mouseBody.position.set(0, 0.077, 0);
    mouseGroup.add(mouseBody);

    const rgbColor = new THREE.Color('#2bd9ff');

    // Плоское светящееся кольцо, лежащее на столе под мышкой —
    // именно оно даёт видимую "световую ветку", а не только засветку от лампы
    const ringGeo = new THREE.RingGeometry(0.07, 0.115, lite ? 20 : 32);
    ringGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: rgbColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const glowRing = new THREE.Mesh(ringGeo, glowMat);
    glowRing.position.set(0, 0.002, 0);
    mouseGroup.add(glowRing);

    const mouseLight = new THREE.PointLight(rgbColor, 0.5, 0.9);
    mouseLight.position.set(0, 0.03, 0);
    mouseGroup.add(mouseLight);

    mouseGroup.position.set(1.7, 0.075, 1.0);
    scene.add(mouseGroup);

    // Провод — аккуратная кривая от мышки к основанию монитора
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.72, 0.085, 1.05),
      new THREE.Vector3(1.2, 0.095, 0.65),
      new THREE.Vector3(0.55, 0.1, 0.38),
      new THREE.Vector3(0.12, 0.1, 0.28),
    ]);
    const cableGeo = new THREE.TubeGeometry(
      cableCurve,
      lite ? 18 : 32,
      0.007,
      lite ? 4 : 6,
      false
    );
    const cableMat = new THREE.MeshStandardMaterial({ color: '#0d0d0d', flatShading: true });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    scene.add(cable);

    let rafId;
    const proxy = { t: 0 };
    let lastBlink = 0;
    let blinkOn = true;
    let lastLine = 0;
    let lastTermDraw = 0;

    function render(now) {
      const t = proxy.t;

      camera.position.z = cameraZ(t);
      // Угол обзора раскрывается через smoothstep: в точке старта его
      // производная равна нулю, поэтому «проваливание» в экран начинается
      // незаметно. Линейный рост включался скачком и добавлял свою долю в
      // тот же рывок посередине.
      camera.fov = 50 + 65 * smoothstep((t - PHASE_SPLIT) / (1 - PHASE_SPLIT));
      camera.lookAt(0, 1.35, camera.position.z - 3);
      camera.updateProjectionMatrix();

      // Курсор мигает, команды бегут — эффект "живого" деплоя
      if (now - lastBlink > 500) {
        blinkOn = !blinkOn;
        lastBlink = now;
      }
      if (now - lastLine > 180) {
        pushLine();
        lastLine = now;
      }
      // Терминал перерисовывается не каждый кадр, а раз в ~33мс — и на
      // десктопе тоже. Полная перерисовка холста 1024×584 с последующей
      // загрузкой в видеопамять шестьдесят раз в секунду была самой дорогой
      // операцией кадра, а содержимое меняется куда реже: строка раз в
      // 180мс, курсор раз в 500мс.
      if (now - lastTermDraw > 33) {
        drawTerminal(blinkOn, now);
        lastTermDraw = now;
      }

      const hue = (now * 0.00015) % 1;
      rgbColor.setHSL(hue, 0.9, 0.55);
      glowMat.color.copy(rgbColor);
      mouseLight.color.copy(rgbColor);

      // Растущий чёрный круг: стягивается от центра экрана к полной тьме.
      //
      // Раньше на каждом кадре собиралась новая строка radial-gradient и
      // присваивалась в style.background — браузер разбирал её заново и
      // перерисовывал слой во весь экран шестьдесят раз в секунду. Теперь
      // круг нарисован один раз в CSS, а меняются только transform и
      // opacity: их обрабатывает композитор, без перерисовки вообще.
      if (overlayRef.current) {
        const p = t > 0.45 ? Math.min(1, (t - 0.45) / 0.5) : 0;
        overlayRef.current.style.opacity = Math.min(1, p * 1.3);
        overlayRef.current.style.transform = `scale(${p * 4})`;
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(render);
    }
    render(0);

    function finish() {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setHidden(true);
      setTimeout(() => onFinish?.(), 600);
    }

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(proxy, { t: 1, duration: DURATION, ease: 'power2.in' });
    timelineRef.current = tl;

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      tl.kill();
      renderer.dispose();
      woodTexture.dispose();
      termTexture.dispose();
    };
  }, [onFinish]);

  const handleSkip = () => {
    timelineRef.current?.progress(1);
  };

  return (
      <div className={`intro-animation ${hidden ? 'intro-animation--hidden' : ''}`}>
        <canvas ref={canvasRef} className="intro-animation__canvas" />
        <div ref={overlayRef} className="intro-animation__blackout" />
        {!hidden && (
            <button className="intro-animation__skip" onClick={handleSkip}>
              Skip
            </button>
        )}
      </div>
  );
}

export default IntroAnimation;
