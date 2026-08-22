import "server-only";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const input = texts.map((text) => text.trim()).filter(Boolean);
  if (input.length === 0) return [];

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    data?: { embedding: number[] }[];
  };

  const vectors = payload.data?.map((item) => item.embedding) ?? [];
  if (vectors.length !== input.length) {
    throw new Error("Embedding response size mismatch.");
  }

  return vectors;
}

export async function embedText(text: string): Promise<number[] | null> {
  if (!embeddingsConfigured()) return null;
  const [vector] = await embedTexts([text]);
  return vector ?? null;
}

export function formatEmbeddingForPg(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
