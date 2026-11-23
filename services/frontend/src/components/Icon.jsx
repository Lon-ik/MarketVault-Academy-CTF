const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  path: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.4 6H14a3 3 0 0 1 3 3v3.6" />
      <path d="M15.6 18H10a3 3 0 0 1-3-3V8.4" />
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
      <path d="M4 20V11" />
      <path d="M12 20V4" />
      <path d="M20 20v-6" />
    </>
  ),
  support: (
    <>
      <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  checkout: (
    <>
      <path d="M3 5h2.2l2 11h11" />
      <path d="M6.5 8h13l-1.6 6H7.6" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17.5" cy="19.5" r="1.4" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.4l2.2 11.5h10.6" />
      <path d="M6.2 7.5h13.3l-1.7 6.2H7.5" />
      <circle cx="9.5" cy="19.6" r="1.5" />
      <circle cx="17" cy="19.6" r="1.5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.6" />
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
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 5h11l-2 3.5L17 12H6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  tools: (
    <>
      <path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6L21 13l-8 8-2-2 8-8z" />
      <path d="M12.5 4.5 9 8l-4-1 1 4-3.5 3.5 3 3L9 14l4 1-1-4 3.5-3.5z" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  scoreboard: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10" />
      <path d="M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10" />
      <path d="M12 13v4M9 20h6" />
    </>
  ),
  thumbUp: (
    <>
      <path d="M7 20h9.2a3 3 0 0 0 2.9-2.3l1-4.4A2 2 0 0 0 18.2 11H14l.6-3.2A2.2 2.2 0 0 0 12.4 5L7 11z" />
      <path d="M7 11v9H4.5V11z" />
    </>
  ),
  thumbDown: (
    <>
      <path d="M7 4h9.2a3 3 0 0 1 2.9 2.3l1 4.4A2 2 0 0 1 18.2 13H14l.6 3.2A2.2 2.2 0 0 1 12.4 19L7 13z" />
      <path d="M7 13V4H4.5v9z" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18" />
      <circle cx="16.5" cy="14.8" r="1.2" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2z" />
      <path d="M4 7.2 12 11l8-3.8M12 11v10" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
};

export default function Icon({ name, size = 17, className }) {
  const path = PATHS[name] || PATHS.info;
  return (
    <svg
      className={className || "icon"}
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
      {path}
    </svg>
  );
}
