/** Story Structure — Hero's Journey + 3-Act Structure (슬라이드 19-21)
 *
 * 학술 근거: Campbell, J. (1949). The Hero with a Thousand Faces.
 * 수업자료 섹션 5: "Structuring your story — Universal Themes"
 *
 * 아이디어를 내러티브 구조로 포장하면 설득력이 높아짐.
 * AI 에이전트가 생성한 아이디어에 스토리 프레임을 입히는 기능.
 */

import { llmGenerateJSON } from '@/modules/llm/client';
import { JSON_INSTRUCTION, CREATIVE_SYSTEM_PROMPT } from '../prompts/system';

/** Hero's Journey 5단계 (수업자료 슬라이드 19) */
export interface HeroJourney {
  departure: string;      // 출발: 현재 상태, 문제 인식
  conflict: string;       // 갈등/투쟁: 핵심 도전
  understanding: string;  // 이해/승리: 해결의 실마리
  realization: string;    // 깨달음: 근본적 통찰
  return: string;         // 귀환: 변화된 세계
}

/** 3-Act Structure (수업자료 슬라이드 20) */
export interface ThreeActStructure {
  beginning: string;      // 시작: 설정, 맥락
  tension: string;        // 긴장/갈등: 문제 고조
  climax: string;         // 절정/해결: 핵심 솔루션
  end: string;            // 결말: 임팩트, 변화
}

/** 아이디어를 Hero's Journey로 포장 */
export async function narrativizeHeroJourney(
  idea: { title: string; description: string },
  domain: string
): Promise<HeroJourney> {
  const prompt = `Apply the Hero's Journey narrative structure to this idea.
This makes the idea more compelling and persuasive by framing it as a story.

Idea: "${idea.title}" — ${idea.description}
Domain: "${domain}"

The Hero's Journey (Campbell, 1949 / Digital Creativity lecture):
1. Departure: The hero leaves the ordinary world (current problem state)
2. Conflict/Struggle: The hero faces challenges (core obstacles)
3. Understanding/Victory: The hero gains insight (solution breakthrough)
4. Realization: Deep transformation occurs (fundamental insight)
5. Return: The hero returns, changed (new reality with the solution)

${JSON_INSTRUCTION}

Format:
{
  "departure": "...",
  "conflict": "...",
  "understanding": "...",
  "realization": "...",
  "return": "..."
}`;

  return llmGenerateJSON<HeroJourney>({
    prompt,
    system: CREATIVE_SYSTEM_PROMPT,
    maxTokens: 1024,
  });
}

/** 아이디어를 3-Act Structure로 포장 */
export async function narrativizeThreeAct(
  idea: { title: string; description: string },
  domain: string
): Promise<ThreeActStructure> {
  const prompt = `Apply the 3-Act narrative structure to frame this idea as a compelling story.

Idea: "${idea.title}" — ${idea.description}
Domain: "${domain}"

3-Act Structure (Digital Creativity lecture):
1. Beginning: Setup, context, the world before the idea
2. Tension/Conflict: The problem escalates, why current solutions fail
3. Climax/Resolution: The idea as the solution, the breakthrough moment
4. End: The transformed world, lasting impact

${JSON_INSTRUCTION}

Format:
{
  "beginning": "...",
  "tension": "...",
  "climax": "...",
  "end": "..."
}`;

  return llmGenerateJSON<ThreeActStructure>({
    prompt,
    system: CREATIVE_SYSTEM_PROMPT,
    maxTokens: 1024,
  });
}
