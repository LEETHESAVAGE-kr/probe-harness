#!/bin/sh
# bootstrap.sh — node가 없을 때의 폴백. bootstrap.mjs --mode dev와 같은 파일을 깐다(기존 파일은 덮어쓰지 않음).
# 사용: (작업 폴더에서) sh /tmp/harness/bootstrap.sh [docs]
# SPDX-License-Identifier: MIT
H=$(cd "$(dirname "$0")" && pwd)
T=$(pwd)
[ "$T" = "$H" ] && { echo "[bootstrap.sh] 작업 폴더에서 실행해라"; exit 2; }
MODE=${1:-dev}
URL=$(git -C "$H" remote get-url origin 2>/dev/null || echo unknown)
COMMIT=$(git -C "$H" rev-parse --short HEAD 2>/dev/null || echo unknown)
PROV="harness $URL $COMMIT MIT"
put() { # $1 원본(하네스 기준) $2 대상
  if [ -e "$T/$2" ]; then echo "  = $2 (기존 유지)"; else mkdir -p "$(dirname "$T/$2")"; cp "$H/$1" "$T/$2"; echo "  + $2"; fi
}
if [ "$MODE" = docs ]; then
  put AGENTS.nondev.md AGENTS.md
  for f in INTERVIEW AGREEMENT SOURCE_MATRIX FINDINGS REPORT DECISIONS VERIFY HANDOFF; do put "templates/docs/$f.md" "$f.md"; done
else
  put AGENTS.md AGENTS.md
  for f in PLAN DECISIONS VERIFY README_RUN; do put "templates/dev/$f.md" "$f.md"; done
fi
ROW="| S0 | 터미널: git clone + bootstrap.sh (내가 실행) | bootstrap 스크립트: $PROV — 양식·AGENTS 복사 ($MODE) | 생성 목록 확인 | $(date '+%Y-%m-%d %H:%M') |"
BORROW="| 작업 틀(AGENTS 규칙·빈 문서 양식·점검 스크립트) | $URL (커밋 $COMMIT) | MIT | 규칙·양식을 작업 폴더에 복사, 스크립트는 하네스 폴더에서 호출만 | 없음 |"
if [ -e "$T/LOG.md" ]; then printf '\n%s\n' "$ROW" >> "$T/LOG.md"; echo "  = LOG.md (출처 행 추가)"
else sed -e "s#{{HARNESS_ROW}}#$ROW#" -e "s#{{HARNESS_BORROW}}#$BORROW#" "$H/templates/dev/LOG.md" > "$T/LOG.md"; echo "  + LOG.md"; fi
put templates/changes_log.md out/changes_log.md
put templates/gitignore .gitignore
grep -qx '_playbook/' "$T/.gitignore" 2>/dev/null || printf '\n_playbook/\n' >> "$T/.gitignore"
for f in RUN PROMPTS ASK DEFEND; do put "playbook/$f.md" "_playbook/$f.md"; done
[ "$MODE" = docs ] || for k in dev-workflow s0 s1 ask plan feat readme verify defend debug screen prove decide algo role-a role-a2 role-b role-c role-d; do put ".agents/skills/$k/SKILL.md" ".agents/skills/$k/SKILL.md"; done
for d in tests out portal; do mkdir -p "$T/$d"; [ -e "$T/$d/.gitkeep" ] || : > "$T/$d/.gitkeep"; done
if [ ! -d "$T/.git" ]; then git init -q "$T" && echo "  + .git"; fi
echo "[bootstrap.sh] $PROV"
echo '다음: 파일 목록에서 _playbook/PROMPTS.md 열기(막히면 RUN.md) → codex → /status → $s0'
