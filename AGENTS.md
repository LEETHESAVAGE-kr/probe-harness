# AGENTS.md — 구현 과제 운영 규칙 (모든 세션은 이 파일을 먼저 읽는다)

> 줄별 해설은 `/tmp/harness/refs/AGENTS_NOTES.md`(필요할 때만 연다).
> 문서만 내는 과제면 `AGENTS.nondev.md`(`bootstrap.mjs --mode docs`).

## 규칙 (12줄)

```text
너는 구현 파트너, 나는 문제 정의·검증 책임자다. 이미 읽었으니 규칙이 흐려졌을 때만 다시 읽고, 삭제·덮어쓰기·설치는 내 승인 뒤에 한다.
하나: 한 번에 한 가지, 범위와 출력 파일은 내가 정하고 고칠 곳만 고친다. 단계 끝마다 테스트 통과 뒤 커밋하고 멈춰 보고한다.
증거: "완료"에는 실행한 명령과 출력(통과·실패 개수)을 붙이고, 안 돌린 것은 "미검증". 문서 숫자는 out/의 실행 결과에서만. 매 보고 끝에 "왜 이렇게 했나"를 쉬운 말 1~2줄(내가 설명한다), 상태는 PASS/FAIL/미검증/내가 확인 넷 중 하나. 결정은 DECISIONS의 고정 슬롯 D1~D6(시그니처 기법) 중 해당 슬롯에 적는다.
전후: 데이터를 빼거나 바꾸거나 합치면 먼저 이유·전후 건수·합계를 out/changes_log.md에, 코드도 입력=사용+버림 건수를 출력·테스트한다. 외부 코드를 빌리면 출처·범위를 LOG에(통째 대체 금지).
서버: 과제가 언어를 정하면 그것, 아니면 node 의존성 0 http 모듈, 없으면 python http.server. 0.0.0.0, PORT 환경변수(기본 3000, 차 있으면 바꾼다), 끌 때는 내가 띄운 PID만, 시작·테스트 명령은 README_RUN.md에.
PLAN: 문제|사용자|성공 기준(측정할 숫자)|만들 것(REQUIREMENTS 모든 행을 만들 것/안 만들 것에 배치, 안 만들 것은 사유. 그중 이번 회차 구현 순서 상위 3개에 ★)|안 만들 것|가정|한계(숨기지 않는다).
LOG: 단계|내가 지시한 것|AI가 한 것|내가 직접 확인한 것|시각 + 고정 절 "AI 위임 vs 직접 검증": 맡긴 것|내가 확인한 것|어떻게|숫자.
DECISIONS: 결정|대안|약점|검증, 본문은 $decide의 선택지에서 내가 고르고 Codex가 '내 선택 — 이유'로 적는다. VERIFY: 무엇|명령|결과 숫자|파일. 테스트는 tests/에 기능마다 정상·경계·오류, 실행 명령과 출력을 out/test_result.txt에.
단계 S1 요구·데이터 확인($s1: README(+data/README·스키마 md)의 요구·규칙·필수 파일·제외를 REQUIREMENTS 표로, 없는 필수 파일은 껍데기로, 데이터는 inventory(해석 금지))→S2 PLAN 합의(담당자 확인, 구현 전)→S3 골격+스모크→S4 기능 1개씩(테스트 동반)→S5 Browser 검증·담당자 결과 확인·한계→S6 리뷰어→지적 반영→제출.
S2 질문 순서는 $ask(지목 조건→숫자 없는 행→이상값). 상한 없음, 최근 3답에 새 정보 없으면 멈춤. 숫자는 제안형으로. 할 일·기능·기술은 안 묻는다. 명령 없이 붙인 글=담당자 답(여럿이면 나눠): 맞는 [번호]마다 시각·원문·태그만 쓰고 멈춤(확인 DM 답이면 plan 스킬 '확인 답 반영').
S5 = 서버를 띄워 curl 출력을 out/browser_check.txt에, 안 되는 것은 PLAN 한계에. S6 = 새 터미널 codex가 리뷰어로 VERIFY에 지적만 적고, 고치는 건 내가 시킨다.
합의·요구가 바뀌면 PLAN부터 고치고 LOG에 시각. 100분쯤 새 터미널 codex는 AGENTS·PLAN·LOG부터 읽는다. 내가 STATE라고 하면 지금 단계|남은 시간|미검증 3줄만.
```

## 하네스 도구 (호출만 한다 · 경로 `node /tmp/harness/scripts/<이름>`)
| 명령 | 하는 일 |
|---|---|
| `readme_to_requirements.mjs` | S1 README → REQUIREMENTS 표 + 필수 파일 껍데기 |
| `inventory.mjs data/*.csv --by 키열` | S1 데이터 프로필 → out/inventory.md |
| `changes_log.mjs --step S4 --why 이유 --before a --after b` | 전후 행 → out/ |
| `fetch_portal.mjs <URL> --name x` | 업무자료 원문 → portal/ |
| `check_evidence.mjs` | 제출 전 점검, FAIL 0이면 제출 가능 |
| `summary10.mjs` | 제출 직전 요약 뼈대 |
| `diag_web.mjs 3000` | 빈 화면 원인 분리 → out/diag_web.txt |
| `screen_check.mjs --port 3000` | `$screen` 본체 |
| `prove_table.mjs [--check]` | json → out/prove.md 비교표·대조 |
| `handoff.mjs` | A 탭: out/ready_*.txt → `git add` 명령, 충돌이면 종료 1 |
| `node /tmp/harness/bootstrap.mjs --scaffold node-v2 [--with auth,store,lock,schema,docker]` | 의존성 0 뼈대(요구한 부품만) |

## 한 단어 명령·역할 카드 (`.agents/skills/`, Codex 입력칸에 `$이름`)
| 명령 | 하는 일 |
|---|---|
| `$s0` | 빠진 양식 + /status → LOG '도구 설정', [S 0/6] |
| `$s1` | REQUIREMENTS·껍데기·inventory → [S 1/6] |
| `$ask` | 지목 조건부터 우선순위 순 질문 초안, 상한 없음, 숫자를 제안하는 형태 |
| `$plan` | 담당자 답만 근거로 PLAN 7칸 + REQUIREMENTS 모든 행을 만들 것/안 만들 것에(빈 행 0), 확인 DM(핵심 행은 먼저 `$algo`) |
| `$feat` | 빈 첫 행 하나: 계획(슬롯 [Dn]) → 테스트 3 → 구현 → 4문장 퀴즈(1A 2B…로 답, 틀린 고름 2개 이상이면 커밋 안 함) → 설명 카드 |
| `$verify` | ss·curl·10배·동시 쓰기·docker → out/ 4개, 고치지 않음 |
| `$readme` | README 항목별 대조 → out/readme_check.md |
| `$defend` | LOG "## 설명 준비" + out/defend_cards.md + AI_COLLABORATION Q마다 [초안A]·[초안B] → Q1-A Q2-B Q3-A로 고름 |
| `$decide` | D1~D6·거부한 것마다 결정 A/B·이유 후보 ①②③ + 고정 절 초안 → 번호로 고르면 '내 선택 — 이유'로 적는다 |
| `$debug` | 재현 → 가설 1개씩 → 원인만 수정, 3번 실패면 멈춤 |
| `$screen` | 역할별 화면 → out/screen_check.md |
| `$prove` | 기준안·하한·우리 안 → out/prove.md |
| `$role-a`·`$role-c`·`$role-d`·`$role-b`·`$role-a2` | 3탭+리뷰어: A 메인(코드 커밋 담당)·C 문서·D 데이터·측정(S3~S5, `$prove` 필수)·B S6 리뷰어 |
- skill이 안 보이면 `_playbook/PROMPTS.md`의 같은 이름 블록을 붙인다.
