import { readFile } from "node:fs/promises";
import path from "node:path";

export type PromptMeta = {
  name: string;
  version: number;
  purpose: string;
  body: string;
  raw: string;
};

/**
 * Load a versioned prompt markdown file from /prompts.
 * Frontmatter is intentionally simple (key: value lines between ---).
 */
export async function loadPrompt(
  name: string,
  version = 1,
): Promise<PromptMeta> {
  const filePath = path.join(
    process.cwd(),
    "prompts",
    name,
    `v${version}.md`,
  );
  const raw = await readFile(filePath, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Prompt ${name}@v${version} missing frontmatter`);
  }
  const purposeLine = match[1]
    .split("\n")
    .find((line) => line.startsWith("purpose:"));
  const purpose = purposeLine
    ? purposeLine.replace(/^purpose:\s*/, "").trim()
    : "";

  return {
    name,
    version,
    purpose,
    body: match[2].trim(),
    raw,
  };
}
