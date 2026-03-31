---
name: MOL Integration Status
description: MOL(openmolt) ↔ CGB 연동 현황 — 연결됨 but CGB 쪽 수정 필요
type: project
---

# MOL ↔ CGB 연동 현황

## 완료 (MOL 쪽)
- ✅ BrainClient.js — CGB REST API 래퍼 (research, brainstorm, evaluate, addToGraph, searchGraph)
- ✅ BrainEvolution.js — brain_config 초기 산출 (archetype × Big Five) + HR 진화 + 경험치
- ✅ brain_config JSONB — 366명 초기화 완료
- ✅ /brain/status API — CGB 연결 상태 확인
- ✅ AgentLifecycle + TaskWorker — 에이전트 활동 시 BrainClient.addToGraph() 호출 (non-blocking)
- ✅ HR 평가 → brain_config 자동 진화

## 미완료 (CGB 쪽 수정 필요)
- ❌ CGB API가 agent_id/layer/domain 파라미터를 안 받음
- ❌ InMemory graph → 배포 시 날아감 (Supabase pgvector 전환 필요)
- ❌ 검색이 토큰 매칭 → 벡터 임베딩 필요
- ❌ SIMILAR_TO 스파게티 → 임베딩 cosine > 0.8로 변경 필요
- ❌ Agent 노드 미구현 → 최상위 노드로 추가 필요
- ❌ Temporal Edge (4-timestamp) 미구현

## MOL BrainClient가 보내는 파라미터
```js
// addToGraph 호출 시
{
  type: "Idea",
  title: "...",
  description: "...",
  agent_id: "uuid",    // CGB에서 무시됨 → 지원 필요
  domain: "tech",      // CGB에서 무시됨 → 지원 필요
  layer: 2             // CGB에서 무시됨 → 지원 필요
}
```

## 연결 정보
- CGB 프로덕션: https://cgb-brain-lemon.vercel.app
- 인증: Authorization: Bearer <CREATIVEGRAPH_API_KEY>
- 티어: team (마스터키로 전체 접근)
- MOL 환경변수: CGB_API_URL, CGB_API_KEY (.env.local)

## Graph v2 설계 문서
→ `docs/memory/graph-v2-migration.md` 참조
