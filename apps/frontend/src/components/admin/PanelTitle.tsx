/** A brief letter reveal with one uninterrupted text alternative for screen readers. */
export function PanelTitle({ text }: { text: string }) {
  const interval = Math.min(18, 260 / Math.max(Array.from(text).length - 1, 1));

  return (
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text.matchAll(/\S+|\s+/gu)).map((match) => {
          const word = match[0];
          if (/^\s+$/.test(word)) return word;
          const offset = Array.from(text.slice(0, match.index)).length;
          return (
            <span key={match.index} className="inline-block">
              {Array.from(word).map((letter, letterIndex) => (
                <span key={letterIndex} className="fw-panel-letter inline-block" style={{ animationDelay: `${Math.round((offset + letterIndex) * interval)}ms` }}>{letter}</span>
              ))}
            </span>
          );
        })}
      </span>
    </span>
  );
}
