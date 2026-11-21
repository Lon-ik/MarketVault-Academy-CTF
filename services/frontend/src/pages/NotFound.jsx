import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="simple-screen">
      <div className="panel simple-screen__panel">
        <p className="kicker">404 / route missing</p>
        <h1>Страница не найдена</h1>
        <p className="muted">Маршрут не существует или скрыт от текущей сессии.</p>
        <Link className="button button--quiet" to="/">
          Вернуться в каталог
        </Link>
      </div>
    </div>
  );
}