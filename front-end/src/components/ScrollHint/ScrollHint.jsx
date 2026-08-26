import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STACK_TRIGGER_ID } from '../StackSection/StackSection.jsx';
import './ScrollHint.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Подсказка «листайте вниз» внизу первого экрана.
 *
 * Весь сайт держится на скролле, но первый экран об этом никак не сообщал —
 * посетитель мог не понять, что дальше что-то есть. Подсказка исчезает после
 * первого же прокручивания и больше не появляется: своё дело она сделала.
 */
function ScrollHint({ active }) {
  const { t } = useTranslation();
  const [gone, setGone] = useState(false);
  const tweenRef = useRef(null);

  useEffect(() => {
    if (!active || gone) return;

    function handleScroll() {
      // Небольшой порог, чтобы случайное касание тачпада не убирало подсказку
      if (window.scrollY > 60) setGone(true);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [active, gone]);

  useEffect(() => () => tweenRef.current?.kill(), []);

  // Клик ведёт на второй этаж ровно так же, как точки ScrollNav: сначала
  // спокойный подъезд к началу пин-зоны, затем размеренная прокрутка самой
  // зоны — именно она и проигрывает анимацию углей целиком. Просто доехать
  // до верха секции мало: анимация осталась бы непроигранной, и переход
  // выглядел бы оборванным.
  const handleClick = () => {
    tweenRef.current?.kill();

    const trigger = ScrollTrigger.getById(STACK_TRIGGER_ID);
    const proxy = { y: window.scrollY };
    const tl = gsap.timeline({
      onUpdate: () => window.scrollTo(0, proxy.y),
    });
    tweenRef.current = tl;

    if (trigger) {
      tl.to(proxy, { y: trigger.start, duration: 0.7, ease: 'sine.out' })
        .to(proxy, { y: trigger.end, duration: 2.6, ease: 'none' });
    } else {
      // Пин ещё не построен — просто доезжаем до секции
      const target = document.getElementById('stack');
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      tl.to(proxy, { y: top, duration: 0.9, ease: 'sine.inOut' });
    }
  };

  if (!active) return null;

  return (
    <button
      type="button"
      className={`scroll-hint ${gone ? 'scroll-hint--gone' : ''}`}
      onClick={handleClick}
      aria-label={t('hints.scroll', 'Листайте вниз')}
    >
      <span className="scroll-hint__label">{t('hints.scroll', 'Листайте вниз')}</span>
      <span className="scroll-hint__mouse" aria-hidden="true">
        <span className="scroll-hint__wheel" />
      </span>
      {/* Две стрелки со сдвигом по фазе — движение читается как «дальше вниз»,
          а не как одиночное подмигивание */}
      <span className="scroll-hint__arrows" aria-hidden="true">
        <svg className="scroll-hint__arrow" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9 L12 15 L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          className="scroll-hint__arrow scroll-hint__arrow--second"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9 L12 15 L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

export default ScrollHint;
