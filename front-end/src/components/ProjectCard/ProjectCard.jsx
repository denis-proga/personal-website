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

  return (
    <article className="project-card">
      <div className="project-card__top">
        {/* Левая колонка: фото + время + способ разработки под ним */}
        <div className="project-card__left">
          <div className="project-card__media">
            <img src={media_url} alt={displayTitle} loading="lazy" />
          </div>

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
    </article>
  );
}

export default ProjectCard;
export { fallbackStack };
