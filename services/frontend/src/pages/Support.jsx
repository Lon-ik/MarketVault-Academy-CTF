import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import Icon from "../components/Icon";

function nextId() {
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

export default function SupportPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const logRef = useRef(null);

  useEffect(function () {
    request("/api/frontend/bootstrap?page=support").catch(function () {});
    function handler(event) {
      if (typeof event.data !== "string" || !event.data.trim()) return;
      setMessages(function (previous) {
        return previous.concat([{ id: nextId(), role: "operator", raw: event.data }]);
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
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages(function (previous) {
      return previous.concat([{ id: nextId(), role: "you", text: text }]);
    });
    setDraft("");
  }

  function submit(event) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Поддержка</p>
          <h1>Чат со службой поддержки</h1>
          <p className="page-sub">
            Демонстрационный канал: сообщения живут только в этой вкладке. Оператор отвечает
            через postMessage, поэтому окно поддержки можно встроить на чужую страницу.
          </p>
        </div>
      </header>

      <div className="grid-2 grid-2--side">
        <section className="panel">
          <div className="panel__head">
            <h2>Диалог</h2>
            <span className="panel__meta">
              <span className="dot dot--on" style={{ display: "inline-block", marginRight: 6 }} />
              оператор на связи
            </span>
          </div>

          <div className="support-log" ref={logRef} aria-live="polite">
            {messages.length === 0 ? (
              <p className="support-empty">Напишите первое сообщение, ответ появится здесь.</p>
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
                    <span className="support-msg__role">оператор</span>
                    <div dangerouslySetInnerHTML={{ __html: message.raw }} />
                  </div>
                );
              })
            )}
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
            <button className="btn" type="submit" disabled={!draft.trim()}>
              Отправить
            </button>
          </form>
        </section>

        <aside className="panel">
          <div className="panel__head">
            <h2>О канале</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              Сообщения не сохраняются на сервере и исчезают после перезагрузки страницы.
            </p>
            <dl className="meta-list">
              <div>
                <dt>Транспорт</dt>
                <dd>postMessage</dd>
              </div>
              <div>
                <dt>Хранение</dt>
                <dd>в памяти вкладки</dd>
              </div>
              <div>
                <dt>Проверка источника</dt>
                <dd>—</dd>
              </div>
            </dl>
            <p className="meta-text">Enter отправляет, Shift+Enter переносит строку.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
