import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './CurtainReveal.css';

gsap.registerPlugin(ScrollTrigger);

const SCROLL_LENGTH = '+=180%';
export const CURTAIN_TRIGGER_ID = 'curtain-projects';

// Складок на широком экране и на телефоне разное количество. Каждая складка —
// это слой со сложным градиентом, который перерисовывается на каждом кадре
// скролла; восемнадцать таких слоёв на двух панелях мобильный GPU не тянет,
// и весь переход идёт рывками. Десяти достаточно: на узком экране разница
// в детализации ткани не читается.
const FOLD_COUNT_DESKTOP = 18;
const FOLD_COUNT_MOBILE = 10;
const MOBILE_WIDTH = 760;

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Театральный занавес.
 *
 * Ключ к "ткани, а не шиферу" — геометрия складок:
 *  1. складки расходятся ВЕЕРОМ (сходятся кверху, где ткань собрана
 *     на карнизе, и расширяются книзу) — параллельные полосы читаются
 *     как жёсткий лист
 *  2. нижний край ОТСТАЁТ от верхнего при движении, внутренняя кромка
 *     получается дугой, а не вертикалью
 *  3. резкий контраст: почти чёрные впадины, яркие гребни
 */
function CurtainReveal({ children }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const railRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // При отключённых в системе анимациях занавес скрыт через CSS
    // (см. media-запрос в CurtainReveal.css). Раньше таймлайн всё равно
    // создавался, и пин длиной в 180% экрана оставался на месте: человек
    // прокручивал почти два экрана пустоты, потому что скрытой шторе нечего
    // было показывать. Теперь при reduce ScrollTrigger не создаётся вовсе —
    // переход от стека к проектам становится обычным скроллом.
    //
    // Это же состояние включают на слабых машинах, отключая анимации
    // системы ради скорости, так что случай совсем не редкий.
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const left = leftRef.current;
      const right = rightRef.current;
      const rail = railRef.current;
      const stage = stageRef.current;

      const leftFolds = gsap.utils.toArray(left.querySelectorAll('.curtain-fold'));
      const rightFolds = gsap.utils.toArray(right.querySelectorAll('.curtain-fold'));
      const leftSheet = left.querySelector('.curtain-panel__folds');
      const rightSheet = right.querySelector('.curtain-panel__folds');

      const tl = gsap.timeline({
        scrollTrigger: {
          id: CURTAIN_TRIGGER_ID,
          trigger: container,
          start: 'top top',
          end: SCROLL_LENGTH,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
        },
      });

      // Полотно уезжает. skewX даёт отставание низа от верха — ткань
      // волочится, кромка идёт по диагонали, а не строго вертикально.
      tl.to(left, { xPercent: -114, skewX: 9, ease: 'power2.in', duration: 1 }, 0)
        .to(right, { xPercent: 114, skewX: -9, ease: 'power2.in', duration: 1 }, 0)

        // Сборка ткани: сжимается ВЕСЬ блок складок целиком, а не каждая
        // складка по отдельности. Поштучное сжатие оставляло за собой место
        // в flex-раскладке — в зазоры просвечивала страница белыми полосами.
        .to(leftSheet, { scaleX: 0.34, ease: 'power1.inOut', duration: 0.9 }, 0.02)
        .to(rightSheet, { scaleX: 0.34, ease: 'power1.inOut', duration: 0.9 }, 0.02)

        // Веер раскрывается сильнее по мере сборки — низ разлетается
        .to(
          leftFolds,
          {
            rotation: (i) => -1.2 - i * 0.22,
            ease: 'sine.inOut',
            duration: 0.9,
            stagger: { each: 0.014, from: 'end' },
          },
          0.02
        )
        .to(
          rightFolds,
          {
            rotation: (i) => 1.2 + i * 0.22,
            ease: 'sine.inOut',
            duration: 0.9,
            stagger: { each: 0.014, from: 'start' },
          },
          0.02
        )

        // Карниз уходит чуть раньше штор — иначе на последних кадрах
        // остаётся висеть один, когда ткани уже почти нет
        .to(rail, { opacity: 0, y: -34, ease: 'power1.out', duration: 0.12 }, 0.74)
        // Створки гаснут только в самом финале, когда они уже практически
        // за краями экрана — до этого волна ткани видна целиком
        .to([left, right], { opacity: 0, ease: 'power1.in', duration: 0.08 }, 0.92)
        .set(stage, { autoAlpha: 0 });
    }, container);

    return () => ctx.revert();
  }, []);

  // Замер один раз при монтировании, без подписки на resize: перестроение
  // складок на лету пересобрало бы DOM прямо во время скролла и сбило бы
  // точки пина. Поворот телефона — случай редкий, ради него ломать переход
  // не стоит.
  const foldCount =
    typeof window !== 'undefined' && window.innerWidth < MOBILE_WIDTH
      ? FOLD_COUNT_MOBILE
      : FOLD_COUNT_DESKTOP;

  const folds = Array.from({ length: foldCount }, (_, i) => i);

  const renderPanel = (side, ref) => {
    const dir = side === 'left' ? 1 : -1;
    return (
      <div className={`curtain-panel curtain-panel--${side}`} ref={ref}>
        <div className="curtain-panel__folds">
          {/* Подложка внутри блока складок: сжимается и едет вместе с тканью,
              поэтому её границы всегда совпадают с краем шторы */}
          <span className="curtain-panel__backing" />
          <span className="curtain-panel__sheen" />
          <span className="curtain-panel__hem" />
          {folds.map((i) => {
            // Веер в покое: складки у внутреннего края почти вертикальны,
            // к внешнему — всё сильнее заваливаются. Ширина неравномерна.
            const t = i / (foldCount - 1);
            return (
              <span
                key={i}
                className="curtain-fold"
                style={{
                  flexGrow: 1 + Math.sin(i * 1.7) * 0.35,
                  transform: `rotate(${dir * t * 2.6}deg)`,
                  '--shade': 0.55 + Math.sin(i * 2.3) * 0.28,
                  '--peak': 0.9 + Math.sin(i * 1.1) * 0.1,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="curtain-reveal" ref={containerRef}>
      <div className="curtain-reveal__stage" ref={stageRef} aria-hidden="true">
        {renderPanel('left', leftRef)}
        {renderPanel('right', rightRef)}

        <div className="curtain-rail" ref={railRef}>
          <div className="curtain-rail__bar" />
          <div className="curtain-rail__rings">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className="curtain-rail__ring" />
            ))}
          </div>
          <span className="curtain-rail__cap curtain-rail__cap--left" />
          <span className="curtain-rail__cap curtain-rail__cap--right" />
        </div>
      </div>

      {children}
    </div>
  );
}

export default CurtainReveal;
