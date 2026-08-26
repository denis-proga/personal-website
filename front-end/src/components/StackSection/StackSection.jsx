import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import EmberField from '../EmberField/EmberField.jsx';
import { getInitialStacks } from '../../api/initialData.js';
import './StackSection.css';

gsap.registerPlugin(ScrollTrigger);

export const STACK_TRIGGER_ID = 'ember-stack';

const ICONS = '/icons';
const FALLBACK_STACKS = [
  { id: 'python', name: 'Python', icon: `${ICONS}/python.svg`, pdfUrl: null },
  { id: 'django', name: 'Django', icon: `${ICONS}/django.svg`, pdfUrl: null },
  { id: 'javascript', name: 'JavaScript', icon: `${ICONS}/javascript.svg`, pdfUrl: null },
  { id: 'react', name: 'React', icon: `${ICONS}/react.svg`, pdfUrl: null },
  { id: 'php', name: 'PHP', icon: `${ICONS}/php.svg`, pdfUrl: null },
  { id: 'java', name: 'Java', icon: `${ICONS}/java.svg`, pdfUrl: null },
  { id: 'mysql', name: 'MySQL', icon: `${ICONS}/mysql.svg`, pdfUrl: null },
  { id: 'sql', name: 'SQL', icon: `${ICONS}/sql.svg`, pdfUrl: null },
  { id: 'html5', name: 'HTML', icon: `${ICONS}/html5.svg`, pdfUrl: null },
  { id: 'css3', name: 'CSS', icon: `${ICONS}/css3.svg`, pdfUrl: null },
  { id: 'github', name: 'GitHub', icon: `${ICONS}/github.svg`, pdfUrl: null },
];

// Длина скролла зависит от количества иконок: при одном стеке сцена всё
// равно разворачивается полноценно (вспышки, угли), а при двух десятках
// хватает пути, чтобы показать все ряды до перехода на третий этаж.
// При 11 иконках даёт ~169% — практически прежние 160%.
function scrollLengthFor(count) {
  const percent = Math.min(280, Math.max(90, 70 + count * 9));
  return `+=${percent}%`;
}

function StackSection() {
  const { t } = useTranslation();
  // Данные уже загружены в main.jsx до старта React — здесь просто берём
  // готовое. Никакого useEffect с последующей подменой: именно она и рвала
  // расчёты GSAP, потому что происходила уже после построения пина.
  const [stacks] = useState(() => getInitialStacks() ?? FALLBACK_STACKS);
  const [toast, setToast] = useState(null);

  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const titleRef = useRef(null);
  // Прогресс анимации, который читает canvas с углями
  const progressRef = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Анимация "возрождения из пепла". Строится один раз: список иконок
  // окончателен с самого первого кадра и уже не изменится.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray(section.querySelectorAll('.stack-section__item'));
      if (!items.length) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          id: STACK_TRIGGER_ID,
          trigger: section,
          start: 'top top',
          end: scrollLengthFor(items.length),
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
          },
        },
      });

      // Заголовок проступает первым, как будто проявляется в жаре
      tl.fromTo(
        titleRef.current,
        { opacity: 0, filter: 'blur(6px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 0.18, ease: 'power1.out' },
        0
      );

      // Каждая иконка поднимается снизу из своего уголька: сначала
      // раскалённая (белое свечение, размытая), затем остывает до обычного вида
      items.forEach((item, i) => {
        const start = 0.12 + (i / items.length) * 0.55;

        tl.fromTo(
          item,
          {
            opacity: 0,
            y: () => window.innerHeight * 0.45,
            scale: 0.35,
            filter: 'blur(9px) brightness(3.2) saturate(0.2)',
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px) brightness(1) saturate(1)',
            duration: 0.34,
            ease: 'power2.out',
          },
          start
        );

        // Ореол жара вокруг иконки гаснет чуть позже самой иконки
        tl.fromTo(
          item.querySelector('.stack-section__glow'),
          { opacity: 0.95, scale: 1.5 },
          { opacity: 0, scale: 0.8, duration: 0.3, ease: 'power2.out' },
          start + 0.12
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const handleIconClick = (stack) => {
    const url = stack.pdfUrl ?? stack.pdf_url;
    if (url) {
      window.open(url, '_blank', 'noreferrer');
    } else {
      setToast(`Конспект по ${stack.name} скоро появится`);
    }
  };

  return (
    <section id="stack" className="section stack-section" ref={sectionRef}>
      <EmberField progressRef={progressRef} />

      <div className="stack-section__inner">
        <h2 className="stack-section__title" ref={titleRef}>
          {t('stack.title')}
        </h2>

        <div className="stack-section__grid" ref={gridRef}>
          {stacks.map((stack) => (
            <button
              key={stack.id}
              className="stack-section__item"
              data-tooltip={stack.name}
              onClick={() => handleIconClick(stack)}
            >
              <span className="stack-section__glow" aria-hidden="true" />
              <img src={stack.icon ?? stack.icon_url} alt={stack.name} loading="lazy" />
            </button>
          ))}
        </div>

        {toast && <div className="stack-section__toast">{toast}</div>}
      </div>
    </section>
  );
}

export default StackSection;
