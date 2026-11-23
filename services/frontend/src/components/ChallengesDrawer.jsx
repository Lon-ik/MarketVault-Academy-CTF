import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { pointsFor, rankFor, scoreFor } from "../game";
import { serviceMeta } from "../guidance";
import Icon from "./Icon";
import Stars from "./Stars";

export default function ChallengesDrawer({ open, onClose, challenges, progress }) {
  const [query, setQuery] = useState("");

  useEffect(function () {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const solved = progress ? progress.solved : 0;
  const total = progress ? progress.total : challenges.length;
  const percent = total ? (solved / total) * 100 : 0;
  const rank = rankFor(solved);
  const score = useMemo(function () { return scoreFor(challenges); }, [challenges]);

  const filtered = useMemo(
    function () {
      const needle = query.trim().toLowerCase();
      if (!needle) return challenges;
      return challenges.filter(function (item) {
        return (item.title + " " + item.category).toLowerCase().indexOf(needle) !== -1;
      });
    },
    [challenges, query]
  );

  if (!open) return null;

  return (
    <div className="drawer-root">
      <button className="drawer-scrim" type="button" aria-label="Закрыть панель" onClick={onClose} />

      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Прогресс и задания">
        <header className="drawer__head">
          <div>
            <p className="eyebrow">Scoreboard</p>
            <h2>Прогресс и задания</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="drawer__body">
          <section className="drawer__progress">
            <div className="agent-card__row">
              <span>Решено</span>
              <span>{solved} из {total}</span>
            </div>
            <div className="progress" style={{ margin: "8px 0 10px" }}>
              <div className="progress__fill" style={{ width: percent + "%" }} />
            </div>
            <div className="drawer__stats">
              <div><span>Ранг</span><strong>{rank.name}</strong></div>
              <div><span>Очки</span><strong>{score}</strong></div>
              <div><span>До след.</span><strong>{rank.next ? rank.toNext : "—"}</strong></div>
            </div>
          </section>

          <nav className="drawer__links">
            <Link className="btn btn--ghost btn--sm" to="/challenges" onClick={onClose}>Все задания</Link>
            <Link className="btn btn--ghost btn--sm" to="/path" onClick={onClose}>Учебный план</Link>
            <Link className="btn btn--ghost btn--sm" to="/leaderboard" onClick={onClose}>Рейтинг</Link>
          </nav>

          <label className="field">
            <span className="visually-hidden">Поиск задания</span>
            <input
              type="search"
              value={query}
              onChange={function (event) { setQuery(event.target.value); }}
              placeholder="Поиск задания"
            />
          </label>

          <ul className="drawer__list">
            {filtered.map(function (item) {
              return (
                <li key={item.slug}>
                  <Link
                    className={item.is_solved ? "drawer-item is-solved" : "drawer-item"}
                    to={"/challenge/" + item.slug}
                    onClick={onClose}
                  >
                    <span className="drawer-item__mark">
                      <Icon name={item.is_solved ? "check" : "target"} size={14} />
                    </span>
                    <span className="drawer-item__body">
                      <span className="drawer-item__title">{item.title}</span>
                      <span className="drawer-item__meta">
                        {serviceMeta(item.service).short} · {item.category} · {pointsFor(item)} XP
                      </span>
                    </span>
                    <Stars difficulty={item.difficulty} />
                  </Link>
                </li>
              );
            })}
            {!filtered.length ? (
              <li className="drawer__empty">Ничего не нашлось.</li>
            ) : null}
          </ul>
        </div>
      </aside>
    </div>
  );
}
