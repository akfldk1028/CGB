/** 목업 그래프 데이터 — 뇌 뉴런처럼 유기적으로 퍼지는 클러스터 구조
 *
 * 이전: 완전 랜덤 연결 → 뭉쳐서 구조 안 보임
 * 현재: Domain→Topic→Idea→Concept 계층적 허브-스포크 + 교차 영감
 */

import type { Graph3DData, Graph3DNode, Graph3DLink } from '@/types/graph';
import { NODE_STYLES, getEdgeStyle } from '@/config/graph-styles';

/** 도메인별 데이터 시드 */
const DOMAINS = [
  {
    name: 'AI & Machine Learning',
    topics: ['Natural Language Processing', 'Computer Vision', 'Reinforcement Learning'],
    ideas: [
      'AI 요리 비서', '코드 리뷰 봇', '자연어 SQL 변환기',
      '자동 번역 파이프라인', '감정 분석 대시보드', '자동 테스트 생성',
    ],
    concepts: ['Transfer Learning', 'Attention Mechanism', 'RAG', 'Fine-tuning', 'Chain of Thought'],
  },
  {
    name: 'Creative Design',
    topics: ['Generative Art', 'UX Innovation', 'Brand Strategy'],
    ideas: [
      '음악 생성 에이전트', '3D 모델 생성기', 'AR 인테리어 설계',
      '패션 추천 엔진', 'SNS 콘텐츠 생성', '실시간 자막 생성',
    ],
    concepts: ['Diffusion Models', 'Style Transfer', 'Prompt Engineering', 'Multi-modal'],
  },
  {
    name: 'Business & Finance',
    topics: ['FinTech', 'Market Analysis', 'Automation'],
    ideas: [
      '스마트 일정 관리', '주식 분석 봇', '법률 문서 분석',
      '건강 추적 AI', '교육 커리큘럼 AI', '게임 NPC 대화',
    ],
    concepts: ['Knowledge Graph', 'Embeddings', 'GAN', 'Reinforcement Learning'],
  },
];

function makeId(type: string, domain: number, idx: number) {
  return `${type}-d${domain}-${idx}`;
}

export function generateMockGraph(nodeCount = 80, _edgeCount?: number): Graph3DData {
  const nodes: Graph3DNode[] = [];
  const links: Graph3DLink[] = [];
  const ideaIds: string[] = [];

  for (let d = 0; d < DOMAINS.length; d++) {
    const domain = DOMAINS[d];
    const domainId = makeId('domain', d, 0);

    // Domain 허브 노드
    nodes.push({
      id: domainId,
      name: domain.name,
      type: 'Domain',
      val: NODE_STYLES.Domain.size + 4,
      color: NODE_STYLES.Domain.color,
    });

    // Topics — Domain에서 뻗어나감
    for (let t = 0; t < domain.topics.length; t++) {
      const topicId = makeId('topic', d, t);
      nodes.push({
        id: topicId,
        name: domain.topics[t],
        type: 'Topic',
        val: NODE_STYLES.Topic.size + Math.random() * 3,
        color: NODE_STYLES.Topic.color,
      });
      links.push(makeLink(topicId, domainId, 'BELONGS_TO'));

      // Ideas — Topic에서 뻗어나감 (2개씩)
      const ideaStart = t * 2;
      for (let i = ideaStart; i < Math.min(ideaStart + 2, domain.ideas.length); i++) {
        const ideaId = makeId('idea', d, i);
        nodes.push({
          id: ideaId,
          name: domain.ideas[i],
          type: 'Idea',
          val: NODE_STYLES.Idea.size + Math.random() * 5,
          color: NODE_STYLES.Idea.color,
          score: Math.floor(45 + Math.random() * 55),
          method: ['SCAMPER', 'Brainstorming', '4Is', 'TRIZ'][Math.floor(Math.random() * 4)],
        });
        links.push(makeLink(ideaId, topicId, 'ADDRESSES_TOPIC'));
        ideaIds.push(ideaId);

        // 같은 토픽 내 아이디어끼리 SIMILAR_TO (약한 연결)
        if (i > ideaStart) {
          links.push(makeLink(ideaId, makeId('idea', d, i - 1), 'SIMILAR_TO'));
        }
      }
    }

    // Concepts — 도메인 전체에 걸치는 개념 노드
    for (let c = 0; c < domain.concepts.length; c++) {
      const conceptId = makeId('concept', d, c);
      nodes.push({
        id: conceptId,
        name: domain.concepts[c],
        type: 'Concept',
        val: NODE_STYLES.Concept.size + Math.random() * 2,
        color: NODE_STYLES.Concept.color,
      });
      // 2-3개 아이디어와 연결
      const connCount = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < connCount && k < domain.ideas.length; k++) {
        const targetIdx = Math.floor(Math.random() * domain.ideas.length);
        links.push(makeLink(makeId('idea', d, targetIdx), conceptId, 'USES_CONCEPT'));
      }
    }
  }

  // 교차 도메인 영감 (cross-pollination) — 소수의 먼 연결
  const crossCount = Math.min(8, Math.floor(ideaIds.length * 0.15));
  for (let i = 0; i < crossCount; i++) {
    const srcIdx = Math.floor(Math.random() * ideaIds.length);
    let tgtIdx = Math.floor(Math.random() * ideaIds.length);
    while (tgtIdx === srcIdx || ideaIds[srcIdx].split('-')[1] === ideaIds[tgtIdx].split('-')[1]) {
      tgtIdx = Math.floor(Math.random() * ideaIds.length);
    }
    links.push(makeLink(ideaIds[srcIdx], ideaIds[tgtIdx], 'INSPIRED_BY'));
  }

  // Iteration 체인 — 일부 아이디어에서 진화
  const iterCount = Math.min(5, Math.floor(ideaIds.length * 0.1));
  for (let i = 0; i < iterCount; i++) {
    const parentId = ideaIds[Math.floor(Math.random() * ideaIds.length)];
    const iteratedId = `iter-${Date.now()}-${i}`;
    nodes.push({
      id: iteratedId,
      name: `Iteration #${i + 1}`,
      type: 'Idea',
      val: NODE_STYLES.Idea.size + 3,
      color: '#FFA726', // 약간 다른 금색
      score: Math.floor(70 + Math.random() * 30),
      method: 'iteration',
    });
    links.push(makeLink(iteratedId, parentId, 'ITERATED_FROM'));
    ideaIds.push(iteratedId);
  }

  // Artifact (최종 산출물) — 상위 아이디어에서
  for (let i = 0; i < 3; i++) {
    const artifactId = `artifact-${i}`;
    const sourceIdea = ideaIds[Math.floor(Math.random() * Math.min(6, ideaIds.length))];
    nodes.push({
      id: artifactId,
      name: `Final Output #${i + 1}`,
      type: 'Artifact',
      val: NODE_STYLES.Artifact.size + 2,
      color: NODE_STYLES.Artifact.color,
      score: Math.floor(85 + Math.random() * 15),
    });
    links.push(makeLink(artifactId, sourceIdea, 'DERIVED_FROM'));
  }

  // Session 노드 — 2개
  for (let i = 0; i < 2; i++) {
    const sessionId = `session-${i}`;
    nodes.push({
      id: sessionId,
      name: `Session ${i + 1}`,
      type: 'Session',
      val: NODE_STYLES.Session.size,
      color: NODE_STYLES.Session.color,
    });
    // 랜덤 아이디어 3개에 연결
    for (let k = 0; k < 3; k++) {
      const target = ideaIds[Math.floor(Math.random() * ideaIds.length)];
      links.push(makeLink(target, sessionId, 'PRODUCED_IN'));
    }
  }

  return { nodes: nodes.slice(0, nodeCount), links };
}

function makeLink(source: string, target: string, type: string): Graph3DLink {
  const style = getEdgeStyle(type);
  return {
    source,
    target,
    type,
    color: style.color,
    width: style.width,
    curvature: 0.1 + Math.random() * 0.3, // 곡선 — 뇌 시냅스 느낌
    particles: style.particles,
    particleSpeed: style.particleSpeed,
  };
}

/** 수업 예시 기반 시드 데이터 (Iteration 체인: Raimondi→Manet→Picasso) */
export const SEED_ITERATION_CHAIN: Graph3DData = {
  nodes: [
    { id: 'art-1', name: 'Judgement of Paris (Raimondi, 1515)', type: 'Idea', val: 8, color: NODE_STYLES.Idea.color, description: 'Original engraving — classical composition' },
    { id: 'art-2', name: 'Dejeuner sur l\'Herbe (Manet, 1863)', type: 'Idea', val: 12, color: NODE_STYLES.Idea.color, description: 'Adapted classical composition to modern setting', score: 95 },
    { id: 'art-3', name: 'Pastoral Concert (Giorgione, 1510)', type: 'Idea', val: 7, color: NODE_STYLES.Idea.color, description: 'Venetian pastoral — also inspired Manet' },
    { id: 'art-4', name: 'Dejeuner sur l\'Herbe (Picasso, 1961)', type: 'Idea', val: 11, color: NODE_STYLES.Idea.color, description: 'Cubist reinterpretation', score: 92 },
    { id: 'art-5', name: 'Dejeuner sur l\'Herbe (Deandrea, 1982)', type: 'Idea', val: 8, color: NODE_STYLES.Idea.color, description: 'Hyperrealist sculpture — 3D medium' },
    { id: 'art-6', name: 'New Luncheon (Ron English, 1994)', type: 'Idea', val: 7, color: NODE_STYLES.Idea.color, description: 'Pop art parody with cultural commentary' },
    { id: 'art-7', name: 'YSL Advertisement', type: 'Artifact', val: 13, color: NODE_STYLES.Artifact.color, description: 'Fashion industry appropriation', score: 88 },
    { id: 'concept-iter', name: 'Iteration (Creative Theory)', type: 'Concept', val: 5, color: NODE_STYLES.Concept.color },
    { id: 'domain-art', name: 'Fine Art', type: 'Domain', val: 16, color: NODE_STYLES.Domain.color },
  ],
  links: [
    { source: 'art-2', target: 'art-1', type: 'ITERATED_FROM', ...linkStyle('ITERATED_FROM'), curvature: 0.2 },
    { source: 'art-2', target: 'art-3', type: 'INSPIRED_BY', ...linkStyle('INSPIRED_BY'), curvature: 0.3 },
    { source: 'art-4', target: 'art-2', type: 'ITERATED_FROM', ...linkStyle('ITERATED_FROM'), curvature: 0.15 },
    { source: 'art-5', target: 'art-2', type: 'ITERATED_FROM', ...linkStyle('ITERATED_FROM'), curvature: 0.25 },
    { source: 'art-6', target: 'art-2', type: 'ITERATED_FROM', ...linkStyle('ITERATED_FROM'), curvature: 0.35 },
    { source: 'art-7', target: 'art-2', type: 'DERIVED_FROM', ...linkStyle('DERIVED_FROM'), curvature: 0.2 },
    { source: 'art-1', target: 'concept-iter', type: 'USES_CONCEPT', ...linkStyle('USES_CONCEPT'), curvature: 0.15 },
    { source: 'art-1', target: 'domain-art', type: 'BELONGS_TO', ...linkStyle('BELONGS_TO'), curvature: 0.1 },
    { source: 'art-2', target: 'domain-art', type: 'BELONGS_TO', ...linkStyle('BELONGS_TO'), curvature: 0.1 },
  ],
};

function linkStyle(type: string) {
  const s = getEdgeStyle(type);
  return { color: s.color, width: s.width, particles: s.particles, particleSpeed: s.particleSpeed };
}
