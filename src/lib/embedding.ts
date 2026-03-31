/** Gemini text-embedding-004 — 768차원 벡터 생성
 *
 * Graph v2 검색에 사용: cosine similarity via pgvector.
 * 배치 임베딩 지원 (최대 100개/요청).
 */

const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '';
const MODEL = 'text-embedding-004';
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`;
const BATCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`;

export type Embedding = number[];

/** 단일 텍스트 임베딩 */
export async function embed(text: string): Promise<Embedding> {
  if (!GEMINI_KEY) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
  if (!text.trim()) return new Array(768).fill(0);

  const res = await fetch(`${EMBED_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text: text.slice(0, 2048) }] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.embedding.values as Embedding;
}

/** 배치 임베딩 (최대 100개) */
export async function embedBatch(texts: string[]): Promise<Embedding[]> {
  if (!GEMINI_KEY) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await embed(texts[0])];

  const requests = texts.map((text) => ({
    model: `models/${MODEL}`,
    content: { parts: [{ text: text.slice(0, 2048) }] },
  }));

  // Gemini batch limit = 100
  const results: Embedding[] = [];
  for (let i = 0; i < requests.length; i += 100) {
    const batch = requests.slice(i, i + 100);
    const res = await fetch(`${BATCH_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: batch }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini batchEmbed: ${res.status} ${err}`);
    }

    const data = await res.json();
    for (const emb of data.embeddings) {
      results.push(emb.values as Embedding);
    }
  }

  return results;
}

/** 텍스트 결합 (title + description → 임베딩 입력) */
export function toEmbedText(title: string, description?: string): string {
  return description ? `${title}. ${description}` : title;
}
