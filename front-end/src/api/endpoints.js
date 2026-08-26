import apiClient from './client.js';

// Бэк отдаёт данные в своей, естественной для Django форме (snake_case,
// git_url вместо github_url, ai_type с другими значениями и т.д.) —
// адаптеры ниже в ОДНОМ месте приводят их к форме, которую ждут
// компоненты. Так сериализатор остаётся чистым и идиоматичным для Django,
// а компоненты не знают о том, что вообще существует Django-именование.

const AI_TYPE_MAP = {
  full_ai: 'ai_full',
  half_ai: 'ai_half',
  no_ai: 'solo',
};

function adaptStack(raw) {
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    pdfUrl: raw.pdf_file || null,
    order: raw.order,
  };
}

function pickAllLangs(raw, field) {
  return {
    ru: raw[`${field}_ru`] ?? '',
    uk: raw[`${field}_uk`] ?? '',
    en: raw[`${field}_en`] ?? '',
    es: raw[`${field}_es`] ?? '',
    de: raw[`${field}_de`] ?? '',
  };
}

function adaptProject(raw) {
  return {
    id: raw.id,
    // Объект по языкам, а не готовая строка: конкретный язык выбирает
    // ProjectCard при рендере (см. pickText в ProjectCard.jsx) — так смена
    // языка сайта работает мгновенно, без повторного похода к API.
    title: pickAllLangs(raw, 'title'),
    short_description: pickAllLangs(raw, 'description'),
    media_url: raw.image,
    github_url: raw.git_url || null,
    live_url: raw.live_url || null,
    // Пока не указана дата окончания — проект в разработке. Отдельного
    // поля "статус" в модели нет и не нужно: end_date уже несёт этот смысл.
    status: raw.end_date ? null : 'in-progress',
    total_hours: raw.end_date ? raw.hours_spent : null,
    made_with: AI_TYPE_MAP[raw.ai_type] ?? null,
    client_name: raw.client_name || null,
    stack: (raw.stacks || []).map(adaptStack),
    order: raw.order,
  };
}

export const getProjects = () =>
  apiClient.get('projects/').then((res) => res.data.map(adaptProject));

export const getStacks = () =>
  apiClient.get('stacks/').then((res) => res.data.map(adaptStack));
