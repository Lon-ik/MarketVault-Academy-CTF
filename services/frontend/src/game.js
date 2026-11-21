export const DIFFICULTY_POINTS = {
  easy: 100,
  medium: 200,
  hard: 300,
};

export const SERVICE_CODES = {
  "auth-service": "AUTH",
  "api-gateway": "API",
  "legacy-service": "LEG",
  "inventory-service": "INV",
  frontend: "UI",
  "stats-service": "STAT",
};

export function serviceCode(service) {
  return SERVICE_CODES[service] || "LAB";
}

export function pointsFor(challenge) {
  return DIFFICULTY_POINTS[challenge?.difficulty] || 100;
}

export function scoreFor(challenges = []) {
  return challenges
    .filter((challenge) => challenge.is_solved)
    .reduce((total, challenge) => total + pointsFor(challenge), 0);
}

const RANKS = [
  { min: 0, name: "Rookie" },
  { min: 4, name: "Scout" },
  { min: 9, name: "Hunter" },
  { min: 16, name: "Specialist" },
  { min: 24, name: "Elite" },
  { min: 30, name: "Legend" },
];

export function rankFor(solved = 0) {
  let current = RANKS[0];
  let next = RANKS[1];
  for (let index = 0; index < RANKS.length; index += 1) {
    if (solved >= RANKS[index].min) {
      current = RANKS[index];
      next = RANKS[index + 1] || null;
    }
  }
  const to = next ? next.min : 30;
  const span = Math.max(1, to - current.min);
  const progress = next
    ? Math.min(100, Math.max(0, ((solved - current.min) / span) * 100))
    : 100;
  return {
    name: current.name,
    next: next ? next.name : null,
    toNext: next ? Math.max(0, next.min - solved) : 0,
    progress,
  };
}

export function achievementsFor(challenges = []) {
  const solved = challenges.filter((challenge) => challenge.is_solved);
  const byService = (service) => challenges.filter((challenge) => challenge.service === service);
  const complete = (list) => list.length > 0 && list.every((challenge) => challenge.is_solved);

  return [
    {
      id: "first",
      title: "First Blood",
      description: "Решить первое задание",
      unlocked: solved.length >= 1,
    },
    {
      id: "auth",
      title: "Auth Breaker",
      description: "Закрыть все задания auth-service",
      unlocked: complete(byService("auth-service")),
    },
    {
      id: "api",
      title: "API Operator",
      description: "Закрыть все задания api-gateway",
      unlocked: complete(byService("api-gateway")),
    },
    {
      id: "legacy",
      title: "Legacy Hunter",
      description: "Закрыть все задания legacy-service",
      unlocked: complete(byService("legacy-service")),
    },
    {
      id: "inventory",
      title: "Warehouse",
      description: "Закрыть задания inventory-service",
      unlocked: complete(byService("inventory-service")),
    },
    {
      id: "client",
      title: "Client-Side",
      description: "Закрыть frontend-задания",
      unlocked: complete(byService("frontend")),
    },
    {
      id: "ghost",
      title: "Ghost Protocol",
      description: "Решить задание без подсказок",
      unlocked: solved.some((challenge) => !challenge.hints_used),
    },
    {
      id: "half",
      title: "Halfway",
      description: "Пройти 15 заданий",
      unlocked: solved.length >= 15,
    },
    {
      id: "legend",
      title: "Legend",
      description: "Пройти все 30 заданий",
      unlocked: challenges.length > 0 && solved.length === challenges.length,
    },
  ];
}