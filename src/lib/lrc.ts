export type ParsedLyricLine = {
  timeMs: number;
  text: string;
  order: number;
};

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

// Parses standard LRC lyrics ("[mm:ss.xx] line text"), including lines
// carrying multiple timestamp tags (each becomes its own line at that
// time). Lines without any timestamp are skipped, since sync is the
// whole point of this format. Returns lines sorted by time.
export function parseLrc(source: string): ParsedLyricLine[] {
  const lines: ParsedLyricLine[] = [];
  let order = 0;

  for (const rawLine of source.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIMESTAMP)];
    if (matches.length === 0) continue;

    const text = rawLine.replace(TIMESTAMP, "").trim();

    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ?? "0";
      const fractionMs = Math.round(Number(`0.${fraction}`) * 1000);
      const timeMs = minutes * 60_000 + seconds * 1000 + fractionMs;
      lines.push({ timeMs, text, order: order++ });
    }
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs || a.order - b.order);
}

/** Reformat stored lyric lines back into LRC text, for editing. */
export function toLrc(lines: { timeMs: number; text: string }[]): string {
  return lines
    .map((l) => `[${formatLrcTimestamp(l.timeMs)}] ${l.text}`)
    .join("\n");
}

function formatLrcTimestamp(timeMs: number): string {
  const totalCentiseconds = Math.round(timeMs / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}
