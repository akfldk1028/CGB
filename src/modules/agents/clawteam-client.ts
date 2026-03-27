/** ClawTeam Python 서버 HTTP 클라이언트 (heavy 세션용) */

import type { ClawTeamRequest, ClawTeamResponse } from '@/types/agent';

const CLAWTEAM_API_URL = process.env.CLAWTEAM_API_URL ?? 'http://localhost:8000';

export async function startHeavySession(
  topic: string,
  domain: string,
  template = 'creative-session'
): Promise<ClawTeamResponse> {
  const body: ClawTeamRequest = { topic, domain, template };

  const res = await fetch(`${CLAWTEAM_API_URL}/pipeline/creative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return {
      sessionId: '',
      status: 'failed',
      error: `ClawTeam server error: ${res.status} ${res.statusText}`,
    };
  }

  return res.json();
}

export async function getHeavySessionStatus(sessionId: string): Promise<ClawTeamResponse> {
  const res = await fetch(`${CLAWTEAM_API_URL}/pipeline/status/${sessionId}`);
  if (!res.ok) {
    return { sessionId, status: 'failed', error: `Status check failed: ${res.status}` };
  }
  return res.json();
}
