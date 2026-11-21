import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import CodeBlock from "./CodeBlock";

function HintText({ text }) {
  if (!text) return null;
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(https?:\/\/[^\s<]+)/g, (match) => {
      const cleaned = match.replace(/[.,;:!?)]+$/, "");
      const tail = match.slice(cleaned.length);
      return `<a href="${cleaned}" target="_blank" rel="noreferrer">${cleaned}</a>${tail}`;
    });
  return <p dangerouslySetInnerHTML={{ __html: html }} />;
}

const TABS = [
  { id: 1, label: "Hint 1" },
  { id: 2, label: "Hint 2" },
  { id: 3, label: "Solution" },
];

export default function StuckModal({ slug, onClose }) {
  const [tab, setTab] = useState(1);
  const [hints, setHints] = useState(null);
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    request(`/api/academy/challenges/${slug}/hints?level=2`)
      .then((data) => {
        if (active) setHints(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function reveal() {
    setLoading(true);
    setError("");
    try {
      const data = await request(`/api/academy/challenges/${slug}/reveal`, {
        method: "POST",
      });
      setSolution(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stuck-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <p className="kicker">assistance</p>
            <h2 id="stuck-title">Помощь по заданию</h2>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно помощи"
          >
            ×
          </button>
        </div>

        <div className="tabs" role="tablist" aria-label="Типы помощи">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              className={tab === item.id ? "tab is-active" : "tab"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className="modal__body"
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          {error ? <p className="alert alert--error">{error}</p> : null}

          {tab === 1 ? (
            <div className="hint-block">
              <p className="kicker">concept</p>
              <HintText text={hints?.hint_1 || "Загрузка подсказки…"} />
            </div>
          ) : null}

          {tab === 2 ? (
            <div className="hint-block">
              <p className="kicker">location</p>
              <HintText text={hints?.hint_2 || "Откройте Hint 1, чтобы получить вторую подсказку."} />
            </div>
          ) : null}

          {tab === 3 ? (
            <div className="solution">
              {!solution ? (
                <>
                  <p className="muted">
                    Решение содержит точный payload, уязвимый фрагмент и вариант безопасной реализации.
                  </p>
                  <button className="button button--danger" type="button" onClick={reveal} disabled={loading}>
                    {loading ? "Открываю…" : "Reveal Solution"}
                  </button>
                </>
              ) : (
                <>
                  <CodeBlock title="payload" code={solution.solution_payload} />
                  <CodeBlock title="уязвимый код" code={solution.vulnerable_code} />
                  <CodeBlock title="безопасный код" code={solution.secure_code} />
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}