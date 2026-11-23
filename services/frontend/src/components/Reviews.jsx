import { useState } from "react";
import { request } from "../api";
import Icon from "./Icon";

function rating(score) {
  const value = Math.max(0, Math.min(5, Number(score) || 0));
  return "★".repeat(value) + "☆".repeat(5 - value);
}

export default function Reviews({ productId, reviews, onChange }) {
  const [votes, setVotes] = useState({});
  const [form, setForm] = useState({ body: "", score: 5 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function vote(review, kind) {
    setError("");
    try {
      const data = await request(
        "/api/products/" + productId + "/reviews/" + review.id + "/vote",
        { method: "POST", body: JSON.stringify({ vote: kind }) }
      );
      setVotes(function (previous) {
        return Object.assign({}, previous, {
          [review.id]: { likes: data.likes, dislikes: data.dislikes, voted: true },
        });
      });
    } catch (err) {
      if (err.message === "already voted") {
        setVotes(function (previous) {
          return Object.assign({}, previous, { [review.id]: { voted: true } });
        });
        setError("Вы уже голосовали за этот отзыв.");
      } else {
        setError(err.message);
      }
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await request("/api/products/" + productId + "/reviews", {
        method: "POST",
        body: JSON.stringify({ rating: Number(form.score), body: form.body }),
      });
      setForm({ body: "", score: 5 });
      setNotice("Отзыв опубликован от имени " + data.author + ".");
      if (onChange) onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel reviews" id="reviews">
      <div className="panel__head">
        <h2>Отзывы</h2>
        <span className="panel__meta">{reviews.length}</span>
      </div>

      <div className="panel__body stack">
        {reviews.length ? (
          <ul className="review-list">
            {reviews.map(function (review) {
              const local = votes[review.id] || {};
              const shown = {
                likes: local.likes === undefined ? review.likes : local.likes,
                dislikes: local.dislikes === undefined ? review.dislikes : local.dislikes,
              };
              const voted = Boolean(local.voted || review.voted);
              return (
                <li className="review" key={review.id}>
                  <div className="review__head">
                    <strong>{review.author}</strong>
                    <span className="review__stars" title={"Оценка " + review.rating + " из 5"}>
                      {rating(review.rating)}
                    </span>
                    <span className="meta-text">{new Date(review.created_at).toLocaleDateString("ru-RU")}</span>
                    {voted ? <span className="chip chip--solved">ваш голос учтён</span> : null}
                  </div>
                  <p className="review__body">{review.body}</p>
                  <div className="vote-row">
                    <button
                      className="vote-btn"
                      type="button"
                      disabled={voted}
                      onClick={function () { vote(review, "like"); }}
                    >
                      <Icon name="thumbUp" size={15} />
                      <span>Лайк</span>
                      <span className="vote-btn__count">{shown.likes}</span>
                    </button>
                    <button
                      className="vote-btn"
                      type="button"
                      disabled={voted}
                      onClick={function () { vote(review, "dislike"); }}
                    >
                      <Icon name="thumbDown" size={15} />
                      <span>Дизлайк</span>
                      <span className="vote-btn__count">{shown.dislikes}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty"><p>Отзывов пока нет. Будьте первым.</p></div>
        )}

        <form className="review-form stack" onSubmit={submit}>
          <h3>Оставить отзыв</h3>
          <label className="field">
            <span>Оценка</span>
            <select
              value={form.score}
              onChange={function (event) { setForm(Object.assign({}, form, { score: event.target.value })); }}
            >
              {[5, 4, 3, 2, 1].map(function (value) {
                return <option key={value} value={value}>{rating(value)}</option>;
              })}
            </select>
          </label>
          <label className="field">
            <span>Текст отзыва</span>
            <textarea
              value={form.body}
              onChange={function (event) { setForm(Object.assign({}, form, { body: event.target.value })); }}
              placeholder="Что понравилось, что нет"
              rows={3}
              required
            />
          </label>
          {notice ? <p className="alert alert--success">{notice}</p> : null}
          {error ? <p className="alert alert--error">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Публикую…" : "Опубликовать отзыв"}
          </button>
        </form>
      </div>
    </section>
  );
}
