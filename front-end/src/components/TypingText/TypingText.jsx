import { useEffect, useRef, useState } from 'react';
import './TypingText.css';

/**
 * Переиспользуемый "печатающийся" текст с моргающим курсором.
 * Используется и для текста "обо мне", и для заголовков "stack" / "experience".
 * Это анимация ПО ТАЙМЛАЙНУ (не зависит от скролла) — печатает один раз,
 * когда компонент попадает во вьюпорт (через IntersectionObserver).
 *
 * Пропсы:
 *  text        — строка для печати
 *  speed       — мс на символ (по умолчанию 45)
 *  as          — тег-обёртка ('p', 'h2', ...), по умолчанию 'span'
 *  startOnView — если true, ждёт появления в вьюпорте перед стартом
 */
function TypingText({ text = '', speed = 45, as: Tag = 'span', startOnView = true }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(!startOnView);
  const [done, setDone] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView || started) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView, started]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      setDone(true);
      return;
    }
    const timeout = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timeout);
  }, [started, displayed, text, speed]);

  return (
    <Tag ref={ref} className="typing-text">
      {displayed}
      <span className={`typing-cursor ${done ? 'typing-cursor--blink' : ''}`}>_</span>
    </Tag>
  );
}

export default TypingText;
