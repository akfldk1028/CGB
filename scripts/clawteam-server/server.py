"""CreativeGraph AI — ClawTeam FastAPI 서버 (heavy 세션용)
Google VM에서 실행: uvicorn server:app --host 0.0.0.0 --port 8000
"""

import uuid
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="CreativeGraph ClawTeam Server", version="0.1.0")

# 세션 저장소 (프로덕션에선 Redis/Memgraph 사용)
sessions: dict[str, dict] = {}


class PipelineRequest(BaseModel):
    topic: str
    domain: str
    template: str = "creative-session"
    options: dict | None = None


class PipelineResponse(BaseModel):
    sessionId: str
    status: str  # queued, running, completed, failed
    result: dict | None = None
    error: str | None = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "clawteam-creative"}


@app.post("/pipeline/creative", response_model=PipelineResponse)
async def start_creative_pipeline(req: PipelineRequest):
    session_id = f"heavy-{uuid.uuid4().hex[:12]}"

    sessions[session_id] = {
        "id": session_id,
        "topic": req.topic,
        "domain": req.domain,
        "template": req.template,
        "status": "queued",
        "createdAt": datetime.utcnow().isoformat(),
    }

    # 비동기로 ClawTeam 팀 spawn (백그라운드)
    asyncio.create_task(_run_clawteam_session(session_id, req))

    return PipelineResponse(sessionId=session_id, status="queued")


@app.get("/pipeline/status/{session_id}", response_model=PipelineResponse)
async def get_pipeline_status(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return PipelineResponse(
        sessionId=session_id,
        status=session["status"],
        result=session.get("result"),
        error=session.get("error"),
    )


async def _run_clawteam_session(session_id: str, req: PipelineRequest):
    """ClawTeam 팀을 spawn하고 결과를 수집"""
    import subprocess

    sessions[session_id]["status"] = "running"

    try:
        # ClawTeam CLI로 팀 spawn
        cmd = [
            "clawteam", "team", "spawn-team", req.template,
            "--goal", f"Creative session on '{req.topic}' in domain '{req.domain}'",
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)

        if proc.returncode == 0:
            sessions[session_id]["status"] = "completed"
            sessions[session_id]["result"] = {
                "output": stdout.decode(),
                "agentsUsed": ["creative-director", "divergent-thinker", "evaluator", "researcher", "iterator", "field-validator"],
            }
        else:
            sessions[session_id]["status"] = "failed"
            sessions[session_id]["error"] = stderr.decode()

    except asyncio.TimeoutError:
        sessions[session_id]["status"] = "failed"
        sessions[session_id]["error"] = "Session timed out (10 min)"
    except FileNotFoundError:
        sessions[session_id]["status"] = "failed"
        sessions[session_id]["error"] = "clawteam CLI not found. Install with: pip install clawteam"
    except Exception as e:
        sessions[session_id]["status"] = "failed"
        sessions[session_id]["error"] = str(e)
