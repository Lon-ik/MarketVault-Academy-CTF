import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import { moduleFor } from "../guidance";
import CodeBlock from "./CodeBlock";
import Icon from "./Icon";

function safeText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function WithLinks({ text }) {
  if (!text) return null;
  const escaped = safeText(text).replace(/(https?:\/\/[^\s<]+)/g, function (match) {
    const tail = match.match(/[.,;:!?)]+$/) || [""];
    const clean = match.slice(0, match.length - tail[0].length);
    return '<a href="' + clean + '" target="_blank" rel="noreferrer">' + clean + "</a>" + tail[0];
  });
  return <p dangerouslySetInnerHTML={{ __html: escaped.replace(/\n/g, "<br />") }} />;
}

const TABS = [
  { id: 1, label: "Подсказка 1" },
  { id: 2, label: "Подсказка 2" },
  { id: 3, label: "Разбор" },
];

export default function HintModal({ slug, category, onClose }) {
  const [tab, setTab] = useState(1);
  const [hints, setHints] = useState(null);
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef(null);
  const module = moduleFor(category);

  useEffect(function () {
    if (closeRef.current) closeRef.current.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(
    function () {
      let active = true;
      request("/api/academy/challenges/" + slug + "/hints?level=2")
        .then(function (data) {
          if (active) setHints(data);
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

  async function reveal() {
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/academy/challenges/" + slug + "/reveal", { method: "POST" });
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
        aria-labelledby="hint-title"
        onClick={function (event) { event.stopPropagation(); }}
      >
        <div className="modal__head">
          <div>
            <p className="eyebrow">Помощь</p>
            <h2 id="hint-title">Подсказки и разбор</h2>
          </div>
          <button
            ref={closeRef}
            className="icon-btn"
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map(function (item) {
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? "tab is-active" : "tab"}
                onClick={function () { setTab(item.id); }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="modal__body" role="tabpanel">
          {error ? <p className="alert alert--error">{error}</p> : null}

          {tab === 1 ? (
            <div className="stack">
              <p className="meta-text">Понятие: что за класс уязвимости и как он работает.</p>
              <WithLinks text={hints ? hints.hint_1 : "Загружаю подсказку…"} />
              <div className="callout">
                <strong>Идея:</strong> {module.idea}
              </div>
            </div>
          ) : null}

          {tab === 2 ? (
            <div className="stack">
              <p className="meta-text">Направление: где искать и что проверить.</p>
              <WithLinks
                text={hints && hints.hint_2 ? hints.hint_2 : "Сначала откройте первую подсказку."}
              />
            </div>
          ) : null}

          {tab === 3 ? (
            <div className="stack">
              {!solution ? (
                <>
                  <p className="muted">
                    Разбор показывает рабочий payload, уязвимый фрагмент и безопасную реализацию.
                    Факт просмотра сохраняется в профиле задания.
                  </p>
                  <button className="btn btn--danger" type="button" onClick={reveal} disabled={loading}>
                    {loading ? "Открываю…" : "Показать разбор"}
                  </button>
                </>
              ) : (
                <>
                  <CodeBlock title="Payload" code={solution.solution_payload} />
                  <CodeBlock title="Уязвимый код" code={solution.vulnerable_code} />
                  <CodeBlock title="Как чинить" code={solution.secure_code} />
                </>
              )}

              <h3>Что проверить в защите</h3>
              <ul className="learn-list">
                {module.defense.map(function (item, index) {
                  return <li key={index}>{item}</li>;
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
