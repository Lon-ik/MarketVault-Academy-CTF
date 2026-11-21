import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message === "invalid credentials" ? "Неверный логин или пароль" : err.message);
    } finally {
      setLoading(false);
    }
  }

  function useDemo(name, pass) {
    setUsername(name);
    setPassword(pass);
  }

  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="auth-brand">
          <span className="brand-mark">MV</span>
          <span className="brand-text">
            <strong>MarketVault</strong>
            <small>Academy</small>
          </span>
        </div>
        <p className="kicker">isolated security lab</p>
        <h1>Практика по веб-безопасности в контролируемой среде.</h1>
        <p className="auth-lead">
          Учебная CTF-платформа с реальными сервисами, подсказками и фиксацией прогресса.
          Все сценарии выполняются внутри изолированного стенда.
        </p>
        <ul className="auth-facts">
          <li>
            <strong>30</strong>
            <span>заданий по шести сервисам</span>
          </li>
          <li>
            <strong>3</strong>
            <span>уровня сложности и подсказки</span>
          </li>
          <li>
            <strong>0</strong>
            <span>производственных данных</span>
          </li>
        </ul>
        <p className="auth-status">
          <span className="status-dot" /> environment online
        </p>
      </section>

      <section className="auth-card panel">
        <div className="panel__header">
          <div>
            <p className="kicker">access terminal</p>
            <h2>Вход</h2>
          </div>
        </div>
        <p className="muted">Используйте учебный аккаунт или данные, выданные администратором.</p>
        <form className="stack" onSubmit={submit}>
          <label>
            Логин
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="alert alert--error">{error}</p> : null}
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Подключение…" : "Войти"}
          </button>
        </form>

        <div className="demo-block">
          <p className="section-label">Демо-аккаунты</p>
          <div className="demo-row">
            <button className="button button--quiet button--small" type="button" onClick={() => useDemo("student", "student123")}>
              student
            </button>
            <button className="button button--quiet button--small" type="button" onClick={() => useDemo("admin", "admin123")}>
              admin
            </button>
          </div>
        </div>

        <p className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </section>
    </div>
  );
}