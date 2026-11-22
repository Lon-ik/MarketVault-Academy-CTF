import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { request } from "../api";
import { useAuth } from "../auth";
import { rankFor, scoreFor } from "../game";
import { trackProgress } from "../guidance";
import { TRACKS } from "../learn";
import Icon from "./Icon";
import Instructor from "./Instructor";

const NAV = [
  {
    label: "Обучение",
    items: [
      { to: "/", label: "Задания", icon: "dashboard", end: true },
      { to: "/path", label: "Учебный план", icon: "path" },
      { to: "/leaderboard", label: "Рейтинг", icon: "leaderboard" },
    ],
  },
  {
    label: "Стенд",
    items: [
      { to: "/search", label: "Поиск", icon: "search" },
      { to: "/support", label: "Поддержка", icon: "support" },
      { to: "/checkout", label: "Оформление заказа", icon: "checkout" },
    ],
  },
  {
    label: "Аккаунт",
    items: [{ to: "/profile", label: "Профиль", icon: "profile" }],
  },
];

const TOP_NAV = [
  { to: "/", label: "Задания", end: true },
  { to: "/path", label: "Учебный план" },
  { to: "/leaderboard", label: "Рейтинг" },
  { to: "/search", label: "Поиск" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hud, setHud] = useState(null);

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
              <small>Security Academy</small>
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
                    </NavLink>
                  );
                })}
              </div>
            );
          })}

          {hud ? (
            <div className="sidebar__group">
              <p className="sidebar__label">Учебные треки</p>
              {TRACKS.map(function (track) {
                const info = trackProgress(track, hud.challenges);
                const done = info.total > 0 && info.solved === info.total;
                return (
                  <NavLink
                    key={track.id}
                    to={"/track/" + track.id}
                    className="side-link"
                  >
                    <Icon
                      name={done ? "check" : "target"}
                      className="side-link__icon"
                      size={15}
                    />
                    <span>{track.title}</span>
                    <span className="side-link__count">
                      {info.solved}/{info.total}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}

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
                <span>
                  {hud.solved} из {hud.total}
                </span>
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

      <Instructor challenges={hud ? hud.challenges : []} />

      <footer className="site-footer">
        <span>MarketVault Academy</span>
        <span>·</span>
        <span>учебный стенд с намеренными уязвимостями</span>
        <span>·</span>
        <span>не подключайте реальные данные</span>
      </footer>
    </div>
  );
}
