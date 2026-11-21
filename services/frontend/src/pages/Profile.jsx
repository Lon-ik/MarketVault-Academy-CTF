import { useEffect, useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [wallet, setWallet] = useState(null);
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    request("/api/auth/me")
      .then((data) => {
        setProfile(data.user);
        setEmail(data.user.email || "");
      })
      .catch(() => {});
    request("/api/inventory/wallet")
      .then(setWallet)
      .catch(() => {});
  }, []);

  async function saveEmail(event) {
    event.preventDefault();
    setMessage(null);
    setError("");
    try {
      const data = await request("/api/profile/email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setProfile({ ...profile, email: data.email });
      setMessage(
        data.flag
          ? { type: "success", text: `Email обновлён. ${data.flag}` }
          : { type: "success", text: "Email обновлён." }
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function topup() {
    try {
      const data = await request("/api/inventory/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: 100000 }),
      });
      setWallet({ ...wallet, balance: data.balance });
    } catch (err) {
      setError(err.message);
    }
  }

  const initials = (profile?.username || "mv").slice(0, 2).toUpperCase();

  return (
    <div className="page">
      <header className="page-header profile-header">
        <div className="profile-identity">
          <span className="avatar avatar--large">{initials}</span>
          <div>
            <p className="kicker">operator profile</p>
            <h1>{profile?.username}</h1>
            <p className="meta-text">роль: {profile?.role}</p>
          </div>
        </div>
        <div className="header-metrics">
          <div className="header-metric">
            <span>Баланс</span>
            <strong>{wallet ? `${(wallet.balance / 100).toLocaleString("ru-RU")} ₽` : "—"}</strong>
          </div>
        </div>
      </header>

      <div className="profile-grid">
        <section className="panel">
          <div className="panel__header">
            <h2>Контактные данные</h2>
          </div>
          <form className="stack" onSubmit={saveEmail}>
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <button className="button" type="submit">
              Сохранить email
            </button>
          </form>
          {message ? <p className={`alert alert--${message.type}`}>{message.text}</p> : null}
          {error ? <p className="alert alert--error">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Кошелёк</h2>
          </div>
          <p className="muted">Демонстрационный баланс для inventory-сценариев.</p>
          <p className="wallet-value">
            {wallet ? `${(wallet.balance / 100).toLocaleString("ru-RU")} ₽` : "загрузка…"}
          </p>
          <button className="button button--quiet" type="button" onClick={topup}>
            Пополнить на 1 000 ₽
          </button>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Сессия</h2>
          </div>
          <p className="muted">
            JWT хранится в localStorage, cookie-сессия выдана шлюзом. Выход очищает локальные данные.
          </p>
          <button className="button button--danger" type="button" onClick={logout}>
            Выйти из аккаунта
          </button>
        </section>
      </div>
    </div>
  );
}