/** Web Search Tool — BizScope WebMCP 패턴 활용
 *
 * BizScope의 lib/search.ts 패턴을 따름.
 * 에이전트가 자율적으로 웹 검색하여 도메인 지식 수집 (Immersion phase).
 */

import type { AgentTool } from './registry';

async function executeWebSearch(params: Record<string, unknown>): Promise<unknown> {
  const query = params.query as string;
  const maxResults = (params.max_results as number) ?? 5;

  // Google Custom Search API (BizScope와 동일 패턴)
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    // Fallback: API 키 없으면 LLM 내부 지식 활용
    return {
      source: 'llm_knowledge',
      results: [],
      note: 'Web search unavailable — using LLM internal knowledge. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX for live search.',
    };
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(maxResults, 10)));

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { source: 'error', error: `Search API error: ${res.status}` };
  }

  const data = await res.json();
  const results = (data.items ?? []).map((item: any) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }));

  return { source: 'google', results, totalResults: data.searchInformation?.totalResults };
}

export const webSearchTool: AgentTool = {
  name: 'web_search',
  description: 'Search the web for information about a topic. Use this for domain research, finding existing solutions, market analysis, or gathering context during the Immersion phase.',
  parameters: {
    query: { type: 'string', description: 'Search query' },
    max_results: { type: 'number', description: 'Max results (1-10, default 5)' },
  },
  execute: executeWebSearch,
};
