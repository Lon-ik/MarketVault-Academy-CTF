import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../api";
import Icon from "../components/Icon";
import Stars from "../components/Stars";
import { pointsFor } from "../game";
import { serviceMeta, trackProgress } from "../guidance";
import { TRACKS } from "../learn";

export default function PathPage() {
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState("");

  useEffect(function () {
    let active = true;
    request("/api/academy/challenges")
      .then(function (data) {
        if (active) setChallenges(data.challenges);
      })
      .catch(function (err) {
        if (active) setError(err.message);
      });
    return function () {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Учебный план</p>
          <h1>Маршрут по стенду</h1>
          <p className="page-sub">
            Задания собраны в пять треков. Внутри трека порядок не случайный: каждый шаг опирается
            на приёмы из предыдущего. Если задача не поддаётся, есть смысл вернуться на шаг назад,
            а не открывать разбор сразу.
          </p>
        </div>
      </header>

      {error ? <p className="alert alert--error">{error}</p> : null}

      {TRACKS.map(function (track) {
        const info = trackProgress(track, challenges);
        const percent = info.total ? (info.solved / info.total) * 100 : 0;
        const items = track.slugs
          .map(function (slug) {
            return challenges.find(function (item) { return item.slug === slug; });
          })
          .filter(Boolean);
        const xp = items.reduce(function (sum, item) { return sum + pointsFor(item); }, 0);

        return (
          <section className="path-track" id={track.id} key={track.id}>
            <header className="path-track__head">
              <Icon name={info.solved === info.total && info.total > 0 ? "check" : "target"} size={19} />
              <h2>{track.title}</h2>
              <span className="chip chip--brand">{track.level}</span>
              <span className="chip">{xp} XP</span>
              <span className="panel__meta" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12.5 }}>
                {info.solved} из {info.total}
              </span>
              <Link className="btn btn--ghost btn--sm" to={"/track/" + track.id}>
                Открыть трек
              </Link>
              <span className="progress progress--sm" style={{ flexBasis: "100%" }}>
                <span
                  className={info.solved === info.total && info.total > 0 ? "progress__fill progress__fill--done" : "progress__fill"}
                  style={{ display: "block", width: percent + "%" }}
                />
              </span>
              <p className="path-track__goal">{track.goal}</p>
            </header>

            <ol className="path-steps">
              {items.map(function (item, index) {
                const meta = serviceMeta(item.service);
                return (
                  <li key={item.slug}>
                    <Link className={item.is_solved ? "path-step is-solved" : "path-step"} to={"/challenge/" + item.slug}>
                      <span className="path-step__num">
                        {item.is_solved ? <Icon name="check" size={14} /> : index + 1}
                      </span>
                      <span className="path-step__body">
                        <span className="path-step__title">{item.title}</span>
                        <span className="path-step__meta">
                          {meta.short} · {item.category} · {pointsFor(item)} XP
                          {item.hints_used ? " · подсказки: " + item.hints_used : ""}
                        </span>
                      </span>
                      <Stars difficulty={item.difficulty} />
                      <Icon name="chevron" size={16} />
                    </Link>
                  </li>
                );
              })}
              {!items.length ? (
                <li className="path-step">
                  <span className="path-step__body">
                    <span className="path-step__meta">Список заданий загружается…</span>
                  </span>
                </li>
              ) : null}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
