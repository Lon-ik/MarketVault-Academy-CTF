import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { request } from "../api";
import ChallengeCard from "../components/ChallengeCard";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [value, setValue] = useState(query);
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    request("/api/frontend/bootstrap?page=search").catch(() => {});
    request("/api/academy/challenges")
      .then((data) => setChallenges(data.challenges))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setValue(query);
  }, [query]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return challenges.filter((item) =>
      [item.title, item.description, item.service, item.category]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [challenges, query]);

  function submit(event) {
    event.preventDefault();
    setParams(value ? { q: value } : {});
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__text">
          <p className="kicker">search</p>
          <h1>Поиск по заданиям</h1>
          <p className="page-subtitle">Фильтрация по названию, описанию, сервису и категории.</p>
        </div>
      </header>

      <section className="panel search-panel">
        <form className="search-form" onSubmit={submit}>
          <label className="search-form__field">
            <span className="visually-hidden">Поисковый запрос</span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="SQL, SSRF, legacy, XSS…"
              aria-label="Поисковый запрос"
            />
          </label>
          <button className="button" type="submit">
            Найти
          </button>
        </form>
        <div
          className="search-echo"
          dangerouslySetInnerHTML={{ __html: query ? `Результаты для «${query}»` : "Введите запрос" }}
        />
        <div className="search-summary">
          <span className="section-label">Совпадения</span>
          <span className="meta-text">{query ? `${results.length} найдено` : "запрос не задан"}</span>
        </div>
        {error ? <p className="alert alert--error">{error}</p> : null}
      </section>

      {query ? (
        <section className="panel">
          <div className="panel__header">
            <h2>Missions</h2>
            <span className="panel__meta">{results.length} found</span>
          </div>
          {results.length ? (
            <div className="mission-grid">
              {results.map((challenge) => (
                <ChallengeCard key={challenge.slug} challenge={challenge} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>По запросу ничего не найдено.</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}