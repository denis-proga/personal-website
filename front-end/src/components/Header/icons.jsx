// Простые inline SVG-иконки соцсетей — без лишних npm-зависимостей.
// currentColor берёт цвет из CSS, поэтому hover-эффекты красятся через CSS.

export const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 .5C5.73.5.98 5.24.98 11.52c0 5.02 3.26 9.28 7.78 10.78.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.17.69-3.84-1.35-3.84-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.63 0-1.24.44-2.26 1.17-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.13-1.17 3.13-1.17.63 1.57.23 2.73.12 3.02.73.8 1.17 1.82 1.17 3.06 0 4.37-2.67 5.34-5.21 5.62.41.36.77 1.06.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.2.66.79.55 4.51-1.51 7.76-5.77 7.76-10.78C23.02 5.24 18.27.5 12 .5Z" />
  </svg>
);

export const TelegramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M21.94 4.6 18.6 20.28c-.25 1.1-.9 1.37-1.83.86l-5.06-3.73-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15 9.38-8.47c.41-.36-.09-.56-.63-.2L6.03 13.1.98 11.51c-1.1-.34-1.12-1.1.23-1.63L20.5 3.14c.91-.34 1.7.2 1.44 1.46Z" />
  </svg>
);

export const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const TiktokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.6 2h-3.2v14.1a2.7 2.7 0 1 1-2.7-2.7c.2 0 .4 0 .6.05V10.1a5.9 5.9 0 1 0 5.3 5.87V8.6a7.7 7.7 0 0 0 4.4 1.38V6.75a4.4 4.4 0 0 1-4.4-4.4Z" />
  </svg>
);

export const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13.5 21.9v-8.4h2.8l.4-3.3h-3.2V8.1c0-.95.27-1.6 1.63-1.6h1.74V3.55C16.5 3.5 15.4 3.4 14.1 3.4c-2.6 0-4.4 1.6-4.4 4.5v2.3H7v3.3h2.7v8.4h3.8Z" />
  </svg>
);

export const MailIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3 6 9 6.5L21 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ResumeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M6 2.5h9l4.5 4.5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
    <path d="M14.5 2.5V7H19" />
    <path d="M8 12.5h8M8 16h8" strokeLinecap="round" />
  </svg>
);

export const YoutubeIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45a2.78 2.78 0 0 0-1.95 1.97A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
);
