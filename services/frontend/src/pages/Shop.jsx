import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../api";
import { formatPrice, onImageError, stockLabel } from "../shop";
import Icon from "../components/Icon";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [category, setCategory] = useState("all");
  const [shop, setShop] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(function () {
    let active = true;
    request("/api/products")
      .then(function (data) {
        if (!active) return;
        setProducts(data.products);
        setCategories(data.categories);
      })
      .catch(function (err) {
        if (active) setError(err.message);
      });
    request("/api/shops")
      .then(function (data) {
        if (active) setShops(data.shops);
      })
      .catch(function () {});
    return function () {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    function () {
      const needle = query.trim().toLowerCase();
      return products.filter(function (item) {
        if (category !== "all" && item.category !== category) return false;
        if (shop !== "all" && (!item.shop || String(item.shop.id) !== String(shop))) return false;
        if (!needle) return true;
        const haystack = item.title + " " + item.description + " " + (item.shop ? item.shop.title : "");
        return haystack.toLowerCase().indexOf(needle) !== -1;
      });
    },
    [products, category, shop, query]
  );

  return (
    <div className="page">
      <section className="shop-hero">
        <div>
          <p className="eyebrow">MarketVault Store</p>
          <h1>Электроника с доставкой за день</h1>
          <p className="page-sub">
            Смартфоны, ноутбуки, наушники, умные часы и роутеры. Гарантия 24 месяца,
            возврат в течение 14 дней.
          </p>
        </div>
        <div className="shop-hero__stats">
          <div className="stat"><span>Товаров</span><strong>{products.length}</strong></div>
          <div className="stat"><span>Магазинов</span><strong>{shops.length}</strong></div>
          <div className="stat"><span>Доставка</span><strong style={{ fontSize: 15 }}>1 день</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Магазины</h2>
          <span className="panel__meta">{shops.length} продавцов</span>
        </div>
        <div className="panel__body">
          <div className="shop-grid">
            <button
              className={shop === "all" ? "shop-card is-active" : "shop-card"}
              type="button"
              onClick={function () { setShop("all"); }}
            >
              <strong>Все магазины</strong>
              <span className="meta-text">{products.length} товаров</span>
            </button>
            {shops.map(function (item) {
              return (
                <button
                  key={item.id}
                  className={String(shop) === String(item.id) ? "shop-card is-active" : "shop-card"}
                  type="button"
                  onClick={function () { setShop(String(item.id)); }}
                >
                  <strong>{item.title}</strong>
                  <span className="meta-text">@{item.owner} · {item.products} товаров</span>
                  <span className="shop-card__desc">{item.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="shop-toolbar">
          <label className="field field--grow">
            <span className="visually-hidden">Поиск по каталогу</span>
            <input
              type="search"
              value={query}
              onChange={function (event) { setQuery(event.target.value); }}
              placeholder="Поиск по каталогу"
            />
          </label>
          <div className="chip-row">
            <button
              className={category === "all" ? "chip chip--brand" : "chip"}
              type="button"
              onClick={function () { setCategory("all"); }}
            >
              Все
            </button>
            {categories.map(function (item) {
              return (
                <button
                  key={item}
                  className={category === item ? "chip chip--brand" : "chip"}
                  type="button"
                  onClick={function () { setCategory(item); }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel__body">
          {error ? <p className="alert alert--error">{error}</p> : null}
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map(function (item) {
                const stock = stockLabel(item.stock);
                return (
                  <Link className="product-card" to={"/product/" + item.id} key={item.id}>
                    <span className="product-card__media">
                      <img src={item.image_url} alt={item.title} onError={onImageError} loading="lazy" />
                      <span className={"stock-badge stock-badge--" + stock.tone}>{stock.text}</span>
                    </span>
                    <span className="product-card__body">
                      <span className="product-card__tags">
                        <span className="chip chip--service">{item.category}</span>
                        {item.shop ? <span className="chip">{item.shop.title}</span> : null}
                      </span>
                      <strong className="product-card__title">{item.title}</strong>
                      <span className="product-card__desc">{item.description}</span>
                      <span className="product-card__foot">
                        <span className="price">{formatPrice(item.price)}</span>
                        <span className="product-card__more">
                          Подробнее <Icon name="chevron" size={14} />
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty"><p>Ничего не нашлось. Измените запрос или категорию.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}
