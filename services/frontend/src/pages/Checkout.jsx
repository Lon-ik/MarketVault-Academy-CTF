import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../api";
import { useAuth } from "../auth";
import { addToCart, checkoutCart, loadCart, removeFromCart, setQuantity } from "../cart";
import Icon from "../components/Icon";
import { formatPrice, onImageError, stockLabel } from "../shop";

export default function CheckoutPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    return Promise.all([
      loadCart().then(setCart).catch(function () {}),
      request("/api/wallet").then(function (data) { setWallet(data.balance); }).catch(function () {}),
    ]);
  }

  useEffect(function () {
    refresh();
    request("/api/products")
      .then(function (data) { setCatalog(data.products); })
      .catch(function () {});
  }, []);

  const matches = useMemo(
    function () {
      const needle = pickerQuery.trim().toLowerCase();
      const list = needle
        ? catalog.filter(function (item) {
            return (item.title + " " + item.category).toLowerCase().indexOf(needle) !== -1;
          })
        : catalog;
      return list.slice(0, 6);
    },
    [catalog, pickerQuery]
  );

  async function change(productId, quantity) {
    setError("");
    try {
      setCart(await setQuantity(productId, quantity));
    } catch (err) {
      setError(err.message);
    }
  }

  async function drop(productId) {
    setError("");
    try {
      setCart(await removeFromCart(productId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function add(productId) {
    setError("");
    try {
      setCart(await addToCart(productId, 1));
      setPickerQuery("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmOrder() {
    setError("");
    try {
      const framed = window.self !== window.top;
      const data = await request("/api/checkout/confirm", {
        method: "POST",
        body: JSON.stringify({ framed: framed }),
      });
      setConfirmed(true);
      setNotice({ type: "success", text: "Заказ подтверждён. Остался последний шаг — оплата." });
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }

  async function pay() {
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      const data = await checkoutCart();
      setNotice({
        type: "success",
        text: "Заказ №" + data.orderId + " оплачен. Списано " + formatPrice(data.total) +
          ", остаток на кошельке " + formatPrice(data.balance) + ".",
      });
      setConfirmed(false);
      await refresh();
    } catch (err) {
      if (err.message === "insufficient funds") {
        setError("Не хватает денег на кошельке. Пополните баланс промокодом в профиле.");
      } else if (err.message === "out of stock") {
        setError("Товар закончился на складе.");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const items = cart ? cart.items : [];
  const total = cart ? cart.total : 0;
  const enough = wallet !== null && wallet >= total;

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Оформление заказа</p>
          <h1>Корзина и оплата</h1>
          <p className="page-sub">
            Добавляйте и удаляйте товары, меняйте количество, затем подтвердите и оплатите заказ
            с кошелька.
          </p>
        </div>
        <button className="btn btn--ghost" type="button" onClick={function () { setPickerOpen(!pickerOpen); }}>
          <Icon name="cart" size={16} />
          {pickerOpen ? "Скрыть каталог" : "Добавить товар"}
        </button>
      </header>

      {notice ? <p className={"alert alert--" + notice.type}>{notice.text}</p> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}

      {pickerOpen ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Добавить товар</h2>
            <span className="panel__meta">из каталога</span>
          </div>
          <div className="panel__body stack">
            <label className="field">
              <span className="visually-hidden">Поиск товара</span>
              <input
                type="search"
                value={pickerQuery}
                onChange={function (event) { setPickerQuery(event.target.value); }}
                placeholder="Название или категория"
                autoFocus
              />
            </label>
            <ul className="picker-list">
              {matches.map(function (item) {
                const stock = stockLabel(item.stock);
                return (
                  <li className="picker-item" key={item.id}>
                    <img src={item.image_url} alt="" onError={onImageError} />
                    <span className="picker-item__body">
                      <strong>{item.title}</strong>
                      <span className="meta-text">
                        {item.category} · {formatPrice(item.price)} · {stock.text}
                      </span>
                    </span>
                    <button
                      className="btn btn--sm"
                      type="button"
                      onClick={function () { add(item.id); }}
                      disabled={item.stock <= 0}
                    >
                      Добавить
                    </button>
                  </li>
                );
              })}
              {!matches.length ? <li className="drawer__empty">Ничего не нашлось.</li> : null}
            </ul>
          </div>
        </section>
      ) : null}

      {items.length ? (
        <div className="cart-layout">
          <section className="panel">
            <div className="panel__head">
              <h2>Товары в заказе</h2>
              <span className="panel__meta">{cart.count} шт.</span>
            </div>
            <div className="panel__body">
              {items.map(function (item) {
                return (
                  <div className="cart-item" key={item.productId}>
                    <img src={item.image_url} alt={item.title} onError={onImageError} />
                    <div>
                      <Link className="cart-item__title" to={"/product/" + item.productId}>{item.title}</Link>
                      <p className="meta-text">{item.category} · {formatPrice(item.price)} за штуку</p>
                      {item.quantity > item.stock ? (
                        <p className="meta-text" style={{ color: "var(--amber)" }}>На складе только {item.stock} шт.</p>
                      ) : null}
                    </div>
                    <div className="cart-item__side">
                      <span className="price">{formatPrice(item.sum)}</span>
                      <span className="qty">
                        <button type="button" onClick={function () { change(item.productId, item.quantity - 1); }} aria-label="Меньше">−</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={function () { change(item.productId, item.quantity + 1); }} aria-label="Больше">+</button>
                      </span>
                      <button className="btn btn--ghost btn--sm" type="button" onClick={function () { drop(item.productId); }}>
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="panel cart-summary">
            <div className="panel__head"><h2>Итог</h2></div>
            <div className="panel__body stack">
              <dl className="meta-list">
                <div><dt>Позиций</dt><dd>{items.length}</dd></div>
                <div><dt>Товаров</dt><dd>{cart.count}</dd></div>
                <div><dt>Сумма</dt><dd>{formatPrice(total)}</dd></div>
                <div>
                  <dt>Кошелёк</dt>
                  <dd style={{ color: enough ? "var(--green)" : "var(--red)" }}>
                    {wallet === null ? "—" : formatPrice(wallet)}
                  </dd>
                </div>
              </dl>

              <button className="btn btn--ghost btn--block" type="button" onClick={confirmOrder} disabled={confirmed}>
                {confirmed ? "Заказ подтверждён" : "Подтвердить заказ"}
              </button>
              <button className="btn btn--block" type="button" onClick={pay} disabled={busy || !enough}>
                {busy ? "Оплачиваю…" : "Оплатить с кошелька"}
              </button>
              {!enough && wallet !== null ? (
                <p className="meta-text" style={{ color: "var(--amber)" }}>
                  Не хватает {formatPrice(total - wallet)}. Промокоды активируются в профиле.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : (
        <section className="panel">
          <div className="panel__body empty stack">
            <p>В заказе пока ничего нет.</p>
            <div className="actions" style={{ justifyContent: "center" }}>
              <button className="btn" type="button" onClick={function () { setPickerOpen(true); }}>Добавить товар</button>
              <Link className="btn btn--ghost" to="/">Открыть каталог</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
