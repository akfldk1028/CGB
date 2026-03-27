#!/bin/bash
# CreativeGraph AI — Google Cloud VM 초기 설정
# 사용법: VM에 SSH 접속 후 실행
# bash setup-vm.sh

set -euo pipefail

echo "=== CreativeGraph AI VM Setup ==="

# 1. 시스템 업데이트
echo "[1/5] 시스템 업데이트..."
sudo apt update && sudo apt upgrade -y

# 2. Memgraph 설치
echo "[2/5] Memgraph 설치..."
curl https://install.memgraph.com | sh
sudo systemctl enable memgraph
sudo systemctl start memgraph
echo "Memgraph 상태:"
sudo systemctl status memgraph --no-pager

# 3. Python + 가상환경
echo "[3/5] Python 환경 설정..."
sudo apt install python3-pip python3-venv -y
python3 -m venv /opt/clawteam-env
source /opt/clawteam-env/bin/activate
pip install clawteam fastapi uvicorn httpx

# 4. Memgraph 초기 스키마
echo "[4/5] Memgraph 스키마 설정..."
mgconsole <<'CYPHER'
CREATE INDEX ON :Idea(id);
CREATE INDEX ON :Idea(title);
CREATE INDEX ON :Idea(createdAt);
CREATE INDEX ON :Concept(id);
CREATE INDEX ON :Domain(id);
CREATE INDEX ON :Session(id);
CREATE INDEX ON :Output(id);
CYPHER

# 5. 방화벽 확인
echo "[5/5] 포트 확인..."
echo "Memgraph Bolt: $(ss -tlnp | grep 7687 || echo 'NOT LISTENING')"
echo ""
echo "=== 설정 완료 ==="
echo "Memgraph: bolt://$(curl -s ifconfig.me):7687"
echo ""
echo "다음 단계:"
echo "1. GCP 콘솔에서 방화벽 규칙 추가 (tcp:7687, tcp:8000)"
echo "2. .env.local에 NEO4J_URI=bolt://<이 VM의 외부IP>:7687 설정"
echo "3. ClawTeam 서버 시작: cd /opt/clawteam-server && uvicorn server:app --host 0.0.0.0 --port 8000"
