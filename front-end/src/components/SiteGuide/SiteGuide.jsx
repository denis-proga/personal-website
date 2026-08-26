import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './SiteGuide.css';

/**
 * Ненавязчивый гид по сайту.
 *
 * В свёрнутом виде — одна строка, которая не спорит с текстом «обо мне».
 * Разворачивается по клику: посетитель сам решает, нужна ли ему подсказка.
 * Так интерактивные возможности перестают быть «пасхалками», о которых
 * никто не узнает, но и не превращаются в навязчивый туториал.
 */
const ITEMS = [
  { key: 'skull', icon: '☠', fallback: 'Череп реагирует на курсор — кликните, чтобы поджечь' },
  { key: 'stack', icon: '◈', fallback: 'Кликните по технологии, чтобы открыть конспект' },
  { key: 'scroll', icon: '↓', fallback: 'Листайте вниз — каждый этаж со своей анимацией' },
  { key: 'resume', icon: '▤', fallback: 'Кнопка «Резюме» открывает интерактивную страницу' },
  { key: 'magnifier', icon: '◎', fallback: 'На резюме зажмите лупу и перемещайте её по странице' },
  { key: 'live', icon: '↗', fallback: 'Ссылка «Live» ведёт на живой сайт проекта' },
  { key: 'download', icon: '⤓', fallback: 'Резюме можно скачать в PDF на своём языке' },
];

function SiteGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={`site-guide ${open ? 'site-guide--open' : ''}`}>
      <button
        type="button"
        className="site-guide__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="site-guide__spark" aria-hidden="true" />
        <span>{t('guide.title', 'Что можно сделать на сайте')}</span>
        <svg className="site-guide__chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 10 L12 14 L16 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Список всегда в разметке — так раскрытие можно анимировать через
          grid-template-rows, а не дёргать высоту скриптом */}
      <div className="site-guide__panel">
        <ul className="site-guide__list">
          {ITEMS.map((item, i) => (
            <li
              key={item.key}
              className="site-guide__item"
              style={{ '--delay': `${i * 0.045}s` }}
            >
              <span className="site-guide__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{t(`guide.${item.key}`, item.fallback)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SiteGuide;
