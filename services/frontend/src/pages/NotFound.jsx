import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="auth__main">
      <div className="panel center-panel">
        <div className="panel__body stack">
          <p className="eyebrow">404</p>
          <h1>Страница не найдена</h1>
          <p className="muted">
            Такого маршрута нет. Возможно, ссылка устарела или задание было удалено из каталога.
          </p>
          <div className="actions">
            <Link className="btn" to="/">К списку заданий</Link>
            <Link className="btn btn--ghost" to="/path">Учебный план</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
