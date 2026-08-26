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
// allSettled, а не all: если бэкенд не поднят или отвечает ошибкой, сайт
// всё равно должен отрисоваться — просто на фолбэк-данных.
Promise.allSettled([getStacks(), getProjects()])
  .then(([stacksResult, projectsResult]) => {
    setInitialData({
      stacks: stacksResult.status === 'fulfilled' ? stacksResult.value : null,
      projects: projectsResult.status === 'fulfilled' ? projectsResult.value : null,
    });
  })
  .finally(render);
