import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import ResumePage from './pages/Resume/ResumePage.jsx';
import { getStacks, getProjects } from './api/endpoints.js';
import { setInitialData } from './api/initialData.js';
import './i18n/i18n.js';
import './styles/variables.css';
import './styles/global.css';

// Сколько ждём спящий бэкенд, прежде чем показать сайт на фолбэк-данных.
// Бесплатный Render поднимает сервис за 30-60 секунд; держать посетителя
// на заставке дольше нельзя, поэтому на 40-й секунде рисуем то,
// что есть. Данные, пришедшие позже, уже не подставляем: подмена после
// первого кадра ломает GSAP-пины (см. комментарий ниже).
const API_TIMEOUT = 40000;

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT)
    ),
  ]);
}

// Заставка живёт в index.html и показывается ещё до загрузки бандла.
// Снимаем её только когда React смонтирован, с короткой растворяющей
// анимацией, чтобы переход не был резким.
function hideLoader() {
  const loader = document.getElementById('app-loader');
  if (!loader) return;
  loader.classList.add('is-done');
  setTimeout(() => loader.remove(), 500);
}

function render() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/resume" element={<ResumePage />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );

  // Даём React дорисовать первый кадр, иначе заставка исчезнет на мгновение
  // раньше, чем появится контент, и мелькнёт пустой фон
  requestAnimationFrame(() => requestAnimationFrame(hideLoader));
}

// Стеки и проекты запрашиваются ДО первого рендера React.
//
// Раньше компоненты стартовали с фолбэка и подменяли его данными из API
// через setState. Но к моменту подмены GSAP уже успевал запинить секции на
// высоте фолбэка: пересборка активного pin-триггера оставляла после себя
// рассинхрон, точки start/end у секций ниже (в первую очередь у занавеса)
// считались от неверной высоты документа, и пины начинали перекрываться.
//
// Здесь ответ получен заранее, поэтому StackSection и ProjectsGrid с самого
// первого кадра рендерятся с окончательным списком — подменять нечего,
// пин строится один раз и остаётся верным.
//
// allSettled, а не all: если бэкенд не поднят, отвечает ошибкой или не
// уложился в API_TIMEOUT, сайт всё равно должен отрисоваться — просто на
// фолбэк-данных.
Promise.allSettled([withTimeout(getStacks()), withTimeout(getProjects())])
  .then(([stacksResult, projectsResult]) => {
    setInitialData({
      stacks: stacksResult.status === 'fulfilled' ? stacksResult.value : null,
      projects: projectsResult.status === 'fulfilled' ? projectsResult.value : null,
    });
  })
  .finally(render);
