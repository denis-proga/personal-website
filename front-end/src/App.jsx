import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeProvider } from './context/ThemeContext.jsx';
import IntroAnimation from './components/IntroAnimation/IntroAnimation.jsx';
import Header from './components/Header/Header.jsx';
import ScrollNav from './components/ScrollNav/ScrollNav.jsx';
import AboutText from './components/AboutText/AboutText.jsx';
import SkullAnimation from './components/SkullAnimation/SkullAnimation.jsx';
import ScrollHint from './components/ScrollHint/ScrollHint.jsx';
import SiteGuide from './components/SiteGuide/SiteGuide.jsx';
import StackSection from './components/StackSection/StackSection.jsx';
import ProjectsGrid from './components/ProjectsGrid/ProjectsGrid.jsx';
import CurtainReveal from './components/CurtainReveal/CurtainReveal.jsx';

gsap.registerPlugin(ScrollTrigger);

// Порядок секций = порядок скролла по ТЗ:
// 1. Intro (заезд в монитор) -> 2. Header (сразу виден) ->
// 3. Обо мне (печатающийся текст) + череп справа ->
// 4. Stack -> 5. Projects (карточки, тянутся из /api/projects/)
// Пропуск интро при возврате с резюме.
//
// Резюме открывается в новой вкладке, но кнопка "Назад" на резюме — это
// клиентский переход react-router (<Link to="/">) внутри ТОЙ ЖЕ вкладки:
// страница не перезагружается, React просто меняет ResumePage на App.
// Поэтому sessionStorage тут работает штатно — он живёт всю жизнь вкладки,
// а не привязан к конкретному экрану внутри неё. ResumeNav перед переходом
// назад выставляет флаг; здесь мы его читаем и сразу стираем — одноразово,
// именно на этот единственный переход. Обычная перезагрузка (F5) флага не
// находит и всегда показывает интро заново, как и должно быть.
const RETURN_FLAG = 'portfolio_skip_intro_once';

// Чистая функция, без побочных эффектов: только читает, ничего не стирает.
// React.StrictMode в деве вызывает инициализатор useState ДВАЖДЫ — если бы
// стирание флага было здесь же, первый вызов его бы уже удалил, а второй
// (тот, чей результат React реально использует) находил бы пустоту и
// показывал интро заново, несмотря на корректно выставленный флаг.
function readSkipIntro() {
  // Ручной пропуск при отладке: /?skipIntro=1
  if (new URLSearchParams(window.location.search).has('skipIntro')) return true;

  try {
    return sessionStorage.getItem(RETURN_FLAG) === 'true';
  } catch {
    return false;
  }
}

function App() {
  const [introDone, setIntroDone] = useState(readSkipIntro);

  // Стираем флаг здесь, а не в инициализаторе состояния: removeItem на уже
  // отсутствующем ключе — просто no-op, поэтому двойной вызов эффекта в
  // StrictMode (мод "монтируем -> размонтируем -> монтируем снова") ничего
  // не ломает, в отличие от чтения с удалением в одном месте.
  useEffect(() => {
    try {
      sessionStorage.removeItem(RETURN_FLAG);
    } catch {
      /* приватный режим — не критично */
    }
  }, []);

  const handleIntroFinish = () => {
    setIntroDone(true);
  };

  // Пин-секции (StackSection, CurtainReveal) замеряют высоту страницы один
  // раз при монтировании GSAP-таймлайна. Фолбэк-данные были лёгкими SVG —
  // рендерились мгновенно, замер был верным. Реальные картинки с бэка
  // (скриншоты проектов, иконки) грузятся асинхронно и меняют высоту
  // страницы ПОСЛЕ этого замера — точки скролла у GSAP остаются старыми,
  // и рассинхрон каскадом ломает все секции ниже той, где картинка
  // догрузилась позже всех. `load` не всплывает у <img>, но перехватывается
  // на фазе капчура — поэтому слушаем на window с capture: true, это ловит
  // загрузку любой картинки на странице, а не только уже известных сейчас.
  useEffect(() => {
    let rafId;
    function handleLoad(event) {
      if (event.target.tagName !== 'IMG') return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => ScrollTrigger.refresh());
    }
    window.addEventListener('load', handleLoad, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('load', handleLoad, true);
    };
  }, []);

  // Пока идёт интро — блокируем скролл, чтобы нельзя было "убежать" вперёд
  useEffect(() => {
    document.body.style.overflow = introDone ? '' : 'hidden';
  }, [introDone]);

  return (
    <ThemeProvider>
      {!introDone && <IntroAnimation onFinish={handleIntroFinish} />}

      <div className={`site-content ${introDone ? 'site-content--visible' : ''}`}>
        <Header />
        <ScrollNav />
        <main>
          <section id="about" className="section about-section">
            <div className="about-section__text">
              <AboutText active={introDone} />
              <SiteGuide />
            </div>
            <SkullAnimation />
            <ScrollHint active={introDone} />
          </section>

          <StackSection />

          <CurtainReveal>
            <ProjectsGrid />
          </CurtainReveal>
        </main>
        {/* Футер решили не делать — см. обсуждение: скролл-анимационный сайт,
            футер будет мешать. Если понадобится — добавляем сюда. */}
      </div>
    </ThemeProvider>
  );
}

export default App;
