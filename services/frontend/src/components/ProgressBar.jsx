export default function ProgressBar({ solved, total, percent }) {
  const value = Math.max(0, Math.min(100, Number(percent || 0)));
  return (
    <div className="progress-block">
      <div className="progress-block__top">
        <span className="progress-block__label">Общий прогресс</span>
        <span className="progress-block__value">{value.toFixed(1)}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label="Прогресс прохождения"
      >
        <div className="progress-track__fill" style={{ width: `${value}%` }} />
      </div>
      <p className="progress-block__meta">
        Решено <strong>{solved}</strong> из <strong>{total}</strong> заданий
      </p>
    </div>
  );
}