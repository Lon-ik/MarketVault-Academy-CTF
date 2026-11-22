import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { request } from "../api";
import CodeBlock from "../components/CodeBlock";
import HintModal from "../components/HintModal";
import Icon from "../components/Icon";
import Stars from "../components/Stars";
import { pointsFor } from "../game";
import { moduleFor, serviceMeta, trackForSlug } from "../guidance";

export default function ChallengePage() {
  const { slug } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState("");
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(
    function () {
      let active = true;
      request("/api/academy/challenges")
        .then(function (data) {
          if (!active) return;
          setCatalog(data.challenges);
          const found = data.challenges.find(function (item) { return item.slug === slug; });
          if (!found) {
            setError("Такого задания нет в каталоге.");
            return;
          }
          setChallenge(found);
          setSolved(Boolean(found.is_solved));
        })
        .catch(function (err) {
          if (active) setError(err.message);
        });
      return function () {
        active = false;
      };
    },
    [slug]
  );

  const module = useMemo(function () {
    return moduleFor(challenge ? challenge.category : "");
  }, [challenge]);

  const track = useMemo(function () {
    return trackForSlug(slug);
  }, [slug]);

  const position = useMemo(
    function () {
      if (!track) return null;
      const total = track.slugs.length;
      const index = track.slugs.indexOf(slug);
      return { total: total, index: index + 1 };
    },
    [track, slug]
  );

  async function submit(event) {
    event.preventDefault();
    if (!flag.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await request("/api/academy/challenges/" + slug + "/solve", {
        method: "POST",
        body: JSON.stringify({ flag: flag.trim() }),
      });
      setSolved(true);
      setChallenge(function (previous) {
        return previous ? Object.assign({}, previous, { is_solved: true }) : previous;
      });
      setMessage({ type: "success", text: "Флаг принят, прогресс обновлён." });
      setFlag("");
      window.dispatchEvent(new Event("mv:progress-changed"));
    } catch (err) {
      const text = err.message === "wrong flag" ? "Флаг не подходит." : err.message;
      setMessage({ type: "error", text: text });
    } finally {
      setBusy(false);
    }
  }

  if (error && !challenge) {
    return (
      <div className="page">
        <div className="panel center-panel">
          <div className="panel__body stack">
            <h1>Задание не найдено</h1>
            <p className="muted">{error}</p>
            <Link className="btn btn--ghost" to="/">
              Вернуться к списку заданий
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return <div className="loading-screen">Загружаю задание…</div>;
  }

  const meta = serviceMeta(challenge.service);
  const nextInTrack = track
    ? track.slugs
        .map(function (item) { return catalog.find(function (entry) { return entry.slug === item; }); })
        .find(function (item) { return item && !item.is_solved && item.slug !== slug; })
    : null;

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Навигация">
        <Link to="/">Задания</Link>
        <span>/</span>
        <Link to={track ? "/track/" + track.id : "/path"}>{track ? track.title : meta.title}</Link>
        {position ? (
          <>
            <span>/</span>
            <span>шаг {position.index} из {position.total}</span>
          </>
        ) : null}
      </nav>

      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">
            {meta.short} · {challenge.category}
          </p>
          <h1>{challenge.title}</h1>
          <div className="tag-row" style={{ marginTop: 10 }}>
            <Stars difficulty={challenge.difficulty} showLabel />
            <span className="chip chip--brand">{pointsFor(challenge)} XP</span>
            <span className={solved ? "chip chip--solved" : "chip chip--open"}>
              {solved ? "решено" : "не решено"}
            </span>
            <span className="chip chip--service">{meta.title}</span>
          </div>
        </div>
        <button className="btn btn--ghost" type="button" onClick={function () { setHelpOpen(true); }}>
          <Icon name="info" size={16} />
          Подсказки и разбор
        </button>
      </header>

      <div className="challenge-layout">
        <div className="stack">
          <section className="panel brief" id="brief">
            <div className="panel__head">
              <h2>Условие</h2>
            </div>
            <div className="panel__body stack">
              <p className="prose">{challenge.description}</p>
              <div className="callout">
                <strong>Класс уязвимости:</strong> {module.idea}
              </div>
              <p className="muted" style={{ fontSize: 13.5 }}>{module.why}</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Как подступаться</h2>
              <span className="panel__meta">методика</span>
            </div>
            <div className="panel__body">
              <div className="learn-grid">
                <div className="learn-block">
                  <h3>Порядок действий</h3>
                  <ol className="learn-list">
                    {module.steps.map(function (step, index) {
                      return <li key={index}>{step}</li>;
                    })}
                  </ol>
                </div>

                <div className="learn-block">
                  <h3>Вопросы для самопроверки</h3>
                  <ul className="learn-list learn-list--plain">
                    {module.check.map(function (item, index) {
                      return (
                        <li key={index}>
                          <span className="chip" style={{ marginRight: 8 }}>?</span>
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="learn-block">
                  <h3>Инструменты</h3>
                  <div className="tag-row">
                    {module.tools.map(function (tool) {
                      return <span className="chip" key={tool}>{tool}</span>;
                    })}
                  </div>
                  <h3 style={{ marginTop: 14 }}>Ориентиры</h3>
                  <ul className="ref-list">
                    {module.refs.map(function (ref) {
                      return (
                        <li key={ref.url}>
                          <a href={ref.url} target="_blank" rel="noreferrer">{ref.label}</a>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="learn-block">
                  <h3>Как это чинится</h3>
                  <ul className="learn-list">
                    {module.defense.map(function (item, index) {
                      return <li key={index}>{item}</li>;
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Отчёт о задаче</h2>
              <span className="panel__meta">что записать после решения</span>
            </div>
            <div className="panel__body">
              <ul className="learn-list">
                <li>Запрос и точный payload, который привёл к результату.</li>
                <li>Какая проверка на сервере отсутствовала или была неверной.</li>
                <li>Какую защиту вы бы добавили и как её проверить тестом.</li>
              </ul>
            </div>
          </section>
        </div>

        <aside className="challenge-side">
          <section className="panel flag-panel">
            <div className="panel__head">
              <h2>Флаг</h2>
            </div>
            <div className="panel__body">
              <p className="meta-text" style={{ marginBottom: 10 }}>
                Формат: <code>MV&#123;...&#125;</code>. Флаг появляется в ответе уязвимого сервиса.
              </p>
              <form onSubmit={submit}>
                <label className="field">
                  <span>Значение флага</span>
                  <input
                    value={flag}
                    onChange={function (event) { setFlag(event.target.value); }}
                    placeholder="MV{...}"
                    spellCheck={false}
                    required
                  />
                </label>
                <button className="btn btn--block" type="submit" disabled={busy || solved}>
                  {solved ? "Уже решено" : busy ? "Проверяю…" : "Отправить флаг"}
                </button>
              </form>
              {message ? (
                <p className={"alert alert--" + (message.type === "success" ? "success" : "error")} style={{ marginTop: 10 }}>
                  {message.text}
                </p>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Задание</h2>
            </div>
            <div className="panel__body">
              <dl className="meta-list">
                <div>
                  <dt>Сервис</dt>
                  <dd>{meta.short}</dd>
                </div>
                <div>
                  <dt>Категория</dt>
                  <dd>{challenge.category}</dd>
                </div>
                <div>
                  <dt>Трек</dt>
                  <dd>{track ? track.title : "—"}</dd>
                </div>
                <div>
                  <dt>Подсказок открыто</dt>
                  <dd>{challenge.hints_used}</dd>
                </div>
                <div>
                  <dt>Награда</dt>
                  <dd>{pointsFor(challenge)} XP</dd>
                </div>
              </dl>
            </div>
          </section>

          {nextInTrack ? (
            <section className="panel">
              <div className="panel__head">
                <h2>Дальше в треке</h2>
              </div>
              <div className="panel__body stack">
                <p>{nextInTrack.title}</p>
                <Link className="btn btn--ghost btn--sm" to={"/challenge/" + nextInTrack.slug}>
                  Перейти к заданию
                </Link>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {helpOpen ? (
        <HintModal
          slug={slug}
          category={challenge.category}
          onClose={function () { setHelpOpen(false); }}
        />
      ) : null}
    </div>
  );
}
