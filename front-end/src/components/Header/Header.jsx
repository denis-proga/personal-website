import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.jsx';
import Logo from '../Logo/Logo.jsx';
import {
  GithubIcon,
  TelegramIcon,
  InstagramIcon,
  TiktokIcon,
  FacebookIcon,
  MailIcon,
  ResumeIcon,
} from './icons.jsx';
import './Header.css';

// Фирменная эмблема — компонент Logo (src/components/Logo/Logo.jsx),
// тот же SVG используется как favicon (public/favicon.svg).

const EMAIL = 'denys.perez@example.com'; // TODO: заменить на реальную почту

// brand — фирменный цвет сервиса. Уезжает в CSS-переменную --brand,
// оттуда его берут и цвет контура, и свечение при наведении.
// У GitHub brand не задан намеренно: его цвет зависит от темы, а инлайновый
// стиль перебил бы любое CSS-правило, поэтому он живёт только в Header.css.
const SOCIAL_LINKS = [
  { key: 'github', href: 'https://github.com/denis-proga', Icon: GithubIcon, label: 'GitHub', brand: null },
  { key: 'telegram', href: 'https://t.me/', Icon: TelegramIcon, label: 'Telegram', brand: '#229ed9' },
  { key: 'instagram', href: 'https://instagram.com/', Icon: InstagramIcon, label: 'Instagram', brand: '#e1306c' },
  { key: 'tiktok', href: 'https://tiktok.com/', Icon: TiktokIcon, label: 'TikTok', brand: '#fe2c55' },
  { key: 'facebook', href: 'https://facebook.com/', Icon: FacebookIcon, label: 'Facebook', brand: '#1877f2' },
];

const LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'uk', label: 'UA' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'de', label: 'DE' },
];

const TIME_ZONE = 'Europe/Madrid';

function formatLocalTime() {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date());
}

function Header() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState(formatLocalTime);

  // Хедер живёт только на первом этаже: как только секция стека подходит
  // к верху экрана, он уезжает вверх и не мешает ни углям, ни занавесу.
  // Ориентируемся на getBoundingClientRect секции стека, а не на scrollY:
  // GSAP pin оборачивает секции в pin-spacer, и абсолютные координаты
  // после этого не соответствуют видимому положению.
  useEffect(() => {
    function handleScroll() {
      const stack = document.getElementById('stack');
      if (!stack) return;
      setVisible(stack.getBoundingClientRect().top > window.innerHeight * 0.55);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Часы тикают раз в полминуты — минутной точности достаточно,
  // а лишние ререндеры хедеру ни к чему
  useEffect(() => {
    const timer = setInterval(() => setClock(formatLocalTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Открытые меню при уезжающем хедере выглядят висящими в воздухе
  useEffect(() => {
    if (!visible) {
      setLangOpen(false);
      setMenuOpen(false);
    }
  }, [visible]);

  const handleCopyEmail = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  const handleLangSelect = (code) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
    setMenuOpen(false);
  };

  return (
    <header
      className={`site-header ${visible ? '' : 'site-header--hidden'} ${
        menuOpen ? 'site-header--menu-open' : ''
      }`}
    >
      <div className="site-header__identity">
        {/* Финальная эмблема — тот же SVG используется как фавикон */}
        <Logo size={44} className="site-header__logo" />

        <div className="site-header__text">
          <span className="site-header__name">{t('header.name', 'Denys Perez')}</span>
          <span className="site-header__title">{t('header.title')}</span>
          <span className="site-header__tagline">{t('header.tagline')}</span>
        </div>
      </div>

      {/* Центр: живой статус вместо пустоты. Точка пульсирует, часы идут
          по реальному времени — сразу видно, что сайт "живой". */}
      <div className="site-header__status">
        <span className="site-header__status-dot" aria-hidden="true" />
        <span className="site-header__status-text">
          {t('header.availability', 'Открыт к предложениям')}
        </span>
        <span className="site-header__status-sep" aria-hidden="true" />
        <span className="site-header__status-clock">
          {t('header.location', 'Sabadell')} · {clock}
        </span>
      </div>

      {/* Бургер виден только на узких экранах (см. Header.css): на телефоне
          восемь иконок, переключатель языка и тема в одну строку не влезают
          физически, поэтому там весь правый блок уходит в выпадающую панель. */}
      <button
        type="button"
        className="site-header__burger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
      >
        <span className="site-header__burger-line" />
        <span className="site-header__burger-line" />
        <span className="site-header__burger-line" />
      </button>

      <div className={`site-header__actions ${menuOpen ? 'site-header__actions--open' : ''}`}>
        {/* Статус дублируется внутри меню: в шапке на телефоне для него
            нет места, а работодателю это первое, что стоит увидеть */}
        <div className="site-header__status site-header__status--mobile">
          <span className="site-header__status-dot" aria-hidden="true" />
          <span>{t('header.availability', 'Открыт к предложениям')}</span>
        </div>

        {/* Соцсети — одна смысловая группа, отделена от кнопок-действий */}
        <nav className="site-header__socials">
          {SOCIAL_LINKS.map(({ key, href, Icon, label, brand }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="site-header__icon-link"
              data-tooltip={label}
              data-brand={key}
              style={brand ? { '--brand': brand } : undefined}
            >
              <Icon className="site-header__icon" />
            </a>
          ))}

          <a
            href={`mailto:${EMAIL}`}
            onClick={handleCopyEmail}
            className="site-header__icon-link"
            data-tooltip={copied ? '✓' : 'Gmail'}
            data-brand="gmail"
            style={{ '--brand': '#ea4335' }}
          >
            <MailIcon className="site-header__icon" />
          </a>
        </nav>

        <span className="site-header__divider" aria-hidden="true" />

        {/* Действия: резюме, язык, тема */}
        <div className="site-header__tools">
          <a
            href="/resume"
            target="_blank"
            rel="noreferrer"
            className="site-header__resume"
            data-tooltip={t('header.resumeLink')}
            onClick={() => setMenuOpen(false)}
          >
            <ResumeIcon className="site-header__icon" />
            <span className="site-header__resume-label">{t('header.resumeLink')}</span>
          </a>

          <div className="site-header__lang">
            <button
              className="site-header__lang-toggle"
              onClick={() => setLangOpen((o) => !o)}
            >
              {LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'EN'}
            </button>
            {langOpen && (
              <div className="site-header__lang-menu">
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => handleLangSelect(l.code)}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="site-header__theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
