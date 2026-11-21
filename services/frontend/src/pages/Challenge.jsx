import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { request } from "../api";
import StuckModal from "../components/StuckModal";
import { pointsFor, serviceCode } from "../game";

export default function ChallengePage() {
  const { slug } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState("");
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);

  useEffect(() => {
    let active = true;
    request("/api/academy/challenges")
      .then((data) => {
        if (!active) return;
        const found = data.challenges.find((item) => item.slug === slug);
        if (!found) {
          setError("Задание не найдено");
          return;
        }
        setChallenge(found);
        setSolved(Boolean(found.is_solved));
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function submit(event) {
    event.preventDefault();
    if (!flag.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await request(`/api/academy/challenges/${slug}/solve`, {
        method: "POST",
        body: JSON.stringify({ flag: flag.trim() }),
      });
      setSolved(true);
      setMessage({ type: "success", text: "Флаг принят. Прогресс обновлён." });
      setFlag("");
      window.dispatchEvent(new Event("mv:progress-changed"));
    } catch (err) {
      setMessage({ type: "error", text: err.message === "wrong flag" ? "Флаг неверный" : err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !challenge) {
    return (
      <div className="page">
        <div className="panel">
          <h1>Ошибка</h1>
          <p className="alert alert--error">{error}</p>
          <Link className="button button--quiet" to="/">
            Назад к каталогу
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return <div className="loading-screen">Загрузка задания…</div>;
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Хлебные крошки">
        <Link to="/">Каталог</Link>
        <span>/</span>
        <span>{challenge.service}</span>
      </nav>

      <header className="page-header challenge-header">
        <div className="page-header__text">
          <p className="kicker">
            {serviceCode(challenge.service)} / {challenge.category}
          </p>
          <h1>{challenge.title}</h1>
          <div className="badge-row">
            <span className={`difficulty difficulty--${challenge.difficulty}`}>{challenge.difficulty}</span>
            <span className="xp-chip">{pointsFor(challenge)} XP</span>
            <span className={`state-label ${solved ? "is-solved" : ""}`}>{solved ? "solved" : "open"}</span>
            <span className="meta-text">
              {challenge.hints_used ? `hints used: ${challenge.hints_used}` : "no hints used"}
            </span>
          </div>
        </div>
        <button className="button button--quiet" type="button" onClick={() => setStuckOpen(true)}>
          I&apos;m Stuck
        </button>
      </header>

      <div className="challenge-layout">
        <section className="panel challenge-brief">
          <div className="panel__header">
            <h2>Описание</h2>
          </div>
          <p className="prose pre-line">{challenge.description}</p>
          <div className="notice">
            <span className="notice__label">Подсказка по процессу</span>
            <p>
              Сначала исследуйте поведение сервиса, затем откройте <strong>Hint 1</strong> и{" "}
              <strong>Hint 2</strong>. Решение доступно отдельно и фиксирует факт просмотра.
            </p>
          </div>
        </section>

        <aside className="challenge-side">
          <section className="panel submit-panel">
            <div className="panel__header">
              <h2>Отправка флага</h2>
            </div>
            <p className="panel__hint">Формат: <code>MV&#123;...&#125;</code></p>
            <form className="stack" onSubmit={submit}>
              <label>
                Флаг
                <input
                  value={flag}
                  onChange={(event) => setFlag(event.target.value)}
                  placeholder="MV{...}"
                  spellCheck={false}
                  required
                />
              </label>
              <button className="button" type="submit" disabled={submitting || solved}>
                {solved ? "Задание решено" : submitting ? "Проверка…" : "Проверить флаг"}
              </button>
            </form>
            {message ? <p className={`alert alert--${message.type}`}>{message.text}</p> : null}
          </section>

          <section className="panel meta-panel">
            <div className="panel__header">
              <h2>Метаданные</h2>
            </div>
            <dl className="meta-list">
              <div>
                <dt>Сервис</dt>
                <dd>{challenge.service}</dd>
              </div>
              <div>
                <dt>Категория</dt>
                <dd>{challenge.category}</dd>
              </div>
              <div>
                <dt>Сложность</dt>
                <dd>{challenge.difficulty}</dd>
              </div>
              <div>
                <dt>Подсказки</dt>
                <dd>{challenge.hints_used}</dd>
              </div>
              <div>
                <dt>Награда</dt>
                <dd>{pointsFor(challenge)} XP</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {stuckOpen ? <StuckModal slug={slug} onClose={() => setStuckOpen(false)} /> : null}
    </div>
  );
}