// Данные, загруженные ДО первого рендера React (см. main.jsx).
//
// Обычный модуль-хранилище, без Context и без state: компонентам нужно
// прочитать значение ровно один раз при монтировании, а перерисовка при
// изменении здесь не только не нужна, но и вредна — именно она и ломала
// расчёты GSAP.

let data = { stacks: null, projects: null };

export function setInitialData(next) {
  data = next;
}

// Возвращает список с бэкенда либо null, если ответа не было / он пустой.
// Компонент сам решает, чем заменить null (у каждого свой фолбэк).
export function getInitialStacks() {
  return Array.isArray(data.stacks) && data.stacks.length > 0 ? data.stacks : null;
}

export function getInitialProjects() {
  return Array.isArray(data.projects) && data.projects.length > 0 ? data.projects : null;
}
