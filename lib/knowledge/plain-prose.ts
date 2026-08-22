/**
 * Light cleanup for chat answers that may include Markdown lists/tables.
 * Keeps bold (**heading**), bullets, numbered lists, and pipe tables.
 * Strips italic, code, # headings, links, and common deck/PDF chrome.
 * Preserves numeric citations like [1].
 */
export function sanitizeLightMarkdown(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u2014/g, " - ") // em dash
    .replace(/\u2013/g, "-") // en dash
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```\w*\n?/, "").replace(/\n?```$/, ""),
    )
    .replace(/`([^`]+)`/g, "$1")
    // Italic *text* but not list markers at line start; leave **bold** alone
    .replace(/(?<!^|\n)\*(?!\*)(?!\s)([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    // Deck / PDF chrome that models sometimes paste through
    .replace(/^[^\n]*Confidential\s*&\s*Proprietary[^\n]*$/gim, "")
    .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}[^\n]*$/gm, "")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** @deprecated Prefer sanitizeLightMarkdown - kept for call-site compatibility. */
export function toPlainProse(text: string): string {
  return sanitizeLightMarkdown(text);
}

/** Collect unique 1-based citation numbers present in prose. */
export function extractCitationNumbers(text: string, maxIndex: number): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1]);
    if (Number.isInteger(n) && n >= 1 && n <= maxIndex) {
      found.add(n);
    }
  }
  return [...found].sort((a, b) => a - b);
}
