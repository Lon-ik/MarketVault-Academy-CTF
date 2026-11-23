import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import Icon from "../components/Icon";

function nextId() {
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

const SUGGESTIONS = [
  "Где мой заказ?",
  "Сколько у меня на кошельке?",
  "Какие есть промокоды?",
  "Есть ли в наличии Nimbus 14?",
  "Сколько стоит Slate 11?",
  "Какая гарантия?",
];

export default function SupportPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelMode, setModelMode] = useState(false);
  const [error, setError] = useState("");
  const logRef = useRef(null);

  useEffect(function () {
    request("/api/frontend/bootstrap?page=support").catch(function () {});

    request("/api/support/history")
      .then(function (data) {
        setModelMode(Boolean(data.model));
        setMessages(
          data.messages.map(function (item) {
            return {
              id: nextId(),
              role: item.role === "user" ? "you" : "operator",
              text: item.text,
              topic: item.topic,
            };
          })
        );
      })
      .catch(function () {});

    function handler(event) {
      if (typeof event.data !== "string" || !event.data.trim()) return;
      setMessages(function (previous) {
        return previous.concat([{ id: nextId(), role: "operator", raw: event.data, topic: "Оператор" }]);
      });
    }
    window.addEventListener("message", handler);
    return function () {
      window.removeEventListener("message", handler);
    };
  }, []);

  useEffect(function () {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  async function send(text) {
    const value = String(text || "").trim();
    if (!value || busy) return;
    setDraft("");
    setError("");
    setMessages(function (previous) {
      return previous.concat([{ id: nextId(), role: "you", text: value }]);
    });
    setBusy(true);
    try {
      const data = await request("/api/support/message", {
        method: "POST",
        body: JSON.stringify({ text: value }),
      });
      setMessages(function (previous) {
        return previous.concat([
          { id: nextId(), role: "operator", text: data.reply, topic: data.topic, source: data.source },
        ]);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    send(draft);
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  }

  async function reset() {
    await request("/api/support/reset", { method: "POST" }).catch(function () {});
    setMessages([]);
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Поддержка</p>
          <h1>Чат со службой поддержки</h1>
          <p className="page-sub">
            Отвечает локальный ассистент Марк: он видит ваши заказы, баланс и каталог.
            {modelMode ? " Подключена локальная модель." : " Работает встроенный движок правил."}
          </p>
        </div>
        <button className="btn btn--ghost" type="button" onClick={reset}>Очистить диалог</button>
      </header>

      <div className="grid-2 grid-2--side">
        <section className="panel">
          <div className="panel__head">
            <h2>Диалог</h2>
            <span className="panel__meta">
              <span className="dot dot--on" style={{ display: "inline-block", marginRight: 6 }} />
              на связи
            </span>
          </div>

          <div className="support-log" ref={logRef} aria-live="polite">
            {messages.length === 0 ? (
              <p className="support-empty">
                Здравствуйте! Спросите про заказ, оплату, доставку, гарантию или наличие товара.
              </p>
            ) : (
              messages.map(function (message) {
                if (message.role === "you") {
                  return (
                    <div className="support-msg support-msg--you" key={message.id}>
                      <span className="support-msg__role">вы</span>
                      <p>{message.text}</p>
                    </div>
                  );
                }
                return (
                  <div className="support-msg support-msg--operator" key={message.id}>
                    <span className="support-msg__role">
                      Марк{message.topic ? " · " + message.topic : ""}
                    </span>
                    {message.raw ? (
                      <div dangerouslySetInnerHTML={{ __html: message.raw }} />
                    ) : (
                      <p style={{ whiteSpace: "pre-line" }}>{message.text}</p>
                    )}
                  </div>
                );
              })
            )}
            {busy ? (
              <div className="support-msg support-msg--operator">
                <span className="support-msg__role">Марк</span>
                <p className="typing">печатает…</p>
              </div>
            ) : null}
          </div>

          <div className="suggest-row">
            {SUGGESTIONS.map(function (item) {
              return (
                <button
                  className="chip"
                  key={item}
                  type="button"
                  onClick={function () { send(item); }}
                  disabled={busy}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <form className="composer" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="support-message">Сообщение</label>
            <textarea
              id="support-message"
              value={draft}
              onChange={function (event) { setDraft(event.target.value); }}
              onKeyDown={onKeyDown}
              placeholder="Напишите сообщение…"
              rows={2}
            />
            <button className="btn" type="submit" disabled={!draft.trim() || busy}>
              <Icon name="support" size={16} />
              Отправить
            </button>
          </form>
          {error ? <p className="alert alert--error" style={{ margin: "0 12px 12px" }}>{error}</p> : null}
        </section>

        <aside className="panel">
          <div className="panel__head">
            <h2>Что умеет</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              Ассистент собирает ответ по базе знаний и подтягивает данные из магазина:
              заказы, баланс кошелька, остатки и цены товаров.
            </p>
            <dl className="meta-list">
              <div><dt>Заказы</dt><dd>статус и суммы</dd></div>
              <div><dt>Кошелёк</dt><dd>баланс и промокоды</dd></div>
              <div><dt>Каталог</dt><dd>цены и наличие</dd></div>
              <div><dt>Режим</dt><dd>{modelMode ? "локальная модель" : "движок правил"}</dd></div>
            </dl>
            <p className="meta-text">
              Enter отправляет, Shift+Enter переносит строку. Диалог хранится в сессии.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
