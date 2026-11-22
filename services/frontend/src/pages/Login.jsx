import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message === "invalid credentials" ? "Неверный логин или пароль." : err.message);
    } finally {
      setBusy(false);
    }
  }

  function fill(name, pass) {
    setUsername(name);
    setPassword(pass);
  }

  return (
    <div className="auth">
      <section className="auth__aside">
        <div className="brand">
          <img className="brand__lockup" src="/logo.png" alt="MarketVault Academy" />
        </div>
        <h1>Тренажёр по веб-безопасности на живых сервисах</h1>
        <p>
          Пять приложений с намеренными уязвимостями, разбор по классам ошибок и понятная
          методология: от разведки до исправления. Всё выполняется внутри изолированного стенда.
        </p>
        <ul className="auth__facts">
          <li>
            <strong>32</strong>
            <span>задания по пяти трекам</span>
          </li>
          <li>
            <strong>5</strong>
            <span>направлений обучения</span>
          </li>
          <li>
            <strong>0</strong>
            <span>реальных данных</span>
          </li>
        </ul>
        <p className="meta-text" style={{ color: "#93a1b5" }}>
          Учебная среда. Не подключайте рабочие данные и платёжные системы.
        </p>
      </section>

      <section className="auth__main">
        <div className="auth__card panel">
          <div className="panel__head">
            <h2>Вход</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              Используйте выданный вам аккаунт стенда.
            </p>
            <form className="stack" onSubmit={submit}>
              <label className="field">
                <span>Логин</span>
                <input
                  value={username}
                  onChange={function (event) { setUsername(event.target.value); }}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </label>
              <label className="field">
                <span>Пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={function (event) { setPassword(event.target.value); }}
                  autoComplete="current-password"
                  required
                />
              </label>
              {error ? <p className="alert alert--error">{error}</p> : null}
              <button className="btn btn--block" type="submit" disabled={busy}>
                {busy ? "Проверяю…" : "Войти"}
              </button>
            </form>

            <div>
              <p className="meta-text">Демонстрационные аккаунты</p>
              <div className="demo-row">
                <button className="btn btn--ghost btn--sm" type="button" onClick={function () { fill("student", "student123"); }}>
                  student / student123
                </button>
                <button className="btn btn--ghost btn--sm" type="button" onClick={function () { fill("admin", "admin123"); }}>
                  admin / admin123
                </button>
              </div>
            </div>

            <p className="auth__switch">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
