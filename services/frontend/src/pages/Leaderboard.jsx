import { useEffect, useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";
import { rankFor } from "../game";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    request("/api/academy/leaderboard")
      .then((data) => setLeaders(data.leaders))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__text">
          <p className="kicker">ranking</p>
          <h1>Таблица лидеров</h1>
          <p className="page-subtitle">Сортировка по количеству решённых заданий.</p>
        </div>
      </header>

      <section className="panel">
        {error ? <p className="alert alert--error">{error}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th>Оператор</th>
                <th className="col-solved">Решено</th>
                <th>Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((item, index) => (
                <tr
                  key={item.username}
                  className={`${item.username === user?.username ? "row--self" : ""} ${
                    index < 3 ? `row--top row--top-${index + 1}` : ""
                  }`}
                >
                  <td className="col-rank">{String(index + 1).padStart(2, "0")}</td>
                  <td>
                    <span className="leader-name">{item.username}</span>
                    {item.username === user?.username ? <span className="you-badge">you</span> : null}
                    <span className="rank-name">{rankFor(item.solved).name}</span>
                  </td>
                  <td className="col-solved">{item.solved}</td>
                  <td>
                    <div className="leader-progress">
                      <span className="leader-progress__track">
                        <span style={{ width: `${item.percent}%` }} />
                      </span>
                      <span className="leader-progress__value">{item.percent.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!leaders.length && !error ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    Нет данных для отображения.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}