import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { request } from "../api";
import { addToCart } from "../cart";
import Icon from "../components/Icon";
import Reviews from "../components/Reviews";
import { formatPrice, onImageError, stockLabel } from "../shop";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);
  const [result, setResult] = useState(null);
  const [cartNotice, setCartNotice] = useState("");

  function loadReviews() {
    return request("/api/products/" + id + "/reviews")
      .then(function (data) { setReviews(data.reviews); })
      .catch(function () {});
  }

  useEffect(function () {
    let active = true;
    request("/api/products/" + id)
      .then(function (data) {
        if (active) setProduct(data);
      })
      .catch(function (err) {
        if (active) setError(err.message);
      });
    loadReviews();
    return function () {
      active = false;
    };
  }, [id]);

  async function toCart() {
    setCartNotice("");
    setResult(null);
    try {
      const cart = await addToCart(Number(id), 1);
      setCartNotice("Товар добавлен в корзину. Товаров в заказе: " + cart.count + ".");
    } catch (err) {
      setResult({ ok: false, text: err.message });
    }
  }

  async function buy() {
    setBuying(true);
    setResult(null);
    try {
      const data = await request("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ productId: Number(id), quantity: 1 }),
      });
      setResult({ ok: true, text: "Заказ №" + data.orderId + " оформлен. Остаток на складе: " + data.stock + " шт." });
      setProduct(function (previous) {
        return Object.assign({}, previous, { stock: data.stock });
      });
    } catch (err) {
      setResult({ ok: false, text: err.message === "out of stock" ? "Товар закончился." : err.message });
    } finally {
      setBuying(false);
    }
  }

  if (error && !product) {
    return (
      <div className="page">
        <div className="panel center-panel">
          <div className="panel__body stack">
            <h1>Товар не найден</h1>
            <p className="muted">{error}</p>
            <Link className="btn btn--ghost" to="/">Вернуться в каталог</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="loading-screen">Загружаю товар…</div>;
  }

  const stock = stockLabel(product.stock);
  const specs = Object.entries(product.specs || {});

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Навигация">
        <Link to="/">Каталог</Link>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span>{product.title}</span>
      </nav>

      <div className="product-detail">
        <div className="product-detail__media">
          <img src={product.image_url} alt={product.title} onError={onImageError} />
        </div>

        <div className="product-detail__info">
          <span className="chip chip--service">{product.category}</span>
          <h1>{product.title}</h1>
          <p className="page-sub">{product.description}</p>
          <p className={"stock-badge stock-badge--" + stock.tone}>{stock.text}</p>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="meta-text">
            {product.shop ? "Магазин: " + product.shop.title + " (@" + product.seller + ")" : "Продавец: " + product.seller}
          </p>
          <div className="buy-row">
            <button className="btn btn--ghost" type="button" onClick={toCart} disabled={!product.stock}>
              <Icon name="cart" size={16} />
              В корзину
            </button>
            <button className="btn" type="button" onClick={buy} disabled={buying || !product.stock}>
              {buying ? "Оформляю…" : "Купить сейчас"}
            </button>
          </div>
          {cartNotice ? <p className="alert alert--success">{cartNotice}</p> : null}
          {result ? (
            <p className={"alert alert--" + (result.ok ? "success" : "error")}>{result.text}</p>
          ) : null}
        </div>

        <aside className="panel product-detail__specs">
          <div className="panel__head"><h2>Характеристики</h2></div>
          <div className="panel__body">
            <dl className="meta-list">
              {specs.map(function (entry) {
                return (
                  <div key={entry[0]}>
                    <dt>{entry[0]}</dt>
                    <dd>{String(entry[1])}</dd>
                  </div>
                );
              })}
              <div>
                <dt>Магазин</dt>
                <dd>{product.shop ? product.shop.title : "—"}</dd>
              </div>
              <div>
                <dt>Продавец</dt>
                <dd>@{product.seller}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Reviews productId={id} reviews={reviews} onChange={loadReviews} />
    </div>
  );
}
