const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;

export default function LinkedText({ children }) {
  const text = String(children || "");
  const parts = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(
      <a
        key={`${match.index}-${match[2]}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary-container break-words"
      >
        {match[1]}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? parts : text;
}
