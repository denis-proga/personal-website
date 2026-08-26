# Portfolio — Frontend

React + Vite. Одностраничный сайт с scroll-анимациями.
Бэкенд: Django 6 + MySQL, REST API на `http://127.0.0.1:8000/api/`.

## Установка

```bash
cd frontend
npm install
npm run dev
```

Дев-сервер: `http://localhost:5173`, запросы на `/api/*` проксируются на Django (см. `vite.config.js`).

## Структура

```
src/
  api/            axios-клиент + функции под /api/projects/, /stacks/, /comments/, /likes/
  components/
    IntroAnimation/   3D въезд в монитор при загрузке (Three.js) — ЗАГЛУШКА, детальный шаг далее
    Header/           инициалы, соцсети, ссылка на резюме, переключатель темы
    TypingText/       переиспользуемый "печатающийся" текст с моргающим курсором
    SkullAnimation/   3D череп с языками программирования (Three.js) — ЗАГЛУШКА
    StackSection/     иконки стека, кликабельные -> PDF-конспекты
    ProjectCard/       карточка одного проекта
    ProjectsGrid/      сетка карточек, тянет /api/projects/
  context/        ThemeContext (тёмная/светлая тема)
  hooks/          useScrollSpeed — скорость скролла для анимаций, завязанных на неё
  i18n/           i18next, 5 языков: ru, uk, en, es, de
  styles/         variables.css (палитра), global.css (сброс + reduced-motion)
```

## Что уже сделано

- Базовый скелет всех секций в правильном порядке скролла
- i18n на 5 языков с ключами-плейсхолдерами
- Тема (тёмная/светлая) через CSS-переменные и `data-theme`
- Хук скорости скролла (для GSAP ScrollTrigger scrub)
- Печатающийся текст как переиспользуемый компонент
- API-клиент под готовые Django-эндпоинты

## Дальше по плану (отдельные детальные шаги)

1. IntroAnimation — реальная Three.js сцена (стол, монитор, tunnel-zoom)
2. SkullAnimation — 3D-череп + ротация языков программирования
3. GSAP ScrollTrigger интеграция во все секции + привязка к useScrollSpeed
4. Клик по иконке стека -> просмотр PDF (300 стр.) — выбрать формат
5. Формат/дизайн карточки проекта — финальная вёрстка
6. Реальный контент Header (соцсети, инициалы, описание)
7. Django: подключить резюме как отдельную страницу/эндпоинт
