import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function update(field) {
    return function (event) {
      setForm(Object.assign({}, form, { [field]: event.target.value }));
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form.username, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth__aside">
        <div className="brand">
          <img className="brand__lockup" src="/logo.png" alt="MarketVault Academy" />
        </div>
        <h1>Свой аккаунт для прохождения стенда</h1>
        <p>
          После регистрации открываются задания, подсказки, учебный план, профиль и таблица
          результатов. Прогресс сохраняется внутри стенда и сбрасывается вместе с ним.
        </p>
        <ul className="auth__facts">
          <li>
            <strong>01</strong>
            <span>учётная запись на стенд</span>
          </li>
          <li>
            <strong>32</strong>
            <span>задания без ограничения по времени</span>
          </li>
        </ul>
      </section>

      <section className="auth__main">
        <div className="auth__card panel">
          <div className="panel__head">
            <h2>Регистрация</h2>
          </div>
          <div className="panel__body">
            <form className="stack" onSubmit={submit}>
              <label className="field">
                <span>Логин</span>
                <input value={form.username} onChange={update("username")} minLength={3} autoComplete="username" required />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
              </label>
              <label className="field">
                <span>Пароль</span>
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
              <button className="btn btn--block" type="submit" disabled={busy}>
                {busy ? "Создаю…" : "Создать аккаунт"}
              </button>
            </form>
            <p className="auth__switch">
              Уже есть доступ? <Link to="/login">Войти</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
