import { useEffect, useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [wallet, setWallet] = useState(null);
  const [email, setEmail] = useState((user && user.email) || "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  useEffect(function () {
    request("/api/auth/me")
      .then(function (data) {
        setProfile(data.user);
        setEmail(data.user.email || "");
      })
      .catch(function () {});
    request("/api/inventory/wallet")
      .then(setWallet)
      .catch(function () {});
  }, []);

  async function saveEmail(event) {
    event.preventDefault();
    setMessage(null);
    setError("");
    try {
      const data = await request("/api/profile/email", {
        method: "POST",
        body: JSON.stringify({ email: email }),
      });
      setProfile(Object.assign({}, profile, { email: data.email }));
      setMessage({
        type: "success",
        text: data.flag ? "Email обновлён. Флаг: " + data.flag : "Email обновлён.",
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function topup() {
    setError("");
    try {
      const data = await request("/api/inventory/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: 100000 }),
      });
      setWallet(Object.assign({}, wallet, { balance: data.balance }));
    } catch (err) {
      setError(err.message);
    }
  }

  const initials = String((profile && profile.username) || "mv").slice(0, 2).toUpperCase();
  const balance = wallet ? (wallet.balance / 100).toLocaleString("ru-RU") : "—";

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <span className="user-chip__avatar" style={{ width: 46, height: 46, fontSize: 16, marginBottom: 10 }}>
            {initials}
          </span>
          <p className="eyebrow">Аккаунт</p>
          <h1>{profile && profile.username}</h1>
          <p className="page-sub">
            Роль: {profile && profile.role}. Баланс кошелька: {balance} ₽ (демонстрационный).
          </p>
        </div>
      </header>

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Контактный email</h2>
          </div>
          <div className="panel__body stack">
            <form className="stack" onSubmit={saveEmail}>
              <label className="field">
                <span>Email</span>
                <input type="email" value={email} onChange={function (event) { setEmail(event.target.value); }} required />
              </label>
              <button className="btn" type="submit">Сохранить email</button>
            </form>
            {message ? <p className="alert alert--success">{message.text}</p> : null}
            {error ? <p className="alert alert--error">{error}</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Кошелёк</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              Баланс используется в заданиях склада. Настоящие деньги не участвуют.
            </p>
            <p style={{ fontSize: 26, fontWeight: 700 }}>{balance} ₽</p>
            <button className="btn btn--ghost" type="button" onClick={topup}>
              Пополнить на 1 000 ₽
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Сессия</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              JWT хранится в localStorage, cookie-сессия выдаётся шлюзом. Выход очищает локальные
              данные браузера.
            </p>
            <button className="btn btn--danger" type="button" onClick={logout}>
              <Icon name="logout" size={16} />
              Выйти из аккаунта
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
