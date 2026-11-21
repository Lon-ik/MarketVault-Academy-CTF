import { useEffect, useState } from "react";

export default function FlagToast() {
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    function handler(event) {
      const flag = event.detail;
      if (!flag) return;
      setFlags((previous) => (previous.includes(flag) ? previous : [...previous, flag].slice(-3)));
    }
    window.addEventListener("mv:flag", handler);
    return () => window.removeEventListener("mv:flag", handler);
  }, []);

  useEffect(() => {
    if (!flags.length) return undefined;
    const timers = flags.map((flag) =>
      window.setTimeout(() => {
        setFlags((previous) => previous.filter((item) => item !== flag));
      }, 20000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [flags]);

  if (!flags.length) return null;

  async function copy(flag) {
    try {
      await navigator.clipboard.writeText(flag);
    } catch (error) {
      /* clipboard is optional */
    }
  }

  return (
    <div className="flag-toast" role="status" aria-live="polite">
      {flags.map((flag) => (
        <div className="flag-toast__item" key={flag}>
          <div className="flag-toast__meta">
            <span className="flag-toast__label">flag received</span>
            <button
              className="button button--quiet button--small"
              type="button"
              onClick={() => copy(flag)}
            >
              копировать
            </button>
          </div>
          <code>{flag}</code>
        </div>
      ))}
    </div>
  );
}