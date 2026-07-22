/**
 * Turns a Static Page's plain-text `content` (entered through the
 * existing Admin CMS Textarea — see StaticPagesManager.tsx) into a
 * readable article layout, automatically — Checkpoint 06 (final
 * Static Pages / Public Pages CMS task): "Do not force the admin to
 * manually create HTML or code just to make the page readable."
 *
 * No markdown library, no new dependency, no schema change: this is a
 * small, self-contained line/blank-line parser applied purely at
 * render time. Every value rendered goes through plain JSX text nodes
 * (React escapes them automatically), so this is safe by construction
 * — never `dangerouslySetInnerHTML`.
 *
 * Supported authoring conventions (all optional — plain paragraphs
 * work with zero markup):
 *   - Blank line   -> paragraph break
 *   - "# heading"  -> a level-2 heading
 *   - "## heading" -> a level-3 heading
 *   - "- item" / "* item" (one per line, grouped) -> a bullet list
 *   - a single "\n" inside a paragraph -> a line break, not a new
 *     paragraph (matches how the homepage's own hero copy already
 *     treats single newlines — see homepage-render.ts's
 *     escapeWithLineBreaks)
 */

function renderInlineBreaks(text: string, keyPrefix: string) {
  return text.split("\n").map((line, i, arr) => (
    <span key={`${keyPrefix}-${i}`}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

export function PublicPageContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="space-y-5 text-[15px] leading-loose text-text-700 sm:text-base">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((l) => l.trim());
        const key = `block-${index}`;

        const isList = lines.every((line) => /^[-*]\s+/.test(line));
        if (isList) {
          return (
            <ul key={key} className="list-disc space-y-2 pe-5">
              {lines.map((line, i) => (
                <li key={`${key}-${i}`}>{line.replace(/^[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        if (lines.length === 1) {
          const h3 = lines[0]!.match(/^##\s+(.*)/);
          if (h3) {
            return (
              <h3 key={key} className="font-display text-lg font-bold text-navy-950 sm:text-xl">
                {h3[1]}
              </h3>
            );
          }
          const h2 = lines[0]!.match(/^#\s+(.*)/);
          if (h2) {
            return (
              <h2 key={key} className="font-display text-xl font-extrabold text-navy-950 sm:text-2xl">
                {h2[1]}
              </h2>
            );
          }
        }

        return <p key={key}>{renderInlineBreaks(block, key)}</p>;
      })}
    </div>
  );
}
