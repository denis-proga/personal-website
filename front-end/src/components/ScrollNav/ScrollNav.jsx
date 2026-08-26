import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CURTAIN_TRIGGER_ID } from '../CurtainReveal/CurtainReveal.jsx';
import { STACK_TRIGGER_ID } from '../StackSection/StackSection.jsx';
import './ScrollNav.css';

gsap.registerPlugin(ScrollTrigger);

const FLOORS = [
  { id: 'about', percent: 0 },
  { id: 'stack', percent: 50 },
  { id: 'projects', percent: 100 },
];

// Секции, у которых есть pin-анимация.
const PINNED = { stack: STACK_TRIGGER_ID, projects: CURTAIN_TRIGGER_ID };

// Лёгкий проскролл (не путать с проигрыванием анимации зоны): длительность
// растёт плавной кривой, а не жёстким клэмпом — короткие расстояния едут
// мягко и неспешно, длинные приближаются к потолку постепенно, без резкого
// обрыва на границе.
const PROSCROLL_MIN = 0.55;
const PROSCROLL_MAX = 1.9;
const PROSCROLL_SCALE = 1400; // px — как быстро длительность приближается к потолку

function proscrollDuration(distance) {
  const eased = 1 - Math.exp(-distance / PROSCROLL_SCALE);
  return PROSCROLL_MIN + (PROSCROLL_MAX - PROSCROLL_MIN) * eased;
}

// Одна и та же скорость проигрывания зоны что вниз, что вверх.
const THROUGH_DURATION = 2.6;

function documentTop(el) {
  return el.getBoundingClientRect().top + window.scrollY;
}

// Позиция, в которой этаж считается "показанным": для анимированных этажей
// это ВСЕГДА готовое, законченное состояние (иконки подняты / шторы открыты),
// а не сырое — независимо от того, снизу мы пришли или сверху.
function getRestY(id) {
  const triggerId = PINNED[id];
  if (triggerId) {
    const trigger = ScrollTrigger.getById(triggerId);
    if (trigger) return trigger.end;
  }
  const el = document.getElementById(id);
  return el ? documentTop(el) : window.scrollY;
}

function ScrollNav() {
  const [active, setActive] = useState(FLOORS[0].id);
  const tweenRef = useRef(null);

  useEffect(() => {
    function handleScroll() {
      const anchor = window.innerHeight * 0.4;
      let current = FLOORS[0].id;
      for (const floor of FLOORS) {
        const el = document.getElementById(floor.id);
        if (!el) continue;
        // getBoundingClientRect, а не offsetTop: GSAP pin оборачивает секцию
        // в pin-spacer, из-за чего offsetTop считается относительно него
        // и координаты всех секций съезжают.
        if (el.getBoundingClientRect().top <= anchor) current = floor.id;
      }
      setActive(current);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Прокрутка окна без ScrollToPlugin: анимируем прокси-объект и на каждом
  // кадре двигаем window. Возвращает timeline, чтобы можно было дописать
  // сколько угодно фаз встык, без паузы между ними.
  const buildScrollTimeline = () => {
    tweenRef.current?.kill();
    const proxy = { y: window.scrollY };
    const tl = gsap.timeline({
      onUpdate: () => window.scrollTo(0, proxy.y),
    });
    tweenRef.current = tl;
    return { tl, proxy };
  };

  const handleClick = (id) => {
    if (id === active) return;

    const startY = window.scrollY;
    const targetY = getRestY(id);
    if (Math.abs(targetY - startY) < 1) return;

    const direction = targetY > startY ? 1 : -1;
    const lo = Math.min(startY, targetY);
    const hi = Math.max(startY, targetY);

    // Какие пин-зоны реально стоят между текущей позицией и целью —
    // не по "номеру этажа", а по факту пересечения диапазонов. Так зона
    // штор корректно учитывается и тогда, когда цель — вовсе не "этаж 3"
    // (например идём с 3 на 2, но физически ещё стоим внутри зоны штор).
    const triggers = [STACK_TRIGGER_ID, CURTAIN_TRIGGER_ID]
      .map((tid) => ScrollTrigger.getById(tid))
      .filter((t) => t && t.end > lo && t.start < hi)
      .sort((a, b) => (direction === 1 ? a.start - b.start : b.start - a.start));

    const { tl, proxy } = buildScrollTimeline();
    let cursor = startY;

    triggers.forEach((trig) => {
      // Направление входа/выхода зависит от направления движения: вниз —
      // входим сверху и доигрываем до низа, вверх — входим снизу и
      // доигрываем до верха (реверс той же анимации, та же скорость).
      const entry = direction === 1 ? trig.start : trig.end;
      const exit = direction === 1 ? trig.end : trig.start;

      const approachDist = Math.abs(entry - cursor);
      if (approachDist > 1) {
        tl.to(proxy, { y: entry, duration: proscrollDuration(approachDist), ease: 'sine.out' });
        cursor = entry;
      }

      tl.to(proxy, { y: exit, duration: THROUGH_DURATION, ease: 'none' });
      cursor = exit;
    });

    // Остаток пути после всех зон (или весь путь, если зон по дороге не было).
    const leftover = Math.abs(targetY - cursor);
    if (leftover > 1) {
      tl.to(proxy, { y: targetY, duration: proscrollDuration(leftover), ease: 'sine.out' });
    }
  };

  // Клик по другой точке во время анимации должен её прерывать
  useEffect(() => {
    const stop = () => tweenRef.current?.kill();
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      tweenRef.current?.kill();
    };
  }, []);

  return (
    <nav className="scroll-nav" aria-label="Навигация по секциям сайта">
      <div className="scroll-nav__line" />
      {FLOORS.map((floor) => (
        <button
          key={floor.id}
          type="button"
          className={`scroll-nav__dot ${active === floor.id ? 'scroll-nav__dot--active' : ''}`}
          style={{ top: `${floor.percent}%` }}
          onClick={() => handleClick(floor.id)}
          aria-label={`Перейти к разделу: ${floor.id}`}
          aria-current={active === floor.id ? 'true' : undefined}
        />
      ))}
    </nav>
  );
}

export default ScrollNav;
