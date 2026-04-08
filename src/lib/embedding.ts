/** Jina v3 Embedding — 768차원 벡터 생성 (Gemini → Jina 전환)
 *
 * 이전: Gemini text-embedding-004 ($0.15/1M tokens)
 * 현재: Jina v3 ($0.018/1M tokens) — 88% 절감
 *
 * - 768d (pgvector 호환, Matryoshka로 커스텀 차원 지원)
 * - 100+ 언어, 한국어 지원
 * - 8192 토큰 입력 제한
 * - Fallback: Gemini (Jina 키 없을 때)
 *
 * Graph v2 검색에 사용: cosine similarity via pgvector.
 */

const JINA_KEY = process.env.JINA_API_KEY ?? '';
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '';

const JINA_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = 'jina-embeddings-v3';
const EMBED_DIM = 768; // pgvector 호환

// Gemini fallback URLs
const GEMINI_MODEL = 'text-embedding-004';
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent`;
const GEMINI_BATCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents`;

export type Embedding = number[];

/** 단일 텍스트 임베딩 */
export async function embed(text: string): Promise<Embedding> {
  if (!text.trim()) return new Array(EMBED_DIM).fill(0);

  // Jina v3 primary
  if (JINA_KEY) {
    return embedJina(text);
  }

  // Gemini fallback
  if (GEMINI_KEY) {
    return embedGemini(text);
  }

  throw new Error('No embedding API key set (JINA_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)');
}

/** 배치 임베딩 */
export async function embedBatch(texts: string[]): Promise<Embedding[]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await embed(texts[0])];

  if (JINA_KEY) {
    return embedBatchJina(texts);
  }

  if (GEMINI_KEY) {
    return embedBatchGemini(texts);
  }

  throw new Error('No embedding API key set');
}

// ─── Jina v3 ───

async function embedJina(text: string): Promise<Embedding> {
  const res = await fetch(JINA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_KEY}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: [text.slice(0, 8192)],
      dimensions: EMBED_DIM,
      task: 'text-matching',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jina embed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.data?.[0]?.embedding as Embedding;
}

async function embedBatchJina(texts: string[]): Promise<Embedding[]> {
  const results: Embedding[] = [];

  // Jina batch limit ~2048 inputs, but be conservative
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100).map(t => t.slice(0, 8192));
    const res = await fetch(JINA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JINA_KEY}`,
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: batch,
        dimensions: EMBED_DIM,
        task: 'text-matching',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jina batchEmbed: ${res.status} ${err}`);
    }

    const data = await res.json();
    for (const item of data.data ?? []) {
      results.push(item.embedding as Embedding);
    }
  }

  return results;
}

// ─── Gemini fallback ───

async function embedGemini(text: string): Promise<Embedding> {
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_MODEL}`,
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

async function embedBatchGemini(texts: string[]): Promise<Embedding[]> {
  const requests = texts.map((text) => ({
    model: `models/${GEMINI_MODEL}`,
    content: { parts: [{ text: text.slice(0, 2048) }] },
  }));

  const results: Embedding[] = [];
  for (let i = 0; i < requests.length; i += 100) {
    const batch = requests.slice(i, i + 100);
    const res = await fetch(`${GEMINI_BATCH_URL}?key=${GEMINI_KEY}`, {
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
