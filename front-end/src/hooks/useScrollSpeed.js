import { useEffect, useRef, useState } from 'react';

/**
 * Считает скорость скролла (px/ms) в реальном времени.
 * По ТЗ: часть анимаций должна реагировать на скорость прокрутки,
 * чтобы при быстром скролле не выглядело как баг.
 *
 * Используем в паре с GSAP ScrollTrigger: scrub можно делать
 * динамическим (число или true) в зависимости от значения speed.
 */
export function useScrollSpeed() {
  const [speed, setSpeed] = useState(0);
  const lastY = useRef(window.scrollY);
  const lastT = useRef(performance.now());

  useEffect(() => {
    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const now = performance.now();
        const y = window.scrollY;
        const dt = now - lastT.current || 1;
        const dy = Math.abs(y - lastY.current);
        setSpeed(dy / dt); // px per ms

        lastY.current = y;
        lastT.current = now;
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return speed;
}
