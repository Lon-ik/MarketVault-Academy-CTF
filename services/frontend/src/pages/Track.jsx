import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { request } from "../api";
import Icon from "../components/Icon";
import Stars from "../components/Stars";
import { pointsFor } from "../game";
import { moduleFor, serviceMeta } from "../guidance";
import { TRACKS } from "../learn";

function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export default function TrackPage() {
  const { id } = useParams();
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState("");

  useEffect(function () {
    let active = true;
    request("/api/academy/challenges")
      .then(function (data) {
        if (active) setCatalog(data.challenges);
      })
      .catch(function (err) {
        if (active) setError(err.message);
      });
    return function () {
      active = false;
    };
  }, []);

  const track = TRACKS.find(function (item) {
    return item.id === id;
  });

  const steps = useMemo(
    function () {
      if (!track) return [];
      return track.slugs
        .map(function (slug) {
          return catalog.find(function (item) {
            return item.slug === slug;
          });
        })
        .filter(Boolean);
    },
    [track, catalog]
  );

  const solved = steps.filter(function (item) { return item.is_solved; }).length;
  const total = steps.length;
  const percent = total ? (solved / total) * 100 : 0;
  const xp = steps.reduce(function (sum, item) { return sum + pointsFor(item); }, 0);
  const earned = steps.reduce(function (sum, item) {
    return sum + (item.is_solved ? pointsFor(item) : 0);
  }, 0);
  const index = TRACKS.findIndex(function (item) { return item.id === id; });
  const nextStep = steps.find(function (item) { return !item.is_solved; });

  const categories = useMemo(
    function () {
      return Array.from(new Set(steps.map(function (item) { return item.category; })));
    },
    [steps]
  );

  const tools = useMemo(
    function () {
      const seen = new Set();
      categories.forEach(function (category) {
        moduleFor(category).tools.forEach(function (tool) { seen.add(tool); });
      });
      return Array.from(seen);
    },
    [categories]
  );

  if (!track) {
    return (
      <div className="page">
        <div className="panel center-panel">
          <div className="panel__body stack">
            <h1>Трек не найден</h1>
            <p className="muted">Такого трека нет. Посмотрите полный учебный план.</p>
            <Link className="btn btn--ghost" to="/path">Учебный план</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Навигация">
        <Link to="/">Задания</Link>
        <span>/</span>
        <Link to="/path">Учебный план</Link>
        <span>/</span>
        <span>{track.title}</span>
      </nav>

      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">
            Трек {index + 1} из {TRACKS.length} · {track.level}
          </p>
          <h1>{track.title}</h1>
          <p className="page-sub">{track.goal}</p>
          <div className="tag-row" style={{ marginTop: 10 }}>
            <span className="chip chip--brand">{xp} XP</span>
            <span className="chip">{total} {plural(total, "задание", "задания", "заданий")}</span>
            <span className="chip chip--solved">{solved} решено</span>
          </div>
        </div>
        {nextStep ? (
          <Link className="btn" to={"/challenge/" + nextStep.slug}>
            {solved ? "Продолжить трек" : "Начать трек"}
          </Link>
        ) : (
          <span className="chip chip--solved">Трек закрыт</span>
        )}
      </header>

      <div className="challenge-layout">
        <section className="path-track">
          <header className="path-track__head">
            <Icon name="path" size={19} />
            <h2>Порядок прохождения</h2>
            <span className="panel__meta" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12.5 }}>
              {solved} из {total}
            </span>
            <span className="progress progress--sm" style={{ flexBasis: "100%" }}>
              <span
                className={solved === total && total > 0 ? "progress__fill progress__fill--done" : "progress__fill"}
                style={{ display: "block", width: percent + "%" }}
              />
            </span>
          </header>

          <ol className="path-steps">
            {steps.map(function (item, stepIndex) {
              const isCurrent = nextStep && item.slug === nextStep.slug;
              const rowClass = [
                "path-step",
                item.is_solved ? "is-solved" : "",
                isCurrent ? "is-current" : "",
              ].filter(Boolean).join(" ");
              return (
                <li key={item.slug}>
                  <Link className={rowClass} to={"/challenge/" + item.slug}>
                    <span className="path-step__num">
                      {item.is_solved ? <Icon name="check" size={14} /> : stepIndex + 1}
                    </span>
                    <span className="path-step__body">
                      <span className="path-step__title">{item.title}</span>
                      <span className="path-step__meta">
                        {serviceMeta(item.service).short} · {item.category} · {pointsFor(item)} XP
                        {isCurrent ? " · следующий шаг" : ""}
                      </span>
                    </span>
                    <Stars difficulty={item.difficulty} />
                    <Icon name="chevron" size={16} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="challenge-side">
          <section className="panel">
            <div className="panel__head">
              <h2>Прогресс</h2>
            </div>
            <div className="panel__body stack">
              <div className="agent-card__row">
                <span>Закрыто</span>
                <span>{solved} из {total}</span>
              </div>
              <div className="progress">
                <div
                  className={solved === total && total > 0 ? "progress__fill progress__fill--done" : "progress__fill"}
                  style={{ width: percent + "%" }}
                />
              </div>
              <p className="meta-text">{earned} из {xp} XP в этом треке</p>
              {nextStep ? (
                <Link className="btn btn--sm" to={"/challenge/" + nextStep.slug}>
                  Следующий шаг
                </Link>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Что внутри</h2>
            </div>
            <div className="panel__body stack">
              <div className="tag-row">
                {categories.map(function (category) {
                  return <span className="chip" key={category}>{category}</span>;
                })}
              </div>
              <h3 style={{ fontSize: 13 }}>Инструменты</h3>
              <div className="tag-row">
                {tools.map(function (tool) {
                  return <span className="chip chip--service" key={tool}>{tool}</span>;
                })}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
