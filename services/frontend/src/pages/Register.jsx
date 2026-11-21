import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        <p className="kicker">new operator</p>
        <h1>Новый аккаунт для учебной лаборатории.</h1>
        <p className="auth-lead">
          После регистрации доступны каталог заданий, подсказки, профиль и таблица лидеров.
          Прогресс хранится внутри стенда.
        </p>
        <ul className="auth-facts">
          <li>
            <strong>01</strong>
            <span>учётная запись на стенд</span>
          </li>
          <li>
            <strong>30</strong>
            <span>заданий без ограничений по времени</span>
          </li>
        </ul>
        <p className="auth-status">
          <span className="status-dot" /> registration open
        </p>
      </section>

      <section className="auth-card panel">
        <div className="panel__header">
          <div>
            <p className="kicker">create account</p>
            <h2>Регистрация</h2>
          </div>
        </div>
        <form className="stack" onSubmit={submit}>
          <label>
            Логин
            <input value={form.username} onChange={update("username")} minLength={3} autoComplete="username" required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={form.password}
              onChange={update("password")}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </label>
          {error ? <p className="alert alert--error">{error}</p> : null}
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Создание…" : "Зарегистрироваться"}
          </button>
        </form>
        <p className="auth-switch">
          Уже есть доступ? <Link to="/login">Войти</Link>
        </p>
      </section>
    </div>
  );
}