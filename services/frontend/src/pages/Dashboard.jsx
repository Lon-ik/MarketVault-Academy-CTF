import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../api";
import ChallengeCard from "../components/ChallengeCard";
import Pips from "../components/Pips";
import {
  achievementsFor,
  pointsFor,
  rankFor,
  scoreFor,
  serviceCode,
} from "../game";

const STATUS_FILTERS = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открытые" },
  { value: "solved", label: "Решённые" },
];

function AchievementIcon({ unlocked }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      {unlocked ? (
        <path d="m5 12.5 4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function DashboardPage() {
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [service, setService] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let active = true;
    Promise.all([request("/api/academy/challenges"), request("/api/academy/progress")])
      .then(([catalog, summary]) => {
        if (!active) return;
        setChallenges(catalog.challenges);
        setProgress(summary);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const services = useMemo(
    () => Array.from(new Set(challenges.map((item) => item.service))).sort(),
    [challenges]
  );
  const difficulties = useMemo(
    () => Array.from(new Set(challenges.map((item) => item.difficulty))),
    [challenges]
  );

  const filtered = useMemo(() => {
    const needle = titleQuery.trim().toLowerCase();
    return challenges.filter((item) => {
      if (service !== "all" && item.service !== service) return false;
      if (difficulty !== "all" && item.difficulty !== difficulty) return false;
      if (status === "solved" && !item.is_solved) return false;
      if (status === "open" && item.is_solved) return false;
      if (needle && !`${item.title} ${item.category}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [challenges, titleQuery, service, difficulty, status]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      if (!map.has(item.service)) map.set(item.service, []);
      map.get(item.service).push(item);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [filtered]);

  const filtersActive =
    titleQuery !== "" || service !== "all" || difficulty !== "all" || status !== "all";

  const solvedCount = progress?.solved ?? 0;
  const total = progress?.total ?? challenges.length ?? 30;
  const score = useMemo(() => scoreFor(challenges), [challenges]);
  const rank = rankFor(solvedCount);
  const achievements = useMemo(() => achievementsFor(challenges), [challenges]);
  const unlocked = achievements.filter((item) => item.unlocked).length;
  const nextMission = challenges.find((item) => !item.is_solved);
  const allSolved = challenges.length > 0 && solvedCount === total;

  function resetFilters() {
    setTitleQuery("");
    setService("all");
    setDifficulty("all");
    setStatus("all");
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__text">
          <p className="kicker">cyber range // operations</p>
          <h1>Mission board</h1>
          <p className="page-subtitle">
            30 уязвимых сценариев по шести сервисам. Выполняйте миссии, забирайте флаги,
            поднимайтесь в ранге и закрывайте ветки целиком.
          </p>
        </div>
      </header>

      <div className="command-deck">
        <section className="panel agent-panel">
          <div className="agent-panel__head">
            <span className="kicker">agent profile</span>
            <span className="rank-pill">{rank.name}</span>
          </div>
          <div className="agent-panel__score">
            <strong>{score}</strong>
            <span>XP</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-track__fill"
              style={{ width: `${total ? (solvedCount / total) * 100 : 0}%` }}
            />
          </div>
          <div className="agent-stats">
            <div>
              <span>Missions</span>
              <strong>
                {solvedCount}/{total}
              </strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>{Math.max(0, total - solvedCount)}</strong>
            </div>
            <div>
              <span>Next rank</span>
              <strong>{rank.next || "MAX"}</strong>
            </div>
          </div>
          {rank.next ? (
            <p className="agent-panel__note">
              До ранга {rank.next}: {rank.toNext} missions
            </p>
          ) : (
            <p className="agent-panel__note">Максимальный ранг достигнут</p>
          )}
        </section>

        <section className="panel next-panel">
          <span className="kicker">next objective</span>
          {nextMission ? (
            <>
              <p className="next-panel__meta">
                {serviceCode(nextMission.service)} / {nextMission.category}
              </p>
              <Link className="next-panel__title" to={`/challenge/${nextMission.slug}`}>
                {nextMission.title}
              </Link>
              <p className="next-panel__desc">
                {nextMission.description.slice(0, 150)}
                {nextMission.description.length > 150 ? "…" : ""}
              </p>
              <div className="next-panel__foot">
                <Pips difficulty={nextMission.difficulty} />
                <span className="next-panel__xp">{pointsFor(nextMission)} XP</span>
                <span className="next-panel__difficulty">{nextMission.difficulty}</span>
              </div>
              <Link className="button" to={`/challenge/${nextMission.slug}`}>
                Открыть briefing
              </Link>
            </>
          ) : (
            <div className="next-panel__done">
              <strong>{allSolved ? "Range complete" : "Все миссии закрыты"}</strong>
              <p>Все доступные задания решены. Отличная работа, агент.</p>
            </div>
          )}
        </section>
      </div>

      <section className="panel achievements-panel">
        <div className="panel__header">
          <h2>Достижения</h2>
          <span className="panel__meta">
            {unlocked}/{achievements.length} unlocked
          </span>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`achievement ${achievement.unlocked ? "is-unlocked" : ""}`}
            >
              <span className="achievement__icon">
                <AchievementIcon unlocked={achievement.unlocked} />
              </span>
              <div>
                <strong>{achievement.title}</strong>
                <p>{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="alert alert--error">{error}</p> : null}

      <section className="panel ops-panel">
        <div className="panel__header">
          <h2>Missions</h2>
          <span className="panel__meta">
            {filtered.length} / {challenges.length}
          </span>
        </div>

        <div className="toolbar">
          <div className="field-inline field-inline--grow">
            <label htmlFor="filter-search">Поиск</label>
            <input
              id="filter-search"
              type="search"
              value={titleQuery}
              onChange={(event) => setTitleQuery(event.target.value)}
              placeholder="Название или категория"
            />
          </div>
          <div className="field-inline">
            <label htmlFor="filter-service">Сервис</label>
            <select id="filter-service" value={service} onChange={(event) => setService(event.target.value)}>
              <option value="all">Все сервисы</option>
              {services.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="field-inline">
            <label htmlFor="filter-difficulty">Сложность</label>
            <select
              id="filter-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="all">Любая</option>
              {difficulties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="field-inline">
            <span className="field-label">Статус</span>
            <div className="segmented" role="group" aria-label="Фильтр по статусу">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={status === item.value ? "is-active" : ""}
                  aria-pressed={status === item.value}
                  onClick={() => setStatus(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {filtersActive ? (
            <button className="button button--quiet button--small" type="button" onClick={resetFilters}>
              Сбросить
            </button>
          ) : null}
        </div>

        <div className="board">
          {grouped.map((group) => {
            const groupSolved = group.items.filter((item) => item.is_solved).length;
            const groupScore = group.items
              .filter((item) => item.is_solved)
              .reduce((sum, item) => sum + pointsFor(item), 0);
            const groupMax = group.items.reduce((sum, item) => sum + pointsFor(item), 0);
            return (
              <section className="service-section" key={group.name}>
                <header className="service-section__head">
                  <span className="service-section__mark">{serviceCode(group.name)}</span>
                  <div className="service-section__title">
                    <h2>{group.name}</h2>
                    <span>
                      {groupSolved}/{group.items.length} missions
                    </span>
                  </div>
                  <span className="service-section__bar">
                    <span
                      style={{
                        width: `${group.items.length ? (groupSolved / group.items.length) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="service-section__xp">
                    {groupScore}/{groupMax} XP
                  </span>
                </header>
                <div className="mission-grid">
                  {group.items.map((challenge) => (
                    <ChallengeCard key={challenge.slug} challenge={challenge} showService={false} />
                  ))}
                </div>
              </section>
            );
          })}
          {!filtered.length ? (
            <div className="empty-state">
              <p>Под текущие фильтры ничего не подходит.</p>
              <button className="button button--quiet button--small" type="button" onClick={resetFilters}>
                Сбросить фильтры
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}