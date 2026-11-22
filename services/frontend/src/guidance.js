import { CATEGORY_MODULES, METHOD, TRACKS, SERVICE_META } from "./learn";

const FALLBACK = {
  idea: "Разберите поведение сервиса и найдите место, где ввод пользователя влияет на логику или на другой интерпретатор.",
  why: "Даже небольшая ошибка в проверке ввода может открыть доступ к данным или выполнению кода.",
  steps: [
    "Опишите нормальный сценарий работы и его параметры.",
    "Меняйте по одному значению и следите за ответом.",
    "Зафиксируйте точную последовательность, которая ломает ожидаемое поведение.",
  ],
  check: ["Какой параметр влияет на результат?", "Что меняется в ответе при некорректном значении?"],
  tools: ["Браузер DevTools", "curl", "Burp Suite"],
  refs: [{ label: "OWASP Web Security Testing Guide", url: "https://owasp.org/www-project-web-security-testing-guide/" }],
  defense: ["Проверять ввод по белому списку на сервере.", "Не доверять данным клиента в решениях о доступе."],
};

export function moduleFor(category) {
  return CATEGORY_MODULES[category] || FALLBACK;
}

export function trackForSlug(slug) {
  return TRACKS.find((track) => track.slugs.includes(slug)) || null;
}

export function serviceMeta(service) {
  return (
    SERVICE_META[service] || {
      title: service,
      short: service,
      text: "Внутренний сервис учебного стенда.",
    }
  );
}

export function slugTitle(challenges, slug) {
  const found = (challenges || []).find((item) => item.slug === slug);
  return found ? found.title : slug;
}

// Инструктор подсказывает следующий шаг, но не выдаёт решение:
// он опирается на состояние задания и на методологию, а не на payload.
export function instructorFor(challenge, challenges) {
  if (!challenge) {
    return {
      headline: "Начните с маршрута",
      lines: [
        "Учебный план собирает задания в треки: от разведки к инъекциям и логике.",
        "Проходите трек сверху вниз, тогда каждая следующая задача опирается на предыдущую.",
      ],
      action: { label: "Открыть учебный план", to: "/path" },
    };
  }

  const module = moduleFor(challenge.category);
  const track = trackForSlug(challenge.slug);
  const nextInTrack = track
    ? track.slugs
        .map((slug) => (challenges || []).find((item) => item.slug === slug))
        .find((item) => item && !item.is_solved && item.slug !== challenge.slug)
    : null;

  if (challenge.is_solved) {
    return {
      headline: "Задание закрыто",
      lines: [
        "Сформулируйте защиту своими словами: без этого навык не закрепляется.",
        "Ниже в разборе есть блок «Как чинить» — сверьтесь с ним и попробуйте придумать свой вариант.",
      ],
      defense: module.defense,
      action: nextInTrack
        ? { label: "Следующее в треке: " + nextInTrack.title, to: "/challenge/" + nextInTrack.slug }
        : { label: "Открыть учебный план", to: "/path" },
    };
  }

  if (challenge.hints_used > 0) {
    return {
      headline: "Идёте по подсказке",
      lines: [
        "Подсказка задаёт направление, а не готовый ответ. Проверьте её на одном запросе и вернитесь к цели.",
        "Если результат не сходится, вернитесь на шаг назад: сначала факт, потом гипотеза.",
      ],
      checklist: module.steps,
      action: { label: "Посмотреть разбор целиком", to: "/challenge/" + challenge.slug + "#brief" },
    };
  }

  return {
    headline: "Первые шаги",
    lines: [
      "Разберитесь, что сервис делает в обычном режиме, и только потом пробуйте ломать.",
      "Держите открытым прокси: так видно каждый запрос и каждый ответ.",
    ],
    checklist: module.steps,
    tools: module.tools,
    action: { label: "Что смотреть в этом классе уязвимостей", to: "/challenge/" + challenge.slug + "#brief" },
  };
}

export function trackProgress(track, challenges) {
  const items = (challenges || []).filter((item) => track.slugs.includes(item.slug));
  const solved = items.filter((item) => item.is_solved).length;
  return { solved, total: items.length, items };
}

export { METHOD };
