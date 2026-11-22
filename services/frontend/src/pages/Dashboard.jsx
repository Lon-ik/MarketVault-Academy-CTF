import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../api";
import ChallengeCard from "../components/ChallengeCard";
import Icon from "../components/Icon";
import Stars from "../components/Stars";
import {
  achievementsFor,
  maxScoreFor,
  pointsFor,
  rankFor,
  scoreFor,
} from "../game";
import { serviceMeta, trackProgress } from "../guidance";
import { METHOD, TRACKS } from "../learn";

const STATUS = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открытые" },
  { value: "solved", label: "Решённые" },
];

export default function DashboardPage() {
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [service, setService] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [methodOpen, setMethodOpen] = useState(false);

  useEffect(function () {
    let active = true;
    Promise.all([request("/api/academy/challenges"), request("/api/academy/progress")])
      .then(function (data) {
        if (!active) return;
        setChallenges(data[0].challenges);
        setProgress(data[1]);
      })
      .catch(function (err) {
        if (active) setError(err.message);
      });
    return function () {
      active = false;
    };
  }, []);

  const services = useMemo(
    function () {
      return Array.from(
        new Set(challenges.map(function (item) { return item.service; }))
      ).sort();
    },
    [challenges]
  );

  const filtered = useMemo(
    function () {
      const needle = query.trim().toLowerCase();
      return challenges.filter(function (item) {
        if (service !== "all" && item.service !== service) return false;
        if (difficulty !== "all" && item.difficulty !== difficulty) return false;
        if (status === "solved" && !item.is_solved) return false;
        if (status === "open" && item.is_solved) return false;
        if (needle) {
          const haystack = (item.title + " " + item.category + " " + item.description).toLowerCase();
          if (haystack.indexOf(needle) === -1) return false;
        }
        return true;
      });
    },
    [challenges, query, service, difficulty, status]
  );

  const grouped = useMemo(
    function () {
      const map = new Map();
      filtered.forEach(function (item) {
        if (!map.has(item.service)) map.set(item.service, []);
        map.get(item.service).push(item);
      });
      return Array.from(map.entries()).map(function (entry) {
        return { name: entry[0], items: entry[1] };
      });
    },
    [filtered]
  );

  const solved = progress ? progress.solved : 0;
  const total = progress ? progress.total : challenges.length;
  const score = useMemo(function () { return scoreFor(challenges); }, [challenges]);
  const maxScore = useMemo(function () { return maxScoreFor(challenges); }, [challenges]);
  const rank = rankFor(solved);
  const achievements = useMemo(function () { return achievementsFor(challenges); }, [challenges]);
  const unlocked = achievements.filter(function (item) { return item.unlocked; }).length;
  const next = challenges.find(function (item) { return !item.is_solved; });
  const percent = total ? (solved / total) * 100 : 0;
  const done = total > 0 && solved === total;

  function reset() {
    setQuery("");
    setService("all");
    setDifficulty("all");
    setStatus("all");
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">Учебный стенд</p>
          <h1>Практика по веб-безопасности на живых сервисах</h1>
          <p>
            {total} намеренно уязвимых сценария на пяти приложениях: сервис входа, API-шлюз с
            GraphQL, устаревший PHP-портал, склад на Go и веб-интерфейс. Разбирайте задачи по
            трекам, забирайте флаги и фиксируйте, как правильно чинить каждую ошибку.
          </p>
        </div>
        <div className="hero__stats">
          <div className="stat">
            <span>Решено</span>
            <strong>{solved}/{total}</strong>
          </div>
          <div className="stat">
            <span>Очки</span>
            <strong>{score}</strong>
          </div>
          <div className="stat">
            <span>Ранг</span>
            <strong style={{ fontSize: 15 }}>{rank.name}</strong>
          </div>
        </div>
        <div className="hero__bar">
          <div className="progress">
            <div className="progress__fill" style={{ width: percent + "%" }} />
          </div>
        </div>
      </section>

      {error ? <p className="alert alert--error">{error}</p> : null}

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Продолжить обучение</h2>
            <span className="panel__meta">{maxScore ? score + " / " + maxScore + " XP" : ""}</span>
          </div>
          <div className="panel__body">
            {next ? (
              <div className="stack">
                <div className="tag-row">
                  <span className="chip chip--service">{serviceMeta(next.service).short}</span>
                  <span className="chip">{next.category}</span>
                  <span className={"chip chip--" + next.difficulty}>{next.difficulty}</span>
                </div>
                <h3 style={{ fontSize: 17 }}>{next.title}</h3>
                <p className="muted" style={{ fontSize: 13.5 }}>{next.description}</p>
                <div className="actions">
                  <Link className="btn" to={"/challenge/" + next.slug}>
                    Открыть задание
                  </Link>
                  <span className="meta-text">{pointsFor(next)} XP за решение</span>
                </div>
              </div>
            ) : (
              <div className="stack">
                <h3>{done ? "Стенд пройден полностью" : "Нет доступных заданий"}</h3>
                <p className="muted">
                  Все {total} заданий закрыты. Вернитесь в разбор и проверьте, что сможете
                  объяснить защиту по каждому классу уязвимостей.
                </p>
                <Link className="btn btn--ghost" to="/path">
                  Открыть учебный план
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>{METHOD.title}</h2>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              style={{ marginLeft: "auto" }}
              onClick={function () { setMethodOpen(!methodOpen); }}
            >
              {methodOpen ? "Свернуть" : "Развернуть"}
            </button>
          </div>
          <div className="panel__body">
            <ol className="learn-list">
              {(methodOpen ? METHOD.steps : METHOD.steps.slice(0, 2)).map(function (step, index) {
                return (
                  <li key={index}>
                    <strong>{step.name}.</strong> {step.text}
                  </li>
                );
              })}
            </ol>
            {!methodOpen ? (
              <p className="meta-text" style={{ marginTop: 8 }}>
                Остальные шаги процесса скрыты, чтобы не растягивать страницу.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Учебные треки</h2>
          <span className="panel__meta">{TRACKS.length} направления, от разведки к логике</span>
        </div>
        <div className="panel__body">
          <div className="track-grid">
            {TRACKS.map(function (track) {
              const info = trackProgress(track, challenges);
              const trackPercent = info.total ? (info.solved / info.total) * 100 : 0;
              return (
                <Link className="track-card" to={"/track/" + track.id} key={track.id}>
                  <div className="track-card__head">
                    <Icon name={info.solved === info.total && info.total > 0 ? "check" : "target"} size={18} />
                    <h3>{track.title}</h3>
                    <span className="chip track-card__level">{track.level}</span>
                  </div>
                  <p className="track-card__goal">{track.goal}</p>
                  <div className="progress progress--sm">
                    <div
                      className={info.solved === info.total && info.total > 0 ? "progress__fill progress__fill--done" : "progress__fill"}
                      style={{ width: trackPercent + "%" }}
                    />
                  </div>
                  <div className="track-card__foot">
                    <span>
                      {info.solved} из {info.total}
                    </span>
                    <span style={{ marginLeft: "auto" }}>Открыть трек</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Достижения</h2>
          <span className="panel__meta">{unlocked} из {achievements.length}</span>
        </div>
        <div className="panel__body">
          <div className="achievement-grid">
            {achievements.map(function (achievement) {
              return (
                <div
                  key={achievement.id}
                  className={achievement.unlocked ? "achievement is-unlocked" : "achievement"}
                >
                  <span className="achievement__icon">
                    <Icon name={achievement.unlocked ? "check" : "shield"} size={15} />
                  </span>
                  <div>
                    <strong>{achievement.title}</strong>
                    <p>{achievement.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Все задания</h2>
          <span className="panel__meta">{filtered.length} из {challenges.length}</span>
        </div>

        <div className="filters">
          <label className="field">
            <span>Поиск</span>
            <input
              type="search"
              value={query}
              onChange={function (event) { setQuery(event.target.value); }}
              placeholder="Название, категория, описание"
            />
          </label>
          <label className="field">
            <span>Сервис</span>
            <select value={service} onChange={function (event) { setService(event.target.value); }}>
              <option value="all">Все</option>
              {services.map(function (item) {
                return <option key={item} value={item}>{serviceMeta(item).short}</option>;
              })}
            </select>
          </label>
          <label className="field">
            <span>Сложность</span>
            <select value={difficulty} onChange={function (event) { setDifficulty(event.target.value); }}>
              <option value="all">Любая</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
          <div className="field">
            <span>Статус</span>
            <div className="segmented">
              {STATUS.map(function (item) {
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={status === item.value ? "is-active" : ""}
                    onClick={function () { setStatus(item.value); }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" type="button" onClick={reset}>
            Сбросить
          </button>
        </div>

        <div className="panel__body">
          {grouped.map(function (group) {
            const meta = serviceMeta(group.name);
            const groupSolved = group.items.filter(function (item) { return item.is_solved; }).length;
            const groupPercent = group.items.length ? (groupSolved / group.items.length) * 100 : 0;
            const groupXp = group.items.reduce(function (sum, item) {
              return sum + (item.is_solved ? pointsFor(item) : 0);
            }, 0);
            const groupMax = group.items.reduce(function (sum, item) {
              return sum + pointsFor(item);
            }, 0);
            return (
              <section className="section" key={group.name}>
                <header className="section__head">
                  <span className="section__mark">{meta.short.slice(0, 3).toUpperCase()}</span>
                  <div className="section__title">
                    <h2>{meta.title}</h2>
                    <span>{meta.text}</span>
                  </div>
                  <span className="section__bar">
                    <span className="progress progress--sm" style={{ display: "block" }}>
                      <span className="progress__fill" style={{ display: "block", width: groupPercent + "%" }} />
                    </span>
                  </span>
                  <span className="section__xp">
                    {groupSolved}/{group.items.length} · {groupXp}/{groupMax} XP
                  </span>
                </header>
                <div className="card-grid">
                  {group.items.map(function (challenge) {
                    return <ChallengeCard key={challenge.slug} challenge={challenge} showService={false} />;
                  })}
                </div>
              </section>
            );
          })}

          {!filtered.length ? (
            <div className="empty">
              <p>Под эти условия ничего не подходит.</p>
              <button className="btn btn--ghost btn--sm" type="button" onClick={reset} style={{ marginTop: 12 }}>
                Сбросить фильтры
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
