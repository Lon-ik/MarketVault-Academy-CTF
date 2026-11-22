import { useEffect, useState } from "react";
import { request } from "../api";
import { useAuth } from "../auth";
import { rankFor } from "../game";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState("");

  useEffect(function () {
    request("/api/academy/leaderboard")
      .then(function (data) { setLeaders(data.leaders); })
      .catch(function (err) { setError(err.message); });
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Рейтинг</p>
          <h1>Таблица результатов</h1>
          <p className="page-sub">
            Сортировка по числу решённых заданий. Место не главное: важнее закрыть трек целиком и
            понимать защиту по каждому классу ошибок.
          </p>
        </div>
      </header>

      <section className="panel">
        {error ? <p className="alert alert--error" style={{ margin: 18 }}>{error}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-rank">Место</th>
                <th>Участник</th>
                <th className="col-solved">Решено</th>
                <th>Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map(function (item, index) {
                const rank = rankFor(item.solved);
                const self = user && item.username === user.username;
                return (
                  <tr key={item.username} className={self ? "row--self" : ""}>
                    <td className="col-rank">{String(index + 1).padStart(2, "0")}</td>
                    <td>
                      <span className="leader-name">{item.username}</span>
                      {self ? <span className="you-badge">вы</span> : null}
                      <span className="rank-name">{rank.name}</span>
                    </td>
                    <td className="col-solved">{item.solved}</td>
                    <td>
                      <span className="leader-bar">
                        <span className="progress progress--sm">
                          <span className="progress__fill" style={{ display: "block", width: item.percent + "%" }} />
                        </span>
                        <span>{item.percent.toFixed(1)}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!leaders.length && !error ? (
                <tr>
                  <td className="table-empty" colSpan={4}>Пока нет результатов.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
