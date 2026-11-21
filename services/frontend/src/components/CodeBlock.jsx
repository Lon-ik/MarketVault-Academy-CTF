export default function CodeBlock({ title, code }) {
  if (!code) return null;
  return (
    <div className="code-block">
      {title ? <div className="code-block__title">{title}</div> : null}
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}