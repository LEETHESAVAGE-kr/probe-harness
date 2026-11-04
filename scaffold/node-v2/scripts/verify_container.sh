#!/bin/sh
# verify_container.sh — docker build → run → /health 200 → logs → 정리. 결과는 out/docker_build.txt에 PASS / FAIL / SKIP 한 줄로 끝난다.
# 사용: (작업 폴더에서) sh scripts/verify_container.sh [호스트 포트, 기본 3999]   종료 코드: PASS 0 · FAIL 1 · SKIP(docker 없음) 3
# SPDX-License-Identifier: MIT
DOCKER=${DOCKER:-docker}
OUT=out/docker_build.txt
HOSTPORT=${1:-3999}
TAG=app-verify
NAME=app-verify-$$
BUILDLOG=${TMPDIR:-/tmp}/docker_build_$$.log
mkdir -p out
: > "$OUT"
log() { echo "$*" | tee -a "$OUT"; }
log "== verify_container $(date '+%Y-%m-%d %H:%M')"
if ! command -v "$DOCKER" >/dev/null 2>&1; then
  log "SKIP: docker 없음 — 이 환경에서는 컨테이너를 확인하지 못했다(성공 아님)"
  exit 3
fi
if ! "$DOCKER" build -t "$TAG" . > "$BUILDLOG" 2>&1; then
  tail -20 "$BUILDLOG" | tee -a "$OUT"
  log "FAIL: docker build"
  exit 1
fi
tail -5 "$BUILDLOG" >> "$OUT"
if ! "$DOCKER" run -d --name "$NAME" -p "$HOSTPORT:3000" "$TAG" > /dev/null; then log "FAIL: docker run"; exit 1; fi
ok=""; code=""; i=0
while [ $i -lt 20 ]; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$HOSTPORT/health" 2>/dev/null)
  [ "$code" = "200" ] && { ok=1; break; }
  i=$((i + 1)); sleep 1
done
log "== /health 상태 코드: ${code:-없음} (${i}초)"
"$DOCKER" logs "$NAME" 2>&1 | tail -10 >> "$OUT"
"$DOCKER" rm -f "$NAME" > /dev/null 2>&1
if [ -n "$ok" ]; then log "PASS: build · run · /health 200"; exit 0; fi
log "FAIL: 20초 안에 /health 200이 안 나왔다"
exit 1
