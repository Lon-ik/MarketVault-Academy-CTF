import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { instructorFor } from "../guidance";
import Icon from "./Icon";

export default function Instructor({ challenges }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(
    function () {
      setOpen(false);
    },
    [location.pathname]
  );

  const slug = location.pathname.startsWith("/challenge/")
    ? location.pathname.slice("/challenge/".length)
    : "";
  const challenge = (challenges || []).find(function (item) {
    return item.slug === slug;
  });
  const info = instructorFor(challenge, challenges);

  if (!open) {
    return (
      <button
        className="instructor instructor--collapsed"
        type="button"
        onClick={function () { setOpen(true); }}
      >
        <span className="instructor__toggle">
          <span className="instructor__dot" />
          <span>Инструктор</span>
        </span>
      </button>
    );
  }

  return (
    <aside className="instructor" aria-label="Инструктор">
      <button
        className="instructor__toggle"
        type="button"
        onClick={function () { setOpen(false); }}
      >
        <span className="instructor__dot" />
        <span>Инструктор</span>
        <span className="spacer" />
        <Icon name="close" size={15} />
      </button>

      <div className="instructor__body">
        <h4>{info.headline}</h4>

        {(info.lines || []).map(function (line, index) {
          return <p key={index}>{line}</p>;
        })}

        {info.checklist ? (
          <ol className="learn-list">
            {info.checklist.map(function (step, index) {
              return <li key={index}>{step}</li>;
            })}
          </ol>
        ) : null}

        {info.tools && info.tools.length ? (
          <div className="tag-row">
            {info.tools.map(function (tool) {
              return <span className="chip" key={tool}>{tool}</span>;
            })}
          </div>
        ) : null}

        {info.defense ? (
          <ul className="learn-list">
            {info.defense.map(function (item, index) {
              return <li key={index}>{item}</li>;
            })}
          </ul>
        ) : null}

        {info.action ? (
          <Link className="btn btn--sm" to={info.action.to}>
            {info.action.label}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
