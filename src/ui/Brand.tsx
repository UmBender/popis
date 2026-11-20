const WORDS = ["Practice", "Of", "Problem-solving", "In", "Sprints"] as const;

/** App name with the acronym spelled out below it (docs/architecture/Shell.md). */
export function Brand() {
  return (
    <div className="brand">
      <h1>POPIS</h1>
      <p className="muted brand-acronym" data-testid="brand-acronym">
        {WORDS.map((word, i) => (
          <span key={word}>
            {i > 0 ? " " : ""}
            <strong>{word.charAt(0)}</strong>
            {word.slice(1)}
          </span>
        ))}
      </p>
    </div>
  );
}
