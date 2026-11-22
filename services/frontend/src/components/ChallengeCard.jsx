import { Link } from "react-router-dom";
import { pointsFor } from "../game";
import { serviceMeta } from "../guidance";
import Icon from "./Icon";
import Stars from "./Stars";

export default function ChallengeCard({ challenge, showService = true }) {
  const solved = Boolean(challenge.is_solved);
  const meta = serviceMeta(challenge.service);
  const text = challenge.description || "";

  return (
    <article className={solved ? "mission-card is-solved" : "mission-card"}>
      <div className="mission-card__top">
        {showService ? <span className="chip chip--service">{meta.short}</span> : null}
        <span className="chip">{challenge.category}</span>
        {solved ? (
          <span className="chip chip--solved" style={{ marginLeft: "auto" }}>
            <Icon name="check" size={13} />
            Решено
          </span>
        ) : null}
      </div>

      <Link className="mission-card__title" to={"/challenge/" + challenge.slug}>
        {challenge.title}
      </Link>

      <p className="mission-card__desc">
        {text.length > 120 ? text.slice(0, 120).trimEnd() + "…" : text}
      </p>

      <div className="mission-card__foot">
        <Stars difficulty={challenge.difficulty} />
        <span className="spacer" />
        {challenge.hints_used ? (
          <span title="Открыто подсказок">{challenge.hints_used} подск.</span>
        ) : null}
        <span className="mission-card__xp">{pointsFor(challenge)} XP</span>
      </div>
    </article>
  );
}
