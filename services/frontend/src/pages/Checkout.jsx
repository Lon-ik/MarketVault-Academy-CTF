import { useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";

export default function CheckoutPage() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const framed = window.self !== window.top;
      const data = await request("/api/checkout/confirm", {
        method: "POST",
        body: JSON.stringify({ framed: framed }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Оформление заказа</p>
          <h1>Подтверждение покупки</h1>
          <p className="page-sub">
            Демонстрационный заказ для сценариев склада. Реальные платежи не проводятся.
          </p>
        </div>
      </header>

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Заказ</h2>
          </div>
          <div className="panel__body">
            <dl className="meta-list">
              <div>
                <dt>Покупатель</dt>
                <dd>{user && user.username}</dd>
              </div>
              <div>
                <dt>Товар</dt>
                <dd>Смартфон Aurora X 256 ГБ</dd>
              </div>
              <div>
                <dt>Количество</dt>
                <dd>1</dd>
              </div>
              <div>
                <dt>Итого</dt>
                <dd>39 999,00 ₽</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Оплата</h2>
          </div>
          <div className="panel__body stack">
            <p className="muted" style={{ fontSize: 13.5 }}>
              Нажмите кнопку, чтобы подтвердить заказ. Проверьте, можно ли вызвать это действие
              без вашего участия.
            </p>
            <button className="btn" type="button" onClick={confirm} disabled={busy}>
              <Icon name="checkout" size={16} />
              {busy ? "Подтверждаю…" : "Подтвердить заказ"}
            </button>
            {result ? (
              <div className="alert alert--success">
                Заказ подтверждён.
                {result.flag ? <div className="flag-reveal">{result.flag}</div> : null}
              </div>
            ) : null}
            {error ? <p className="alert alert--error">{error}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
