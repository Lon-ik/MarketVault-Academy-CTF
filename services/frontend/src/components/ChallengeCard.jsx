import { Link } from "react-router-dom";
import { pointsFor, serviceCode } from "../game";
import Pips from "./Pips";

export default function ChallengeCard({ challenge, showService = true }) {
  const solved = Boolean(challenge.is_solved);
  const points = pointsFor(challenge);

  return (
    <article className={`mission-card ${solved ? "is-solved" : "is-open"}`}>
      <div className="mission-card__top">
        <span className={`mission-state ${solved ? "is-solved" : ""}`}>
          <span className="mission-state__dot" />
          {solved ? "solved" : "open"}
        </span>
        <span className="mission-card__xp">{points} XP</span>
      </div>

      <Link className="mission-card__title" to={`/challenge/${challenge.slug}`}>
        {challenge.title}
      </Link>

      <p className="mission-card__meta">
        {showService ? (
          <>
            <span className="service-name">{serviceCode(challenge.service)}</span>
            <span className="meta-sep">/</span>
          </>
        ) : null}
        <span>{challenge.category}</span>
      </p>

      <p className="mission-card__desc">
        {solved
          ? challenge.description.slice(0, 120)
          : "Условие откроется на странице задания."}
      </p>

      <div className="mission-card__foot">
        <span className="mission-card__difficulty">
          <Pips difficulty={challenge.difficulty} />
          <span>{challenge.difficulty}</span>
        </span>
        <span className="mission-card__hints">
          {challenge.hints_used ? `${challenge.hints_used} hints` : "no hints"}
        </span>
        <Link
          className="mission-card__open"
          to={`/challenge/${challenge.slug}`}
          aria-label={`Открыть задание ${challenge.title}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </article>
  );
}