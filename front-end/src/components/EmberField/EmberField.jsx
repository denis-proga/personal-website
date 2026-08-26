import { useEffect, useRef } from 'react';
import './EmberField.css';

// Полоса углей занимает только низ секции
const BED_HEIGHT = 0.15;

/**
 * Простой детерминированный "шум" из нескольких синусоид разной частоты —
 * даёт плавный, но неровный рельеф дна вместо идеально ровной линии.
 * Возвращает значение примерно в диапазоне [-1, 1].
 */
function terrainOffset(x) {
  return (
    (Math.sin(x * 0.0055) * 1 +
      Math.sin(x * 0.014 + 2.1) * 0.55 +
      Math.sin(x * 0.037 + 4.6) * 0.28) /
    1.83
  );
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Спрайты частиц пламени — по одному на градацию "остатка жизни".
 * Цветовая формула перенесена один в один из фрагментного шейдера огня
 * черепа: холодный красный на угасающих концах -> оранжевый -> бело-жёлтое
 * ядро у свежих частиц. Мягкий радиальный спад заменяет smoothstep(0.5,0,d).
 * Предрендер нужен потому, что создавать градиент на каждую частицу
 * каждый кадр — верный способ уронить fps.
 */
const SPRITE_STEPS = 12;
const SPRITE_SIZE = 64;

function buildFlameSprites() {
  const cold = [199, 23, 5];
  const mid = [255, 153, 31];
  const hot = [255, 247, 209];

  return Array.from({ length: SPRITE_STEPS }, (_, i) => {
    const life = i / (SPRITE_STEPS - 1);

    const t1 = smoothstep(0, 0.5, life);
    const t2 = smoothstep(0.7, 1, life);
    const col = cold.map((c, k) => {
      const m = c + (mid[k] - c) * t1;
      return Math.round(m + (hot[k] - m) * t2);
    });

    const c = document.createElement('canvas');
    c.width = SPRITE_SIZE;
    c.height = SPRITE_SIZE;
    const g = c.getContext('2d');
    const half = SPRITE_SIZE / 2;
    const grad = g.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 1)`);
    grad.addColorStop(0.45, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0.38)`);
    grad.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return c;
  });
}

/**
 * Слой тлеющих углей.
 *
 * Реализм строится на четырёх вещах:
 *  1. куски КРУПНЫЕ и их немного — мелкая россыпь читается мультяшно
 *  2. у каждого куска есть тень, и он почти чёрный: свет идёт не от самого
 *     угля, а из щелей под ним, поэтому виден контраст, а не оранжевая каша
 *  3. рваные края с неравномерными вершинами вместо ровных многоугольников
 *  4. дно неровное: и сами куски, и подсветка под ними следуют одному и
 *     тому же рельефу (terrainOffset)
 *
 * Пламя устроено как огонь черепа: рой мягких частиц с аддитивным
 * смешиванием, которые поднимаются и одновременно стягиваются к оси столба
 * тем сильнее, чем выше залетели. Форма языка получается сама из движения,
 * её не рисуют заранее заданным силуэтом.
 */
function EmberField({ progressRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Облегчённый режим для телефонов и слабых машин. Канвас перерисовывает
    // сотни камней с тенями и тысячи частиц каждый кадр — на десктопе это
    // проходит незаметно, а на мобильном GPU превращает скролл в слайд-шоу
    // и быстро сажает батарею. Ориентируемся не только на ширину экрана:
    // hardwareConcurrency (число ядер) отсекает и слабые ноутбуки, а
    // pointer:coarse — планшеты, которые по ширине сошли бы за десктоп.
    const isCoarsePointer =
      window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
    const lite = window.innerWidth < 900 || isCoarsePointer || fewCores;

    // На мобильных devicePixelRatio часто 3: канвас во весь экран при таком
    // множителе — это втрое больше пикселей на каждый кадр практически без
    // выигрыша в детализации для угольной текстуры.
    const dpr = Math.min(window.devicePixelRatio, lite ? 1.5 : 2);
    const flameSprites = buildFlameSprites();

    let width = 0;
    let height = 0;
    let rafId = null;
    let coals = [];
    let vents = [];
    let flares = [];

    function buildCoals() {
      coals = [];
      const bedTop = height * (1 - BED_HEIGHT);
      const bedHeight = height - bedTop;

      // Меньше рядов и крупнее шаг: камней получается ощутимо меньше, а
      // каждый из них рисуется с тенью и градиентом — это самая дорогая
      // часть кадра
      const rows = lite ? 3 : 4;
      for (let row = 0; row < rows; row++) {
        const t = row / (rows - 1);
        const scale = 0.9 + t * 1.5;
        const step = (lite ? 190 : 150) * scale;
        const count = Math.ceil(width / step) + 2;

        for (let i = 0; i < count; i++) {
          const x =
            i * step + (row % 2 ? step * 0.5 : 0) + (Math.random() - 0.5) * step * 0.25;

          const w = step * (0.78 + Math.random() * 0.34);
          const h = w * (0.56 + Math.random() * 0.24);

          const surface = bedTop + terrainOffset(x) * (bedHeight * 0.5);
          const y = surface + h * 0.42 + t * bedHeight * 0.85;

          // Контур: много вершин с умеренным разбросом радиуса. Раньше
          // вершин было мало, а разброс большой — куски получались
          // остроугольными "треугольниками". Настоящий скол угля — это
          // компактный многогранник с парой резких граней, а не шип.
          const points = [];
          const corners = 11 + Math.floor(Math.random() * 4);
          const baseR = 0.46;
          for (let c = 0; c < corners; c++) {
            const a = (c / corners) * Math.PI * 2 + (Math.random() - 0.5) * 0.16;
            const chip = Math.random() < 0.18 ? 0.78 : 1; // редкий неглубокий скол
            const r = (baseR + Math.random() * 0.12) * chip;
            points.push([Math.cos(a) * w * r, Math.sin(a) * h * r]);
          }

          // Грани-фасетки: уголь колется плоскостями, и каждая плоскость
          // ловит свет по-своему. Без них силуэт читается как плоский осколок.
          const facets = [];
          const facetCount = 2 + Math.floor(Math.random() * 2);
          for (let f = 0; f < facetCount; f++) {
            const start = Math.floor(Math.random() * corners);
            const span = 2 + Math.floor(Math.random() * 3);
            const poly = [[(Math.random() - 0.5) * w * 0.18, (Math.random() - 0.5) * h * 0.18]];
            for (let s = 0; s <= span; s++) poly.push(points[(start + s) % corners]);
            facets.push({ poly, light: Math.random() < 0.5 });
          }

          coals.push({
            x,
            y,
            w,
            h,
            points,
            facets,
            depth: t,
            ash: Math.random() < 0.22,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.4 + Math.random() * 0.9,
            tilt: (Math.random() - 0.5) * 0.4,
          });
        }
      }
      coals.sort((a, b) => a.depth - b.depth);

      // Отдушины — точки, где жар пробивается между кусками наружу.
      // Это то самое "тление", которого не хватало: не общая заливка, а
      // отдельные горячие очаги, каждый со своим ритмом пульсации.
      vents = Array.from({ length: Math.round(width / (lite ? 95 : 55)) }, () => {
        const x = Math.random() * width;
        const surface = bedTop + terrainOffset(x) * (bedHeight * 0.5);
        return {
          x,
          y: surface + bedHeight * (0.15 + Math.random() * 0.85),
          r: 16 + Math.random() * 40,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.4,
          burning: 0,
        };
      });

      // Очаги пламени — не отдельные точки на ровном месте, а часть тех же
      // щелей: огонь поднимается ровно оттуда, где уже светится жар.
      // Берём щели, разнесённые по ширине, и даём каждой свой калибр и
      // характер, чтобы не было ряда одинаковых столбов.
      const pool = [...vents].sort((a, b) => a.x - b.x);
      const wanted = Math.max(4, Math.min(9, Math.round(width / 230)));
      const stride = Math.max(1, Math.floor(pool.length / wanted));

      flares = [];
      for (let i = 0; i < wanted && i * stride < pool.length; i++) {
        const vent = pool[i * stride + Math.floor(Math.random() * stride)] ?? pool[i * stride];
        // Мелких огоньков больше, крупных единицы — как в настоящем костре
        const scale = 0.38 + Math.pow(Math.random(), 1.7) * 1.05;
        flares.push({
          vent,
          x: vent.x,
          y: vent.y,
          scale,
          // Узкая щель даёт собранный язык, широкая — раскидистое пламя
          spread: 5 + scale * 22,
          converge: 2.6 + Math.random() * 2.8,
          lean: (Math.random() - 0.5) * 42,
          columnHeight: 90 + scale * 190,
          rate: (190 + scale * 460) * (lite ? 0.35 : 1),
          duration: 1.1 + scale * 1.1,
          at: 0.1 + Math.random() * 0.75,
          fired: false,
          burn: 0,
          accumulator: 0,
        });
      }
    }

    function resize() {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;

      // Камни генерируются через Math.random(), поэтому каждый вызов
      // buildCoals() даёт совершенно новую раскладку. На телефоне при скролле
      // браузер прячет и показывает адресную строку — высота viewport
      // меняется, срабатывает resize, и угли на глазах перестраивались.
      // Ширина при этом не меняется, поэтому перестраиваем только когда
      // изменилась именно она (реальный поворот экрана или ресайз окна).
      const widthChanged = Math.abs(nextWidth - width) > 1;

      width = nextWidth;
      height = nextHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (widthChanged || !coals.length) buildCoals();
    }
    resize();

    // --- Искры ---
    const SPARK_COUNT = lite ? 90 : 220;
    const sparks = Array.from({ length: SPARK_COUNT }, () => ({ life: 0 }));

    function spawnSpark(s) {
      s.x = Math.random() * width;
      s.y = height * (1 - BED_HEIGHT) + Math.random() * height * BED_HEIGHT;
      s.vx = (Math.random() - 0.5) * 24;
      s.vy = -(40 + Math.random() * 120);
      s.life = 0.6 + Math.random() * 0.5;
      s.size = 0.7 + Math.random() * 2;
    }

    // --- Пламя ---
    // Один общий пул частиц на все очаги, как FIRE_COUNT у черепа.
    const FLAME_POOL = lite ? 450 : 1400;

    const flames = Array.from({ length: FLAME_POOL }, () => ({ life: 0 }));

    function spawnFlame(f, flare) {
      // Рождение в самой щели: узко у основания, поэтому язык выходит
      // "из отверстия", а не появляется сразу широким столбом
      const spread = (Math.random() - 0.5) * flare.spread;
      f.cx = flare.x;
      f.x = flare.x + spread;
      f.y = flare.y + (Math.random() - 0.5) * 8;
      f.baseY = f.y;
      f.column = flare.columnHeight;
      f.convergeK = flare.converge;
      f.vx = spread * 0.6 + (Math.random() - 0.5) * 26 + flare.lean;
      f.vy = -(110 + Math.random() * 120) * (0.65 + flare.scale * 0.5);
      f.life = 0.85 + Math.random() * 0.15;
      f.decay = 0.62 + Math.random() * 0.28;
      f.size = (4 + Math.random() * 8) * (0.5 + flare.scale * 0.85);
      f.seed = Math.random() * Math.PI * 2;
    }

    let last = performance.now();

    function draw(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const p = progressRef.current ?? 0;
      const heat = Math.sin(Math.min(p, 1) * Math.PI) * 0.8 + 0.2;

      ctx.clearRect(0, 0, width, height);

      const bedTop = height * (1 - BED_HEIGHT);
      const bedHeight = height - bedTop;
      const reliefAmp = bedHeight * 0.5;

      // 1. Раскалённое нутро. Контур земли заливаем ДВАЖДЫ: сначала
      // непрозрачной тёмной базой, потом полупрозрачным свечением поверх —
      // иначе сквозь градиент просвечивает фон секции.
      function terrainPath() {
        ctx.beginPath();
        ctx.moveTo(0, height);
        const terrainStep = 16;
        for (let x = 0; x <= width; x += terrainStep) {
          ctx.lineTo(x, bedTop + terrainOffset(x) * reliefAmp);
        }
        ctx.lineTo(width, bedTop + terrainOffset(width) * reliefAmp);
        ctx.lineTo(width, height);
        ctx.closePath();
      }

      terrainPath();
      ctx.fillStyle = '#1c0c05';
      ctx.fill();

      const glowTop = bedTop - reliefAmp - 10;
      const glow = ctx.createLinearGradient(0, glowTop, 0, height);
      glow.addColorStop(0, `rgba(90, 16, 4, ${0.3 + heat * 0.35})`);
      glow.addColorStop(0.4, `rgba(232, 96, 14, ${0.55 + heat * 0.45})`);
      glow.addColorStop(0.75, `rgba(255, 168, 48, ${0.6 + heat * 0.4})`);
      glow.addColorStop(1, `rgba(255, 228, 170, ${0.55 + heat * 0.45})`);
      terrainPath();
      ctx.fillStyle = glow;
      ctx.fill();

      // 1b. Отдушины: очаги жара, пробивающегося наружу между кусками.
      // Рисуются ПОД камнями, поэтому выглядят как свет из глубины, а не
      // как пятна поверх угля.
      ctx.save();
      terrainPath();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      vents.forEach((v) => {
        v.phase += dt * v.speed;
        v.burning = Math.max(0, v.burning - dt * 1.2);
        const pulse = 0.45 + (Math.sin(v.phase) * 0.5 + 0.5) * 0.55;
        const a = pulse * heat * (1 + v.burning * 1.8);
        const r = v.r * (1 + v.burning * 0.5);
        const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
        g.addColorStop(0, `rgba(255, 214, 132, ${0.5 * a})`);
        g.addColorStop(0.35, `rgba(255, 132, 26, ${0.34 * a})`);
        g.addColorStop(1, 'rgba(180, 40, 4, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // 2. Куски угля
      coals.forEach((coal) => {
        coal.phase += dt * coal.pulseSpeed;
        const pulse = 0.65 + Math.sin(coal.phase) * 0.35;

        ctx.save();
        ctx.translate(coal.x, coal.y);
        ctx.rotate(coal.tilt);

        // Тень под куском — отделяет его от соседей и от подложки
        ctx.shadowColor = 'rgba(20, 4, 0, 0.85)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        coal.points.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();

        const half = coal.h * 0.5;
        const body = ctx.createLinearGradient(0, -half, 0, half);
        if (coal.ash) {
          // Прогоревший: серый пепел сверху, тлеющее подбрюшье
          body.addColorStop(0, 'rgba(168, 162, 156, 0.95)');
          body.addColorStop(0.35, 'rgba(88, 82, 78, 0.96)');
          body.addColorStop(0.75, 'rgba(44, 30, 26, 0.97)');
          body.addColorStop(1, `rgba(${150 + heat * 60}, ${40 + heat * 30}, 8, ${0.55 + heat * 0.35})`);
        } else {
          // Уголь почти чёрный — светится только нижняя кромка
          body.addColorStop(0, 'rgba(16, 11, 10, 0.98)');
          body.addColorStop(0.55, 'rgba(26, 16, 14, 0.97)');
          body.addColorStop(0.82, `rgba(${110 + heat * 60}, ${32 + heat * 26}, 8, ${0.7 + heat * 0.25})`);
          body.addColorStop(1, `rgba(${225 + heat * 30}, ${110 + heat * 60}, 24, ${0.6 + heat * 0.4 * pulse})`);
        }
        ctx.fillStyle = body;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Грани: одни плоскости повёрнуты к свету, другие в тень —
        // это и делает кусок объёмным камнем, а не плоским силуэтом
        ctx.save();
        ctx.clip();
        coal.facets.forEach((f) => {
          ctx.beginPath();
          f.poly.forEach(([px, py], i) => {
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fillStyle = f.light
            ? 'rgba(122, 116, 112, 0.3)'
            : 'rgba(0, 0, 0, 0.45)';
          ctx.fill();
        });

        // Раскалённые трещины внутри куска
        if (!coal.ash && coal.depth > 0.25) {
          ctx.strokeStyle = `rgba(255, ${120 + heat * 90}, 36, ${0.5 * heat * pulse})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-coal.w * 0.3, coal.h * 0.1);
          ctx.lineTo(-coal.w * 0.05, -coal.h * 0.14);
          ctx.lineTo(coal.w * 0.2, coal.h * 0.06);
          ctx.lineTo(coal.w * 0.34, -coal.h * 0.04);
          ctx.stroke();
        }
        ctx.restore();

        // Тлеющая кайма по нижней кромке — жар, выедающий камень снизу
        if (!coal.ash) {
          ctx.save();
          ctx.clip();
          ctx.globalCompositeOperation = 'lighter';
          const rim = ctx.createLinearGradient(0, half * 0.15, 0, half);
          rim.addColorStop(0, 'rgba(255, 90, 10, 0)');
          rim.addColorStop(1, `rgba(255, ${140 + heat * 70}, 40, ${0.45 * heat * pulse})`);
          ctx.fillStyle = rim;
          ctx.fillRect(-coal.w, -half, coal.w * 2, coal.h);
          ctx.restore();
        }

        ctx.restore();
      });

      ctx.globalCompositeOperation = 'lighter';

      // 3. Пламя — та же механика, что у огня черепа
      flares.forEach((flare) => {
        if (!flare.fired && p >= flare.at) {
          flare.fired = true;
          flare.burn = flare.duration;
        }
        if (flare.fired && p < flare.at - 0.03) flare.fired = false;

        if (flare.burn > 0) {
          flare.burn -= dt;
          // Щель, из которой бьёт пламя, разгорается ярче — связывает
          // огонь с углём вместо "висящего" сам по себе столба
          flare.vent.burning = Math.min(1, flare.vent.burning + dt * 4);
          flare.accumulator += flare.rate * dt;
          let toSpawn = Math.floor(flare.accumulator);
          flare.accumulator -= toSpawn;
          for (let i = 0; i < FLAME_POOL && toSpawn > 0; i++) {
            if (flames[i].life > 0) continue;
            spawnFlame(flames[i], flare);
            toSpawn--;
          }
        }
      });

      flames.forEach((f) => {
        if (f.life <= 0) return;

        // Подъём + схождение к оси столба, тем сильнее, чем выше залетели —
        // именно это лепит форму языка пламени (converge у черепа)
        f.vy -= dt * 170;
        const rise = f.baseY - f.y;
        const converge = Math.min(1, Math.max(0, rise / f.column));
        f.vx -= (f.x - f.cx) * dt * (1.1 + converge * f.convergeK);
        // лёгкое колыхание
        f.vx += Math.sin(now * 0.003 + f.seed) * dt * 55;

        const damp = 1 - dt * 0.9;
        f.vx *= damp;
        f.vy *= damp;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.life = Math.max(0, f.life - dt * f.decay);

        const a = f.life;
        const sprite = flameSprites[Math.min(SPRITE_STEPS - 1, Math.floor(a * SPRITE_STEPS))];
        // У щели частица мелкая, выше разрастается — язык раскрывается
        // кверху, а не выходит готовым столбом
        const size = f.size * (0.4 + a * 0.85) * (0.45 + converge * 0.9);
        ctx.globalAlpha = a * 0.9;
        ctx.drawImage(sprite, f.x - size, f.y - size, size * 2, size * 2);
      });
      ctx.globalAlpha = 1;

      // 4. Искры
      const spawnChance = heat * 6 * dt;
      sparks.forEach((s) => {
        if (s.life <= 0) {
          if (Math.random() < spawnChance) spawnSpark(s);
          return;
        }
        s.vy -= dt * 20;
        s.vx *= 1 - dt * 0.8;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt * 0.4;

        const a = Math.max(0, s.life);
        ctx.fillStyle = `rgba(255, ${170 + a * 70}, ${60 + a * 90}, ${a * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);

    // Пока секция за пределами экрана, рисовать незачем: сотни камней с
    // тенями, до полутора тысяч частиц пламени и искры съедают кадры даже
    // будучи невидимыми. Именно это и вызывало рывок на границе второго и
    // третьего этажа — там нагрузка канваса накладывалась на пересчёт сразу
    // двух пинов, браузер не успевал отрисовать промежуточные кадры, и GSAP
    // отыгрывал накопленный прогресс одним скачком.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (rafId == null) {
            // Сбрасываем отсчёт времени: иначе первый же кадр после паузы
            // получит громадный dt и швырнёт все частицы разом.
            last = performance.now();
            rafId = requestAnimationFrame(draw);
          }
        } else if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      // Небольшой запас: возобновляем чуть раньше, чем секция реально
      // покажется, чтобы угли не «включались» на глазах у зрителя.
      { rootMargin: '200px 0px' }
    );
    visibility.observe(canvas);

    window.addEventListener('resize', resize);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      visibility.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [progressRef]);

  return <canvas ref={canvasRef} className="ember-field" aria-hidden="true" />;
}

export default EmberField;
