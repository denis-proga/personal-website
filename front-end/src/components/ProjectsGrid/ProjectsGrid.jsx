import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectCard, { fallbackStack } from '../ProjectCard/ProjectCard.jsx';
import { getInitialProjects } from '../../api/initialData.js';
import './ProjectsGrid.css';

// Фолбэк на случай, если бэкенд не поднят или в базе пусто.
// TODO: сменить media_url на реальные скриншоты/gif, когда будут готовы.
const FALLBACK_PROJECTS = [
  {
    id: 'father-barill',
    media_url: '/projects/father-barill.svg',
    title: 'Father Barill',
    short_description:
      'Интернет-магазин дубовых бочек и аксессуаров для домашнего виноделия/самогоноварения. Django + PostgreSQL, деплой на Render.',
    total_hours: 44,
    status: null,
    github_url: 'https://github.com/denis-proga/father-barill',
    live_url: 'https://father-barill.onrender.com',
    made_with: 'ai_half',
    client_name: null,
    stack: fallbackStack(['python', 'django', 'mysql', 'html5', 'css3']),
  },
  {
    id: 'durak',
    media_url: '/projects/durak.svg',
    title: 'Дурак — Multiplayer Card Game',
    short_description:
      'Полноценная мультиплеерная карточная игра: 3D-сцена на Three.js, WebSocket через Django Channels, полная игровая логика и переподключение.',
    total_hours: 18,
    status: null,
    github_url: 'https://github.com/denis-proga/durak',
    live_url: 'https://durak-game-ejei.onrender.com',
    made_with: 'ai_half',
    client_name: null,
    stack: fallbackStack(['javascript', 'react', 'python', 'django']),
  },
  {
    id: 'portfolio',
    media_url: '/projects/portfolio.svg',
    title: 'Личное портфолио',
    short_description:
      'Этот самый сайт: 3D-интро с заездом в монитор, интерактивный череп, scroll-анимации, Django REST API на бэкенде.',
    total_hours: null,
    status: 'in-progress',
    github_url: null,
    live_url: null,
    made_with: 'ai_half',
    client_name: null,
    stack: fallbackStack(['javascript', 'react', 'python', 'django', 'html5', 'css3']),
  },
];

function ProjectsGrid() {
  const { t } = useTranslation();
  // Как и в StackSection: данные пришли до старта React (main.jsx), здесь
  // берём готовое. Подмены после рендера нет — значит высота секции не
  // меняется под уже построенным пином занавеса.
  const [projects] = useState(() => getInitialProjects() ?? FALLBACK_PROJECTS);

  return (
    <section id="projects" className="section projects-grid">
      {/* Печать здесь отменена вместе со вторым этажом: секция открывается
          занавесом по скроллу, посимвольный набор с этим не сочетался. */}
      <h2 className="projects-grid__title">{t('projects.title')}</h2>

      <div className="projects-grid__list">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}

export default ProjectsGrid;
