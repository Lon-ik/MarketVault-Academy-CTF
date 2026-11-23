import { useEffect, useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";
import { formatPrice } from "../shop";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [wallet, setWallet] = useState(null);
  const [redeemed, setRedeemed] = useState([]);
  const [email, setEmail] = useState((user && user.email) || "");
  const [promo, setPromo] = useState("");
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  function loadWallet() {
    return request("/api/wallet")
      .then(function (data) {
        setWallet(data.balance);
        setRedeemed(data.redeemed);
      })
      .catch(function () {});
  }

  useEffect(function () {
    request("/api/auth/me")
      .then(function (data) {
        setProfile(data.user);
        setEmail(data.user.email || "");
      })
      .catch(function () {});
    loadWallet();
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

  async function redeem(event) {
    event.preventDefault();
    setMessage(null);
    setError("");
    try {
      const data = await request("/api/wallet/promo", {
        method: "POST",
        body: JSON.stringify({ code: promo }),
      });
      setPromo("");
      setMessage({ type: "success", text: "Код " + data.code + " принят: +" + formatPrice(data.amount) });
      await loadWallet();
    } catch (err) {
      setError(err.message);
    }
  }

  async function topup(event) {
    event.preventDefault();
    setMessage(null);
    setError("");
    try {
      const data = await request("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: Math.round(Number(amount) * 100) }),
      });
      setWallet(data.balance);
      setMessage({ type: "success", text: "Баланс пополнен администратором." });
    } catch (err) {
      setError(err.message);
    }
  }

  const initials = String((profile && profile.username) || "mv").slice(0, 2).toUpperCase();
  const isAdmin = Boolean(profile && profile.role === "admin");

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <span className="user-chip__avatar" style={{ width: 46, height: 46, fontSize: 16, marginBottom: 10 }}>
            {initials}
          </span>
          <p className="eyebrow">Аккаунт</p>
          <h1>{profile && profile.username}</h1>
          <p className="page-sub">Роль: {profile && profile.role}</p>
        </div>
      </header>

      {message ? <p className="alert alert--success">{message.text}</p> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Кошелёк</h2>
            <span className="panel__meta">оплата заказов</span>
          </div>
          <div className="panel__body stack">
            <p style={{ fontSize: 30, fontWeight: 800 }}>{wallet === null ? "—" : formatPrice(wallet)}</p>

            <form className="stack" onSubmit={redeem}>
              <label className="field">
                <span>Промокод</span>
                <input
                  value={promo}
                  onChange={function (event) { setPromo(event.target.value.toUpperCase()); }}
                  placeholder="WELCOME"
                  spellCheck={false}
                />
              </label>
              <button className="btn" type="submit" disabled={!promo.trim()}>Активировать код</button>
            </form>

            {redeemed.length ? (
              <div>
                <p className="meta-text">Активированные коды</p>
                <div className="tag-row">
                  {redeemed.map(function (item) {
                    return <span className="chip chip--solved" key={item.code}>{item.code} · +{formatPrice(item.amount)}</span>;
                  })}
                </div>
              </div>
            ) : (
              <p className="meta-text">
                Коды приходят в письмах рассылки и на мероприятиях. Пополнение без кода доступно только администратору.
              </p>
            )}
          </div>
        </section>

        {isAdmin ? (
          <section className="panel">
            <div className="panel__head">
              <h2>Пополнение (админ)</h2>
              <span className="panel__meta">служебный доступ</span>
            </div>
            <div className="panel__body stack">
              <form className="promo-row" onSubmit={topup}>
                <label className="field">
                  <span>Сумма, ₽</span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={function (event) { setAmount(event.target.value); }}
                    required
                  />
                </label>
                <button className="btn" type="submit">Пополнить</button>
              </form>
              <p className="meta-text">
                Ручное пополнение доступно только учётной записи с ролью admin.
                Остальным пользователям баланс пополняется промокодами.
              </p>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel__head"><h2>Контактный email</h2></div>
          <div className="panel__body stack">
            <form className="stack" onSubmit={saveEmail}>
              <label className="field">
                <span>Email</span>
                <input type="email" value={email} onChange={function (event) { setEmail(event.target.value); }} required />
              </label>
              <button className="btn btn--ghost" type="submit">Сохранить email</button>
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head"><h2>Сессия</h2></div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              JWT хранится в localStorage, cookie-сессия выдаётся шлюзом. Выход очищает локальные данные.
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
