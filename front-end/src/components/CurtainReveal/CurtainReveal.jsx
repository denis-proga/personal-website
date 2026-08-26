import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './CurtainReveal.css';

gsap.registerPlugin(ScrollTrigger);

const SCROLL_LENGTH = '+=180%';
export const CURTAIN_TRIGGER_ID = 'curtain-projects';

const FOLD_COUNT = 18;

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

  const folds = Array.from({ length: FOLD_COUNT }, (_, i) => i);

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
            const t = i / (FOLD_COUNT - 1);
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
