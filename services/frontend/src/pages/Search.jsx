import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { request } from "../api";
import ChallengeCard from "../components/ChallengeCard";
import Icon from "../components/Icon";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [value, setValue] = useState(query);
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState("");

  useEffect(function () {
    request("/api/frontend/bootstrap?page=search").catch(function () {});
    request("/api/academy/challenges")
      .then(function (data) { setChallenges(data.challenges); })
      .catch(function (err) { setError(err.message); });
  }, []);

  useEffect(
    function () {
      setValue(query);
    },
    [query]
  );

  const results = useMemo(
    function () {
      const needle = query.trim().toLowerCase();
      if (!needle) return [];
      return challenges.filter(function (item) {
        const haystack = [item.title, item.description, item.service, item.category].join(" ").toLowerCase();
        return haystack.indexOf(needle) !== -1;
      });
    },
    [challenges, query]
  );

  function submit(event) {
    event.preventDefault();
    setParams(value ? { q: value } : {});
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Поиск</p>
          <h1>Поиск по заданиям</h1>
          <p className="page-sub">
            Ищите по названию, описанию, сервису и категории. Например: SQL, SSRF, legacy, XSS.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel__body">
          <form className="actions" onSubmit={submit} style={{ marginBottom: 14 }}>
            <label className="field" style={{ flex: 1, minWidth: 220 }}>
              <span className="visually-hidden">Поисковый запрос</span>
              <input
                value={value}
                onChange={function (event) { setValue(event.target.value); }}
                placeholder="SQL, SSRF, legacy, XSS…"
                aria-label="Поисковый запрос"
              />
            </label>
            <button className="btn" type="submit">
              <Icon name="search" size={16} />
              Найти
            </button>
          </form>

          <div className="search-echo" style={{ color: "var(--ink-2)", fontWeight: 600 }}>
            {query ? "Результаты по запросу «" + query + "»" : "Введите запрос, чтобы отфильтровать задания."}
          </div>
          <p className="meta-text" style={{ marginTop: 4 }}>
            {query ? "Найдено: " + results.length : "Запрос не задан"}
          </p>
        </div>
      </section>

      {error ? <p className="alert alert--error">{error}</p> : null}

      {query ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Задания</h2>
            <span className="panel__meta">{results.length} совпадений</span>
          </div>
          <div className="panel__body">
            {results.length ? (
              <div className="card-grid">
                {results.map(function (challenge) {
                  return <ChallengeCard key={challenge.slug} challenge={challenge} />;
                })}
              </div>
            ) : (
              <div className="empty">
                <p>По этому запросу ничего не нашлось. Попробуйте более общий термин.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
