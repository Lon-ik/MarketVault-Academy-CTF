import { TRACKS } from "./learn";

export const DIFFICULTY_POINTS = {
  easy: 100,
  medium: 200,
  hard: 300,
};

export const DIFFICULTY_LABELS = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

export function pointsFor(challenge) {
  return DIFFICULTY_POINTS[challenge && challenge.difficulty] || 100;
}

export function scoreFor(challenges) {
  return (challenges || [])
    .filter(function (challenge) { return challenge.is_solved; })
    .reduce(function (total, challenge) { return total + pointsFor(challenge); }, 0);
}

export function maxScoreFor(challenges) {
  return (challenges || []).reduce(function (total, challenge) {
    return total + pointsFor(challenge);
  }, 0);
}

const RANKS = [
  { min: 0, name: "Rookie" },
  { min: 5, name: "Scout" },
  { min: 11, name: "Hunter" },
  { min: 18, name: "Specialist" },
  { min: 25, name: "Elite" },
  { min: 32, name: "Legend" },
];

export function rankFor(solved) {
  const count = Number(solved || 0);
  let current = RANKS[0];
  let next = RANKS[1] || null;
  for (let index = 0; index < RANKS.length; index += 1) {
    if (count >= RANKS[index].min) {
      current = RANKS[index];
      next = RANKS[index + 1] || null;
    }
  }
  const ceiling = next ? next.min : RANKS[RANKS.length - 1].min;
  const span = Math.max(1, ceiling - current.min);
  const progress = next
    ? Math.min(100, Math.max(0, ((count - current.min) / span) * 100))
    : 100;
  return {
    name: current.name,
    next: next ? next.name : null,
    toNext: next ? Math.max(0, next.min - count) : 0,
    progress,
  };
}

function trackState(track, challenges) {
  const items = (challenges || []).filter(function (challenge) {
    return track.slugs.indexOf(challenge.slug) !== -1;
  });
  const solved = items.filter(function (challenge) { return challenge.is_solved; });
  return { total: items.length, solved: solved.length, complete: items.length > 0 && solved.length === items.length };
}

export function achievementsFor(challenges) {
  const list = challenges || [];
  const solved = list.filter(function (challenge) { return challenge.is_solved; });
  const byTrack = {};
  TRACKS.forEach(function (track) {
    byTrack[track.id] = trackState(track, list);
  });

  const noHint = solved.filter(function (challenge) { return !challenge.hints_used; });
  const categoryCount = {};
  solved.forEach(function (challenge) {
    categoryCount[challenge.category] = (categoryCount[challenge.category] || 0) + 1;
  });

  return [
    {
      id: "first",
      title: "Первый флаг",
      description: "Закрыть любое задание",
      unlocked: solved.length >= 1,
    },
    {
      id: "recon",
      title: "Разведка",
      description: "Пройти трек «Разведка и доступ к данным»",
      unlocked: byTrack.recon ? byTrack.recon.complete : false,
    },
    {
      id: "auth",
      title: "Взломщик входа",
      description: "Пройти трек «Аутентификация»",
      unlocked: byTrack.auth ? byTrack.auth.complete : false,
    },
    {
      id: "tokens",
      title: "Кузнец токенов",
      description: "Разобраться со всеми заданиями про JWT",
      unlocked: byTrack.tokens ? byTrack.tokens.complete : false,
    },
    {
      id: "injection",
      title: "Инъектор",
      description: "Пройти трек «Серверные инъекции»",
      unlocked: byTrack.injection ? byTrack.injection.complete : false,
    },
    {
      id: "client",
      title: "Клиентская сторона",
      description: "Пройти трек «Клиент, логика и состояние»",
      unlocked: byTrack.client ? byTrack.client.complete : false,
    },
    {
      id: "clean",
      title: "Без подсказок",
      description: "Закрыть 5 заданий, не открывая подсказки",
      unlocked: noHint.length >= 5,
    },
    {
      id: "half",
      title: "Экватор",
      description: "Пройти половину стенда",
      unlocked: list.length > 0 && solved.length >= Math.ceil(list.length / 2),
    },
    {
      id: "legend",
      title: "Легенда стенда",
      description: "Закрыть все задания",
      unlocked: list.length > 0 && solved.length === list.length,
    },
  ];
}

export function emptyState() {
  return "Ещё нет решённых заданий.";
}
