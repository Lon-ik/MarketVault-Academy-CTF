import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { request } from "../api";
import { useAuth } from "../auth";
import { countItems, loadCart, onCartChange } from "../cart";
import { rankFor, scoreFor } from "../game";
import { toggleTheme } from "../theme";
import ChallengesDrawer from "./ChallengesDrawer";
import Icon from "./Icon";
import Instructor from "./Instructor";

const NAV = [
  {
    label: "Магазин",
    items: [
      { to: "/", label: "Витрина", icon: "box", end: true },
      { to: "/search", label: "Поиск", icon: "search" },
      { to: "/checkout", label: "Корзина и оплата", icon: "cart", badge: true },
      { to: "/support", label: "Поддержка", icon: "support" },
    ],
  },
  {
    label: "Аккаунт",
    items: [
      { to: "/profile", label: "Профиль и кошелёк", icon: "profile" },
    ],
  },
];

const TOP_NAV = [
  { to: "/", label: "Витрина", end: true },
  { to: "/search", label: "Поиск" },
  { to: "/support", label: "Поддержка" },
  { to: "/checkout", label: "Корзина" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hud, setHud] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [theme, setTheme] = useState(function () {
    return document.documentElement.dataset.theme || "light";
  });

  useEffect(
    function () {
      setMenuOpen(false);
    },
    [location.pathname]
  );

  useEffect(
    function () {
      let active = true;
      function load() {
        Promise.all([request("/api/academy/challenges"), request("/api/academy/progress")])
          .then(function (data) {
            if (!active) return;
            setHud({
              challenges: data[0].challenges,
              score: scoreFor(data[0].challenges),
              solved: data[1].solved,
              total: data[1].total,
              rank: rankFor(data[1].solved),
            });
          })
          .catch(function () {});
      }
      load();
      const handler = function () { load(); };
      window.addEventListener("mv:progress-changed", handler);
      return function () {
        active = false;
        window.removeEventListener("mv:progress-changed", handler);
      };
    },
    []
  );

  useEffect(function () {
    let active = true;
    function refresh() {
      loadCart()
        .then(function (cart) {
          if (active) setCartCount(countItems(cart));
        })
        .catch(function () {});
    }
    refresh();
    const unsubscribe = onCartChange(refresh);
    return function () {
      active = false;
      unsubscribe();
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = String((user && user.username) || "mv").slice(0, 2).toUpperCase();
  const percent = hud && hud.total ? (hud.solved / hud.total) * 100 : 0;

  return (
    <div className={menuOpen ? "shell shell--menu" : "shell"}>
      <header className="topbar">
        <div className="topbar__inner">
          <button
            className="topbar__burger"
            type="button"
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={function () { setMenuOpen(!menuOpen); }}
          >
            <Icon name="menu" size={18} />
          </button>

          <NavLink className="brand" to="/">
            <img className="brand__mark" src="/mark.png" alt="MarketVault Academy" width="30" height="30" />
            <span className="brand__text">
              <strong>MarketVault</strong>
              <small>Store</small>
            </span>
          </NavLink>

          <nav className="topbar__nav" aria-label="Основная навигация">
            {TOP_NAV.map(function (item) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={function (state) {
                    return state.isActive ? "topnav-link is-active" : "topnav-link";
                  }}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="topbar__right">
            <button
              className="topbar-icon"
              type="button"
              onClick={function () { setTheme(toggleTheme(theme)); }}
              aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>

            <button
              className="topbar-icon"
              type="button"
              onClick={function () { setDrawerOpen(true); }}
              aria-label="Прогресс и задания"
              title={"Прогресс: " + (hud ? hud.solved + " из " + hud.total : "—")}
            >
              <Icon name="scoreboard" size={18} />
              {hud && hud.solved ? <span className="topbar-icon__badge">{hud.solved}</span> : null}
            </button>

            <NavLink className="topbar-icon" to="/checkout" aria-label="Корзина" title="Корзина и оплата">
              <Icon name="cart" size={18} />
              {cartCount ? <span className="topbar-icon__badge">{cartCount}</span> : null}
            </NavLink>

            {hud ? (
              <span className="xp-chip" title="Очки за решённые задания">
                <strong>{hud.score}</strong>
                <span>XP</span>
              </span>
            ) : null}
            {hud ? <span className="rank-chip">{hud.rank.name}</span> : null}

            <NavLink className="user-chip" to="/profile">
              <span className="user-chip__avatar">{initials}</span>
              <span>
                {user && user.username}
                <br />
                <small>{user && user.role}</small>
              </span>
            </NavLink>
          </div>
        </div>
      </header>

      <div className="shell__body">
        {menuOpen ? (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Закрыть меню"
            onClick={function () { setMenuOpen(false); }}
          />
        ) : null}

        <aside className="sidebar">
          {NAV.map(function (group) {
            return (
              <div className="sidebar__group" key={group.label}>
                <p className="sidebar__label">{group.label}</p>
                {group.items.map(function (item) {
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={function (state) {
                        return state.isActive ? "side-link is-active" : "side-link";
                      }}
                    >
                      <Icon name={item.icon} className="side-link__icon" />
                      <span>{item.label}</span>
                      {item.badge && cartCount ? (
                        <span className="side-link__count">{cartCount}</span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}

          <div className="sidebar__group">
            <p className="sidebar__label">Обучение</p>
            <button className="side-link" type="button" onClick={function () { setDrawerOpen(true); }}>
              <Icon name="scoreboard" className="side-link__icon" />
              <span>Задания и прогресс</span>
              {hud ? <span className="side-link__count">{hud.solved}/{hud.total}</span> : null}
            </button>
          </div>

          {hud ? (
            <div className="sidebar__agent">
              <div className="agent-card__row">
                <span>Прогресс</span>
                <span>{hud.total ? Math.round(percent) : 0}%</span>
              </div>
              <div className="progress progress--sm" style={{ marginTop: 8 }}>
                <div className="progress__fill" style={{ width: percent + "%" }} />
              </div>
              <div className="agent-card__meta">
                <span>{hud.solved} из {hud.total}</span>
                <span>{hud.rank.next ? "до " + hud.rank.next + ": " + hud.rank.toNext : "максимум"}</span>
              </div>
            </div>
          ) : null}

          <button className="side-link" type="button" onClick={handleLogout} style={{ marginTop: 16, width: "100%" }}>
            <Icon name="logout" className="side-link__icon" />
            <span>Выйти</span>
          </button>
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <ChallengesDrawer
        open={drawerOpen}
        onClose={function () { setDrawerOpen(false); }}
        challenges={hud ? hud.challenges : []}
        progress={hud}
      />

      <Instructor challenges={hud ? hud.challenges : []} />

      <footer className="site-footer">
        <span>MarketVault Store</span>
        <span>·</span>
        <span>учебный стенд с намеренными уязвимостями</span>
        <span>·</span>
        <span>не подключайте реальные данные</span>
      </footer>
    </div>
  );
}
