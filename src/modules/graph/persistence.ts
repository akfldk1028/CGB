/** JSON file persistence for in-memory graph store
 *
 * Fallback when Memgraph is not connected.
 * Saves/loads memoryStore to/from data/graph-store.json.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getMemoryStore, loadMemoryStore } from '../agents/tools/graph-tools';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'graph-store.json');

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced auto-save — 3 second delay after last mutation */
export function scheduleAutoSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToFile().catch((err) => {
      console.error('[persistence] auto-save failed:', err);
    });
  }, 3000);
}

/** Write current memoryStore to data/graph-store.json */
export async function saveToFile(): Promise<void> {
  const store = getMemoryStore();
  await mkdir(DATA_DIR, { recursive: true });
  const json = JSON.stringify(store, null, 2);
  await writeFile(STORE_FILE, json, 'utf-8');
}

/** Load data/graph-store.json into memoryStore */
export async function loadFromFile(): Promise<void> {
  try {
    const raw = await readFile(STORE_FILE, 'utf-8');
    const data = JSON.parse(raw) as { nodes?: unknown[]; edges?: unknown[] };
    const nodes = Array.isArray(data.nodes) ? data.nodes as Parameters<typeof loadMemoryStore>[0] : [];
    const edges = Array.isArray(data.edges) ? data.edges as Parameters<typeof loadMemoryStore>[1] : [];
    loadMemoryStore(nodes, edges);
    console.log(`[persistence] loaded ${nodes.length} nodes, ${edges.length} edges from ${STORE_FILE}`);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('[persistence] no existing store file, starting empty');
      return;
    }
    console.error('[persistence] failed to load store:', err);
  }
}
