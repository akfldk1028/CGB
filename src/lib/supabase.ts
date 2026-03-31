/** Supabase REST client — fetch 기반, @supabase/supabase-js 불필요
 *
 * graph_nodes / graph_edges 테이블 전용.
 * PostgREST API + RPC (graph_hybrid_search, graph_bfs_neighbors) 호출.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL) console.warn('[supabase] SUPABASE_URL not set');

/** PostgREST query helper */
export async function supabaseRest<T = unknown>(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: string;
    body?: unknown;
    headers?: Record<string, string>;
    single?: boolean;
  } = {},
): Promise<T> {
  const { method = 'GET', query = '', body, headers = {}, single = false } = options;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;

  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} ${text}`);
  }

  if (res.status === 204) return (single ? null : []) as T;

  const data = await res.json();
  return single ? data[0] ?? null : data;
}

/** Supabase RPC call (graph_hybrid_search, graph_bfs_neighbors 등) */
export async function supabaseRpc<T = unknown>(
  fn: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase RPC ${fn}: ${res.status} ${text}`);
  }

  return res.json();
}
