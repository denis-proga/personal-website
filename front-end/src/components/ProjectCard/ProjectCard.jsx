import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './ProjectCard.css';

// Только для фолбэк-данных ниже — реальные проекты с бэка несут иконку
// напрямую (adaptStack в api/endpoints.js), угадывать её по id не нужно.
const ICONS = '/icons';
const FALLBACK_ICON = {
  python: `${ICONS}/python.svg`,
  django: `${ICONS}/django.svg`,
  javascript: `${ICONS}/javascript.svg`,
  react: `${ICONS}/react.svg`,
  php: `${ICONS}/php.svg`,
  java: `${ICONS}/java.svg`,
  mysql: `${ICONS}/mysql.svg`,
  sql: `${ICONS}/sql.svg`,
  html5: `${ICONS}/html5.svg`,
  css3: `${ICONS}/css3.svg`,
  github: `${ICONS}/github.svg`,
};

function fallbackStack(ids) {
  return ids.map((id) => ({ id, name: id, icon: FALLBACK_ICON[id] }));
}

// 44 -> "44ч / 1д 20ч"
function formatDuration(totalHours) {
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${totalHours}ч`;
  return `${totalHours}ч / ${days}д ${hours}ч`;
}

// title/short_description с реального бэка — объект {ru, uk, en, es, de},
// у фолбэк-проектов (ниже, ProjectsGrid.jsx) — просто строка на русском.
// Функция понимает оба варианта, чтобы не приходилось переписывать фолбэк
// сразу на 5 языков ради того, чтобы карточка не упала.
function pickText(value, lang) {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return value[lang] || value.ru || '';
}

function ProjectCard({ project }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ru').split('-')[0];
  const [zoomed, setZoomed] = useState(false);
  const {
    media_url,
    title,
    short_description,
    total_hours,
    status,
    github_url,
    live_url,
    made_with,
    client_name,
    stack = [],
  } = project;

  const displayTitle = pickText(title, lang);
  const displayDescription = pickText(short_description, lang);

  // Пока обложка раскрыта на весь экран, страница под ней не должна
  // прокручиваться: иначе после закрытия пользователь оказывается
  // совсем в другом месте этажа, чем был до клика.
  useEffect(() => {
    if (!zoomed) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') setZoomed(false);
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [zoomed]);

  // Раскрытая обложка живёт в портале, а не внутри карточки. Причина
  // техническая: position: fixed отсчитывается от ближайшего предка с
  // transform, а трансформы тут повсюду — hover карточки поднимает её на
  // 5px, GSAP оборачивает секции в pin-spacer. Внутри карточки лайтбокс
  // из-за этого прилипал к ней вместо экрана. Портал в body обходит всё.
  const lightbox = (
    <div
      className="project-card__lightbox"
      onClick={() => setZoomed(false)}
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
    >
      <button
        type="button"
        className="project-card__lightbox-close"
        onClick={() => setZoomed(false)}
        aria-label="Закрыть"
      >
        ×
      </button>
      <img src={media_url} alt={displayTitle} className="project-card__lightbox-img" />
    </div>
  );

  return (
    <article className="project-card">
      <div className="project-card__top">
        {/* Левая колонка: фото + время + способ разработки под ним */}
        <div className="project-card__left">
          {/* button, а не div: раскрытие обложки — действие, и оно должно
              работать с клавиатуры и озвучиваться скринридером */}
          <button
            type="button"
            className="project-card__media"
            onClick={() => setZoomed(true)}
            aria-label={`${displayTitle} — увеличить`}
          >
            <img src={media_url} alt={displayTitle} loading="lazy" />
          </button>

          {(total_hours || status) && (
            <div className="project-card__duration">
              {status === 'in-progress'
                ? t('projects.inProgress')
                : formatDuration(total_hours)}
            </div>
          )}

          {made_with && (
            <div className="project-card__made-with">
              {t(`projects.madeWith.${made_with}`)}
            </div>
          )}

          {client_name && <div className="project-card__client">{client_name}</div>}
        </div>

        {/* Правая колонка: название + описание + ссылки внизу */}
        <div className="project-card__right">
          <h3 className="project-card__title">{displayTitle}</h3>
          <p className="project-card__description">{displayDescription}</p>

          {(github_url || live_url) && (
            <div className="project-card__reference">
              <span className="project-card__reference-label">
                {t('projects.reference')}
              </span>
              <div className="project-card__links">
                {github_url && (
                  <a href={github_url} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {live_url && (
                  <a href={live_url} target="_blank" rel="noreferrer">
                    Live
                  </a>
                )}
              </div>
            </div>
          )}

          {stack.length > 0 && (
            <div className="project-card__stack">
              {stack.map((s) => (
                <span key={s.id} className="project-card__stack-badge" title={s.name}>
                  <img src={s.icon} alt={s.name} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {zoomed && createPortal(lightbox, document.body)}
    </article>
  );
}

export default ProjectCard;
export { fallbackStack };
