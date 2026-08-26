# Personal Portfolio — Denys Peresunko

Interactive full-stack portfolio site: a one-page scroll experience (About → Stack → Projects) built with React, Three.js and GSAP, backed by a Django REST API — plus a separate `/resume` page with a downloadable, localized CV.

**Live site:** _coming soon_
**Résumé:** _coming soon_

---

## ✨ Features

- Cinematic scroll-driven navigation with GSAP `ScrollTrigger`, synced to real pin-zone boundaries
- Custom WebGL scenes (Three.js): an animated skull model and a procedural ember/fire field, both with a lightweight mode for mobile/low-power devices
- Full i18n: 5 languages (Русский, Українська, English, Español, Deutsch) served dynamically from the backend, no re-fetch on language switch
- Django admin–managed content: projects and tech stack are editable without touching code
- Dedicated `/resume` page with a parchment-styled, print-quality CV, auto-selected by locale
- Responsive down to mobile, with a dedicated performance-lite rendering path

## 🛠️ Tech stack

**Frontend:** React, Vite, Three.js, GSAP, i18next, Axios, React Router v6
**Backend:** Django, Django REST Framework, PostgreSQL (production) / MySQL (local dev), django-modeltranslation, Cloudinary (media storage)
**Deployment:** Render (Static Site + Web Service)

## 📁 Project structure

```
personal-website/
├── backend/        # Django + DRF API
└── front-end/       # React + Vite SPA
```

## 🚀 Local setup

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\Activate.ps1   # Windows PowerShell
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver          # http://127.0.0.1:8000

# Frontend
cd front-end
npm install
npm run dev                          # http://localhost:5173
```

## 📄 License

This project is for personal/portfolio use. Feel free to browse the code for inspiration — please don't republish it as your own.

---

# Portafolio personal — Denys Peresunko

Sitio de portafolio full-stack e interactivo: una experiencia de scroll de una sola página (Sobre mí → Stack → Proyectos) construida con React, Three.js y GSAP, con una API en Django detrás — más una página `/resume` independiente con un CV descargable y localizado.

**Sitio en vivo:** _próximamente_
**Currículum:** _próximamente_

## ✨ Características

- Navegación cinematográfica controlada por scroll con GSAP `ScrollTrigger`, sincronizada con los límites reales de cada sección
- Escenas WebGL personalizadas (Three.js): un modelo animado de cráneo y un campo de brasas procedural, ambos con un modo ligero para móviles
- i18n completo: 5 idiomas (ruso, ucraniano, inglés, español, alemán) servidos dinámicamente desde el backend
- Contenido gestionado desde el admin de Django: proyectos y stack tecnológico editables sin tocar código
- Página `/resume` dedicada, con un CV de estilo pergamino, seleccionado automáticamente según el idioma
- Totalmente responsive, con una ruta de renderizado optimizada para móviles

## 🛠️ Stack tecnológico

**Frontend:** React, Vite, Three.js, GSAP, i18next, Axios, React Router v6
**Backend:** Django, Django REST Framework, PostgreSQL (producción) / MySQL (desarrollo local), django-modeltranslation, Cloudinary (almacenamiento de medios)
**Despliegue:** Render (Static Site + Web Service)

## 📁 Estructura del proyecto

```
personal-website/
├── backend/        # API Django + DRF
└── front-end/       # SPA React + Vite
```

## 🚀 Instalación local

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\Activate.ps1   # Windows PowerShell
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver          # http://127.0.0.1:8000

# Frontend
cd front-end
npm install
npm run dev                          # http://localhost:5173
```

## 📄 Licencia

Este proyecto es de uso personal/portafolio. Siéntete libre de revisar el código como inspiración — por favor no lo republiques como propio.
