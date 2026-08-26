import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ResumeNav.css';

// Резюме лежит в public/cv/ по одному файлу на язык. Ключ — код языка i18n,
// downloadName — имя, под которым файл сохранится у работодателя: имя в нём
// написано так же, как внутри самого документа.
const CV_FILES = {
  ru: { file: '/cv/cv-ru.pdf', downloadName: 'CV-Denys-Peresunko-RU.pdf' },
  uk: { file: '/cv/cv-uk.pdf', downloadName: 'CV-Denys-Peresunko-UK.pdf' },
  en: { file: '/cv/cv-en.pdf', downloadName: 'CV-Denys-Peresunko-EN.pdf' },
  es: { file: '/cv/cv-es.pdf', downloadName: 'CV-Denys-Perez-ES.pdf' },
  de: { file: '/cv/cv-de.pdf', downloadName: 'CV-Denys-Peresunko-DE.pdf' },
};

// Испанский как запасной: сайт ориентирован на работодателей в Каталонии,
// поэтому неизвестная локаль получает именно испанскую версию.
const FALLBACK_LANG = 'es';

function resolveCv(language) {
  if (!language) return CV_FILES[FALLBACK_LANG];
  // i18n может вернуть региональный код вида 'es-ES' или 'uk-UA' —
  // берём базовый язык до дефиса.
  const base = language.split('-')[0].toLowerCase();
  return CV_FILES[base] ?? CV_FILES[FALLBACK_LANG];
}

export default function ResumeNav() {
  const { t, i18n } = useTranslation();
  const [downloaded, setDownloaded] = useState(false);
  const timeoutRef = useRef(null);

  const cv = resolveCv(i18n.language);

  // Помечаем именно этот переход, чтобы главная не проигрывала интро заново.
  // Флаг одноразовый — App стирает его сразу после чтения.
  function handleBackClick() {
    try {
      sessionStorage.setItem('portfolio_skip_intro_once', 'true');
    } catch {
      /* приватный режим — интро просто проиграется, не критично */
    }
  }

  function handleDownloadClick() {
    setDownloaded(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDownloaded(false), 1800);
  }

  return (
    <nav className="resume-nav">
      <Link to="/" onClick={handleBackClick} className="resume-nav__btn resume-nav__btn--back">
        <span className="resume-nav__circle">
          <svg className="resume-nav__icon" viewBox="0 0 24 24" fill="none">
            <path d="M15 5 L8 12 L15 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="resume-nav__label">{t('resume.backButton')}</span>
      </Link>

      <a
        href={cv.file}
        download={cv.downloadName}
        onClick={handleDownloadClick}
        className="resume-nav__btn resume-nav__btn--download"
      >
        <span className="resume-nav__label">{t('resume.downloadButton')}</span>
        <span className={`resume-nav__circle ${downloaded ? 'is-success' : ''}`}>
          <svg className="resume-nav__icon resume-nav__icon--arrow" viewBox="0 0 24 24" fill="none">
            <path d="M12 4 V15 M12 15 L7.5 10.5 M12 15 L16.5 10.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 19 H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <svg className="resume-nav__icon resume-nav__icon--check" viewBox="0 0 24 24" fill="none">
            <path d="M5 13 L10 18 L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </a>
    </nav>
  );
}
