import { useEffect, useState } from "react";

export default function FlagToast() {
  const [flags, setFlags] = useState([]);

  useEffect(function () {
    function handler(event) {
      const flag = event.detail;
      if (!flag) return;
      setFlags(function (previous) {
        return previous.indexOf(flag) === -1 ? previous.concat([flag]).slice(-3) : previous;
      });
    }
    window.addEventListener("mv:flag", handler);
    return function () {
      window.removeEventListener("mv:flag", handler);
    };
  }, []);

  useEffect(
    function () {
      if (!flags.length) return undefined;
      const timers = flags.map(function (flag) {
        return window.setTimeout(function () {
          setFlags(function (previous) {
            return previous.filter(function (item) {
              return item !== flag;
            });
          });
        }, 25000);
      });
      return function () {
        timers.forEach(function (timer) {
          window.clearTimeout(timer);
        });
      };
    },
    [flags]
  );

  if (!flags.length) return null;

  function copy(flag) {
    if (navigator.clipboard) navigator.clipboard.writeText(flag).catch(function () {});
  }

  return (
    <div className="toasts" role="status" aria-live="polite">
      {flags.map(function (flag) {
        return (
          <div className="toast" key={flag}>
            <div className="toast__row">
              <span className="toast__label">Флаг получен</span>
              <button className="btn btn--ghost btn--sm" type="button" onClick={function () { copy(flag); }}>
                Копировать
              </button>
            </div>
            <code>{flag}</code>
          </div>
        );
      })}
    </div>
  );
}
