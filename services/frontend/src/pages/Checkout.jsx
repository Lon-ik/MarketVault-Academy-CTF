import { useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";

export default function CheckoutPage() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const framed = window.self !== window.top;
      const data = await request("/api/checkout/confirm", {
        method: "POST",
        body: JSON.stringify({ framed }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__text">
          <p className="kicker">checkout</p>
          <h1>Подтверждение заказа</h1>
          <p className="page-subtitle">Демонстрационный заказ в изолированной inventory-среде.</p>
        </div>
      </header>

      <div className="checkout-layout">
        <section className="panel">
          <div className="panel__header">
            <h2>Состав заказа</h2>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Покупатель</dt>
              <dd>{user?.username}</dd>
            </div>
            <div>
              <dt>Позиция</dt>
              <dd>Aurora X 256 ГБ</dd>
            </div>
            <div>
              <dt>Количество</dt>
              <dd>1</dd>
            </div>
            <div className="summary-list__total">
              <dt>Итого</dt>
              <dd>39 999,00 ₽</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>Оплата</h2>
          </div>
          <p className="muted">Оплата демонстрационная, реальные платёжные данные не используются.</p>
          <button className="button" type="button" onClick={confirm} disabled={loading}>
            {loading ? "Подтверждаю…" : "Подтвердить заказ"}
          </button>
          {result ? (
            <div className="alert alert--success">
              Заказ подтверждён.
              {result.flag ? (
                <div className="flag-reveal">
                  <span className="section-label">flag</span>
                  <code>{result.flag}</code>
                </div>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="alert alert--error">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}