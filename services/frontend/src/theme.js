const KEY = "mv_theme";

export function storedTheme() {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch (error) {
    return "system";
  }
}

export function resolveTheme(mode) {
  if (mode === "light" || mode === "dark") return mode;
  // Оформление стенда — тёмное (справочник NestJS), поэтому «системная» тема
  // всегда открывается в тёмном варианте.
  return "dark";
}

export function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function setTheme(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch (error) {
    /* приватный режим */
  }
  return applyTheme(mode);
}

export function initTheme() {
  const mode = storedTheme();
  const resolved = applyTheme(mode);
  if (mode === "system" && window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = function () {
      applyTheme("system");
    };
    if (media.addEventListener) media.addEventListener("change", handler);
    else if (media.addListener) media.addListener(handler);
  }
  return resolved;
}

export function toggleTheme(current) {
  return setTheme(current === "dark" ? "light" : "dark");
}
