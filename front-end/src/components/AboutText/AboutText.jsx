import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './AboutText.css';

// Блоки печатаются подряд, как одна непрерывная строка: заголовок, затем
// подзаголовок, затем абзац. Скорость у каждого своя — заголовок набирается
// вальяжно, тело текста заметно быстрее, иначе абзац на несколько сотен
// символов печатался бы десяток секунд.
const SEGMENTS = [
  { key: 'about.title', Tag: 'h1', className: 'about-text__title', speed: 52 },
  { key: 'about.subtitle', Tag: 'h2', className: 'about-text__subtitle', speed: 38 },
  { key: 'about.text', Tag: 'p', className: 'about-text__body', speed: 17 },
];

/**
 * Текст "обо мне", набирающийся символ за символом с ведущим курсором.
 *
 * Это НЕ скролл-анимация: у неё собственный таймер, она не привязана ни к
 * колесу, ни к ScrollNav, ни к появлению во вьюпорте. Пользователь может
 * уехать на другой этаж и вернуться — печать всё это время шла своим ходом
 * и продолжится ровно с того места, где была. Поэтому здесь нет
 * IntersectionObserver: он бы стартовал печать по видимости и тем самым
 * привязал её к положению скролла.
 */
function AboutText({ active }) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState(0);

  const texts = SEGMENTS.map((s) => t(s.key));
  const lengths = texts.map((txt) => txt.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  // Ключ пересобирает печать при смене языка: тексты стали другими,
  // продолжать набирать со старой позиции бессмысленно.
  const textKey = texts.join('\u0000');

  useEffect(() => {
    setTyped(0);
  }, [textKey]);

  useEffect(() => {
    if (!active) return; // ждём, пока не закончится IntroAnimation (в т.ч. по Skip)
    if (total === 0) return;

    let rafId;
    let index = 0;
    let acc = 0;
    let last = performance.now();

    // Скорость берётся у того сегмента, который набирается прямо сейчас
    function speedAt(i) {
      let offset = 0;
      for (let s = 0; s < SEGMENTS.length; s++) {
        offset += lengths[s];
        if (i < offset) return SEGMENTS[s].speed;
      }
      return SEGMENTS[SEGMENTS.length - 1].speed;
    }

    function tick(now) {
      acc += now - last;
      last = now;

      let advanced = false;
      while (index < total && acc >= speedAt(index)) {
        acc -= speedAt(index);
        index++;
        advanced = true;
      }
      // Обновляем состояние только когда реально прибавился символ,
      // а не на каждом кадре — лишние ререндеры тут ни к чему
      if (advanced) setTyped(index);

      if (index < total) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, textKey, total]);

  const done = typed >= total;

  // Курсор живёт в конце того блока, который набирается сейчас,
  // и остаётся в конце последнего, когда всё допечатано
  let cursorIndex = SEGMENTS.length - 1;
  let offset = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    offset += lengths[i];
    if (typed < offset) {
      cursorIndex = i;
      break;
    }
  }

  let consumed = 0;

  return (
    <div className="about-text">
      {SEGMENTS.map((segment, i) => {
        const shown = Math.max(0, Math.min(lengths[i], typed - consumed));
        consumed += lengths[i];
        const { Tag } = segment;

        return (
          <Tag key={segment.key} className={segment.className}>
            {texts[i].slice(0, shown)}
            {!done && cursorIndex === i && (
              <span className="about-text__cursor about-text__cursor--blink">_</span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}

export default AboutText;
