/** Sentence / paragraph boundary helpers for chunking and excerpts. */

const SENTENCE_END = /[.!?]["')\]]*(?:\s+|$)/g;

function lastBoundaryIndex(slice: string): number {
  // Prefer paragraph, then sentence end, then newline, then word.
  const para = slice.lastIndexOf("\n\n");
  if (para > 0) return para + 2;

  let lastSentence = -1;
  const re = new RegExp(SENTENCE_END.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(slice)) !== null) {
    lastSentence = match.index + match[0].length;
  }
  if (lastSentence > 0) return lastSentence;

  const nl = slice.lastIndexOf("\n");
  if (nl > 0) return nl + 1;

  const space = slice.lastIndexOf(" ");
  if (space > 0) return space + 1;

  return -1;
}

function nextBoundaryStart(text: string, from: number): number {
  if (from <= 0) return 0;
  if (from >= text.length) return text.length;

  // Already at a clean start (after whitespace following sentence end / paragraph).
  const atStart =
    from === 0 ||
    /\n\n\s*$/.test(text.slice(Math.max(0, from - 4), from)) ||
    /[.!?]["')\]]*\s+$/.test(text.slice(Math.max(0, from - 4), from));
  if (atStart) {
    let i = from;
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    return i;
  }

  // Skip forward to the next sentence or paragraph start.
  const rest = text.slice(from);
  const para = rest.indexOf("\n\n");
  const re = new RegExp(SENTENCE_END.source);
  const sentence = re.exec(rest);

  const candidates: number[] = [];
  if (para >= 0) candidates.push(from + para + 2);
  if (sentence) candidates.push(from + sentence.index + sentence[0].length);

  if (candidates.length === 0) {
    const space = rest.search(/\s/);
    return space >= 0 ? from + space + 1 : from;
  }

  let next = Math.min(...candidates);
  while (next < text.length && /\s/.test(text[next]!)) next += 1;
  return next;
}

/**
 * Clip text so it starts and ends on a sentence or paragraph boundary.
 * Used for hover excerpts so we never mid-cut a word or sentence.
 */
export function clipToSentenceBounds(
  text: string,
  options: { maxChars?: number } = {},
): string {
  const maxChars = options.maxChars ?? 600;
  let normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  // If the chunk starts mid-sentence (lowercase / continuation), drop the fragment.
  if (/^[a-z]/.test(normalized) || /^,\s*/.test(normalized)) {
    const dropped = nextBoundaryStart(normalized, 1);
    if (dropped > 0 && dropped < normalized.length * 0.5) {
      normalized = normalized.slice(dropped).trim();
    }
  }

  if (normalized.length <= maxChars) {
    // Trim a trailing partial sentence only when we know we truncated upstream.
    return normalized;
  }

  const head = normalized.slice(0, maxChars);
  const breakAt = lastBoundaryIndex(head);
  if (breakAt > maxChars * 0.35) {
    return normalized.slice(0, breakAt).trim();
  }

  // Fallback: last whitespace so we at least avoid mid-word.
  const space = head.lastIndexOf(" ");
  return (space > 0 ? head.slice(0, space) : head).trim();
}

/** Split text into overlapping chunks that start/end on sentence or paragraph bounds. */
export function chunkText(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): string[] {
  const maxChars = options.maxChars ?? 1200;
  const overlap = options.overlap ?? 150;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + maxChars, normalized.length);
    let end = hardEnd;

    if (hardEnd < normalized.length) {
      const slice = normalized.slice(start, hardEnd);
      const breakAt = lastBoundaryIndex(slice);
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt;
      } else {
        // Avoid mid-word even when no sentence boundary is found.
        const space = slice.lastIndexOf(" ");
        if (space > maxChars * 0.4) end = start + space + 1;
      }
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;

    // Overlap, then snap forward to the next sentence/paragraph start.
    const overlapped = Math.max(0, end - overlap);
    const nextStart = nextBoundaryStart(normalized, overlapped);
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}
