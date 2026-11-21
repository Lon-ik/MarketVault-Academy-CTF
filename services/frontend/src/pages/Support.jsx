import { useEffect, useRef, useState } from "react";
import { request } from "../api";

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SupportPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    request("/api/frontend/bootstrap?page=support").catch(() => {});
    const handler = (event) => {
      if (typeof event.data !== "string" || !event.data.trim()) {
        return;
      }
      setMessages((previous) => [
        ...previous,
        { id: nextId(), role: "operator", raw: event.data },
      ]);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    setMessages((previous) => [...previous, { id: nextId(), role: "you", text }]);
    setDraft("");
  }

  function submit(event) {
    event.preventDefault();
    sendMessage();
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__text">
          <p className="kicker">support channel</p>
          <h1>Служба поддержки</h1>
          <p className="page-subtitle">
            Учебный канал для сообщений оператора. Сообщения сохраняются только в этой вкладке.
          </p>
        </div>
      </header>

      <div className="support-layout">
        <section className="panel support-panel">
          <div className="panel__header">
            <h2>Диалог</h2>
            <span className="support-status">
              <span className="status-dot" /> connected
            </span>
          </div>

          <div className="support-log" ref={logRef} aria-live="polite">
            {messages.length === 0 ? (
              <p className="support-empty">
                Сообщений пока нет. Напишите первое сообщение — ответ оператора появится здесь.
              </p>
            ) : (
              messages.map((message) =>
                message.role === "you" ? (
                  <div className="support-msg support-msg--you" key={message.id}>
                    <span className="support-msg__role">you</span>
                    <p>{message.text}</p>
                  </div>
                ) : (
                  <div className="support-msg support-msg--operator" key={message.id}>
                    <span className="support-msg__role">operator</span>
                    <div
                      className="support-msg__body"
                      dangerouslySetInnerHTML={{ __html: message.raw }}
                    />
                  </div>
                )
              )
            )}
          </div>

          <form className="support-composer" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="support-message">
              Сообщение
            </label>
            <textarea
              id="support-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Напишите сообщение…"
              rows={2}
            />
            <button className="button" type="submit" disabled={!draft.trim()}>
              Отправить
            </button>
          </form>
        </section>

        <aside className="panel support-side-panel">
          <div className="panel__header">
            <h2>О канале</h2>
          </div>
          <p className="muted">
            Это демонстрационный канал учебного стенда. Сообщения не отправляются на сервер и
            исчезают после перезагрузки страницы.
          </p>
          <dl className="meta-list">
            <div>
              <dt>Статус</dt>
              <dd>connected</dd>
            </div>
            <div>
              <dt>Транспорт</dt>
              <dd>postMessage</dd>
            </div>
            <div>
              <dt>Режим</dt>
              <dd>local demo</dd>
            </div>
          </dl>
          <p className="support-hint">Enter — отправить, Shift+Enter — новая строка.</p>
        </aside>
      </div>
    </div>
  );
}
