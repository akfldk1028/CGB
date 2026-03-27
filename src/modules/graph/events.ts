/** Graph Event System — 이벤트 드리븐 자율 에이전트 트리거
 *
 * 핵심 원칙: "에이전트가 24시간 도는 게 아니라, 이벤트가 에이전트를 깨운다"
 *
 * 근거:
 * - Confluent: "The Future of AI Agents Is Event-Driven"
 * - AWS: Event-Driven Architecture for Agentic AI
 * - Stanford Generative Agents (Park et al., UIST 2023)
 *
 * 이벤트 흐름:
 * graph_add_node() → emit('node:created') → handler: measureNovelty + suggestRelated
 */

import { EventEmitter } from 'events';
import { calculateNoveltyInMemory } from './queries/novelty';
import { getMemoryStore } from '../agents/tools/graph-tools';
import { scheduleAutoSave } from './persistence';

// ── Event Bus Singleton ──

const graphEvents = new EventEmitter();
graphEvents.setMaxListeners(20);

export type GraphEventType = 'node:created' | 'edge:created' | 'session:completed';

export interface NodeCreatedEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  method?: string;
}

export interface EdgeCreatedEvent {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface SessionCompletedEvent {
  sessionId: string;
  topic: string;
  domain: string;
  nodesCreated: number;
  edgesCreated: number;
}

// ── Handlers ──

/** 노드 생성 시 → 자동 novelty score 태깅 */
function handleNodeCreated(event: NodeCreatedEvent): void {
  const store = getMemoryStore();
  const edges = store.edges.map((e) => ({ source: e.source, target: e.target }));
  const novelty = calculateNoveltyInMemory(event.id, edges);

  // store에서 해당 노드 찾아서 score 업데이트
  const node = store.nodes.find((n) => n.id === event.id);
  if (node) {
    node.score = novelty;
  }
}

/** 노드 생성 시 → 유사 노드 자동 연결 (SIMILAR_TO) */
function handleSuggestRelated(event: NodeCreatedEvent): void {
  const store = getMemoryStore();
  const titleTokens = event.title.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  if (titleTokens.length === 0) return;

  const related = store.nodes.filter((n) => {
    if (n.id === event.id) return false;
    const nTitle = n.title.toLowerCase();
    const matchCount = titleTokens.filter((t) => nTitle.includes(t)).length;
    return matchCount >= Math.max(1, Math.floor(titleTokens.length * 0.3));
  });

  // 상위 3개만 SIMILAR_TO 엣지 자동 생성
  let edgesAdded = 0;
  for (const rel of related.slice(0, 3)) {
    // 이미 엣지가 있으면 스킵
    const exists = store.edges.some(
      (e) =>
        (e.source === event.id && e.target === rel.id) ||
        (e.source === rel.id && e.target === event.id)
    );
    if (exists) continue;

    store.edges.push({
      id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      source: event.id,
      target: rel.id,
      type: 'SIMILAR_TO',
      createdAt: new Date().toISOString(),
    });
    edgesAdded++;
  }

  if (edgesAdded > 0) {
    scheduleAutoSave();
  }
}

// ── Register Handlers ──

graphEvents.on('node:created', (event: NodeCreatedEvent) => {
  try {
    handleNodeCreated(event);
    handleSuggestRelated(event);
  } catch (err) {
    console.error('[graph/events] handler error:', err);
  }
});

// ── Public API ──

export function emitNodeCreated(event: NodeCreatedEvent): void {
  graphEvents.emit('node:created', event);
}

export function emitEdgeCreated(event: EdgeCreatedEvent): void {
  graphEvents.emit('edge:created', event);
}

export function emitSessionCompleted(event: SessionCompletedEvent): void {
  graphEvents.emit('session:completed', event);
}

export { graphEvents };
