const LEVELS = { easy: 1, medium: 2, hard: 3 };

export const DIFFICULTY_TEXT = { easy: "easy", medium: "medium", hard: "hard" };

export default function Stars({ difficulty, showLabel = false }) {
  const level = LEVELS[difficulty] || 1;
  const label = DIFFICULTY_TEXT[difficulty] || difficulty;
  return (
    <span className={"stars stars--" + difficulty} title={"Сложность: " + label}>
      {[1, 2, 3].map(function (index) {
        return <i key={index} className={index <= level ? "is-on" : ""} />;
      })}
      <span className="visually-hidden">Сложность: {label}</span>
      {showLabel ? <span style={{ marginLeft: 6, fontSize: 12.5 }}>{label}</span> : null}
    </span>
  );
}
