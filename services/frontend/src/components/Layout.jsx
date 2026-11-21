import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { request } from "../api";
import { useAuth } from "../auth";
import { rankFor, scoreFor } from "../game";

const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  leaderboard: (
    <>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-6" />
    </>
  ),
  support: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m6 6 3 3M18 6l-3 3M6 18l3-3M18 18l-3-3" />
    </>
  ),
  checkout: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="m15 8 4 4-4 4" />
      <path d="M19 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
};

function Icon({ name, size = 16 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

const navGroups = [
  {
    label: "Range",
    items: [
      { to: "/", label: "Mission board", icon: "dashboard", end: true },
      { to: "/search", label: "Поиск", icon: "search" },
      { to: "/leaderboard", label: "Scoreboard", icon: "leaderboard" },
    ],
  },
  {
    label: "Lab",
    items: [
      { to: "/support", label: "Поддержка", icon: "support" },
      { to: "/checkout", label: "Checkout", icon: "checkout" },
    ],
  },
  {
    label: "Agent",
    items: [{ to: "/profile", label: "Профиль", icon: "profile" }],
  },
];

const routeTitles = {
  "/": "Mission board",
  "/search": "Поиск",
  "/leaderboard": "Scoreboard",
  "/support": "Поддержка",
  "/checkout": "Checkout",
  "/profile": "Профиль",
};

function currentTitle(pathname) {
  if (pathname.startsWith("/challenge/")) return "Mission briefing";
  return routeTitles[pathname] || "MarketVault";
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hud, setHud] = useState(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    let active = true;
    function load() {
      Promise.all([request("/api/academy/challenges"), request("/api/academy/progress")])
        .then(([catalog, progress]) => {
          if (!active) return;
          setHud({
            score: scoreFor(catalog.challenges),
            solved: progress.solved,
            total: progress.total,
            rank: rankFor(progress.solved),
          });
        })
        .catch(() => {});
    }
    load();
    const handler = () => load();
    window.addEventListener("mv:progress-changed", handler);
    return () => {
      active = false;
      window.removeEventListener("mv:progress-changed", handler);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = (user?.username || "mv").slice(0, 2).toUpperCase();

  return (
    <div className={menuOpen ? "app-shell app-shell--menu" : "app-shell"}>
      <aside className="sidebar" aria-label="Основная навигация">
        <div className="sidebar__brand">
          <span className="brand-mark">MV</span>
          <span className="brand-text">
            <strong>MarketVault</strong>
            <small>Academy // Range</small>
          </span>
        </div>

        <nav className="sidebar__nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? "nav-item is-active" : "nav-item")}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {hud ? (
          <div className="agent-card">
            <div className="agent-card__head">
              <span className="agent-card__label">agent status</span>
              <span className="agent-card__rank">{hud.rank.name}</span>
            </div>
            <div className="agent-card__score">
              <strong>{hud.score}</strong>
              <span>XP</span>
            </div>
            <div className="progress-track progress-track--xs">
              <div
                className="progress-track__fill"
                style={{ width: `${hud.total ? (hud.solved / hud.total) * 100 : 0}%` }}
              />
            </div>
            <div className="agent-card__meta">
              <span>
                {hud.solved}/{hud.total} missions
              </span>
              <span>{hud.rank.next ? `next: ${hud.rank.next}` : "max rank"}</span>
            </div>
          </div>
        ) : null}

        <div className="sidebar__footer">
          <div className="sidebar__session">
            <span className="avatar">{initials}</span>
            <span className="sidebar__identity">
              <strong>{user?.username}</strong>
              <small>{user?.role}</small>
            </span>
            <span className="status-dot" title="Сессия активна" />
          </div>
          <button className="sidebar__logout" type="button" onClick={handleLogout}>
            <Icon name="logout" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Закрыть навигацию"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <header className="topbar">
          <button
            className="menu-button"
            type="button"
            aria-label="Открыть навигацию"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name="menu" size={18} />
          </button>
          <div className="topbar__crumb">
            <span className="topbar__root">MarketVault Range</span>
            <span className="topbar__sep">/</span>
            <span className="topbar__current">{currentTitle(location.pathname)}</span>
          </div>
          <div className="topbar__right">
            {hud ? (
              <span className="hud-chip" title="Текущий счёт">
                <span>XP</span>
                <strong>{hud.score}</strong>
              </span>
            ) : null}
            <span className="env-badge">
              <span className="status-dot" />
              isolated
            </span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>

        <footer className="site-footer">
          <span>MarketVault Academy</span>
          <span className="site-footer__sep">/</span>
          <span>cyber range // isolated</span>
        </footer>
      </div>
    </div>
  );
}