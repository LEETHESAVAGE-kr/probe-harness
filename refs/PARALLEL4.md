# PARALLEL4 — 4탭 확장: B를 S3부터 (시간이 남고 중계가 부담 없을 때만)

> v2.6 기본은 3탭(A-main · C-docs · D-data) + S6 B-review다. 4탭 확장은 B를 S3부터 테스트 보강에 붙이는 것이다. 아래는 v2.1 `playbook/RUN.md`의 탭 표와 운영 규칙을 그대로 옮긴 것이다. 4탭으로 펼칠 때는 B를 S3부터, D를 C에서 분리한다(`$role-d`).

## 탭 7칸 (S0에서 전부 열고 이름을 붙인다: `printf '\033]0;A-main\007'`)
| 탭 | 이름 | 역할 · 첫 명령 | 소유 파일 (남의 것은 읽기만) |
|---|---|---|---|
| 1 | A-main | `codex` → `$role-a`. 요구·PLAN·핵심 계산·라우트. **유일한 커밋 담당** | server.js · src/ · public/ · tests/smoke·feat_* · PLAN.md · REQUIREMENTS.md · DECISIONS.md · out/inventory.md · LOG.md 본표·담당자 대화·도구 설정·설명 카드 |
| 2 | B-qa | `codex` → `$role-b`. 테스트 작성·실행, `$readme` 재대조, 리뷰 지적 | tests/qa_* · VERIFY.md · out/test_result.txt · out/readme_check.md |
| 3 | C-docs | `codex` → `$role-c`. 필수 문서 4종·`$defend` | HOW_TO_RUN.md · AI_COLLABORATION.md · .env.example · Dockerfile · .dockerignore · LOG.md "설명 준비" 절 |
| 4 | D-data | `codex` → `$role-d`. 데이터셋 2벌·검증 코드·규모·동시성·docker build | data/prepared/ · scripts/ · out/changes_log.md · out/screen_check.md · out/screens/ · out/browser_check.txt · out/scale_check.txt · out/concurrency_check.txt · out/docker_build.txt |
| 5 | server | `PORT=3000 node server.js` (내 손. 코드가 바뀌면 Ctrl+C → 같은 명령) | — |
| 6 | check | `ss -ltnp \| grep 3000` · `curl -s -w "\n%{http_code}\n" localhost:3000/health` · `git status` | — |
| 7 | spare | 세션 교체용 · docker 빌드 로그 | — |
- 가동 수: S0~S2 **A+C** / S3~S5 **A·B·C·D** / S6 **B·C**. 처음부터 4개를 돌리면 PLAN 없이 코드가 생긴다.
- 중계는 나: B·C·D 보고 끝의 `A에게 요청: …` 줄을 복사해 A 탭에 붙인다. B·C·D는 `커밋 준비됨: 파일 목록`으로 멈추고 out/ready_*.txt에 남긴다. A가 `node /tmp/harness/scripts/handoff.mjs`(충돌 경고)의 `git add` 명령으로 커밋한다. 커밋 이력은 A 한 줄기. 계약은 PLAN·REQUIREMENTS다 — 바뀌면 A가 고치고 셋에게 `PLAN 바뀜, 다시 읽어라`, 소유 밖 파일을 고친 탭은 `되돌려라`.
