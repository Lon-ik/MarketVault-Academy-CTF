const LEVELS = { easy: 1, medium: 2, hard: 3 };

export default function Pips({ difficulty }) {
  const level = LEVELS[difficulty] || 1;
  return (
    <span className={`pips pips--${difficulty}`} aria-label={`Сложность: ${difficulty}`}>
      {[1, 2, 3].map((index) => (
        <i key={index} className={index <= level ? "is-on" : ""} />
      ))}
    </span>
  );
}