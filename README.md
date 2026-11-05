# probe-harness

AI 코딩 에이전트와 협업할 때 계획·검증·기록을 빠뜨리지 않기 위한 범용 작업 틀입니다.
일하는 규칙(AGENTS.md)과 빈 문서 양식, 반복 확인용 작은 스크립트만 들어 있습니다. 과제의 답이나 데이터, 특정 도메인 지식은 없습니다.

## 사용법 (작업 폴더에서 2줄)

```bash
git clone --depth 1 https://github.com/LEETHESAVAGE-kr/probe-harness /tmp/harness
node /tmp/harness/bootstrap.mjs            # 자료 정리형이면 --mode docs, 서버 뼈대가 필요하면 --scaffold node
```

- 하네스는 **작업 폴더 밖(`/tmp`)** 에 받습니다. 시험 환경은 홈(~) 자체가 작업 폴더이고 작업 공간 파일이 전부 수집되므로, 안에 받으면 제출물에 섞입니다. `/tmp`에 못 쓰면 `.harness`로 받고 `echo ".harness/" >> .git/info/exclude`.
- node가 없으면 `sh /tmp/harness/bootstrap.sh` (자료 정리형은 `sh /tmp/harness/bootstrap.sh docs`).
- 작업 폴더에 이미 있는 파일(README.md, 제공 데이터 등)은 **절대 덮어쓰지 않습니다**. 생성/유지 목록을 출력합니다.
- LOG.md 첫 행에 `harness <저장소 URL> <커밋> MIT`를 남겨 출처를 기록합니다.
- git 저장소가 아니면 `git init`만 합니다(커밋은 하지 않습니다).
- 모드 선택: --mode docs는 README 요구에 서버·화면·로그인·API가 하나도 없고 산출물이 문서·표뿐일 때만. 그 외는 기본(dev).

## v2.2 변경
- 지시문 한 층: AGENTS.md는 규칙 12줄·도구 표·명령 표만(≤ 6KB), 줄별 해설은 `refs/AGENTS_NOTES.md`. 같은 명령의 SKILL·BOXES·명령 표가 같은 뜻인지 시험으로 묶었습니다.
- `playbook/RUN.md`: 단계마다 그대로 붙여 넣는 `$명령` + 4줄(목적·범위·내 판단·확인) 블록, 과제 값만 빈칸(블록당 3칸 이하).
- 결정 기록: DECISIONS에 고정 슬롯 D1~D6과 '거부한 것' 절, 뼈대 코드·시험 이름에 `[Dn]` 표시, `check_evidence`에 "시그니처" 항목(경고만)과 AI_COLLABORATION `[초안]` 경고.
- 기본 운영은 3탭(A 메인·C 문서·D 데이터) + 마지막 리뷰어(B)이고, 두 번째 구현 줄기 A2는 S4에 추가한다. README_RUN 머리에 작업 틀 출처 한 줄.

## 들어 있는 것

| 경로 | 내용 |
|---|---|
| `AGENTS.md` | 구현 과제 규칙(12줄 본문 + 풀어 쓴 설명): 한 번에 한 가지, 증거(명령과 출력), 데이터 전후 비교, 서버 규칙, PLAN·LOG·DECISIONS·VERIFY 칸, 단계 S1~S6 |
| `AGENTS.nondev.md` | 자료 정리형 과제 규칙(출처 대조·확인 필요 항목 문서) |
| `templates/dev/` | PLAN · LOG · DECISIONS · VERIFY · README_RUN · REQUIREMENTS · PROVE(효과 비교표, `$prove`가 out/prove.md로) |
| `templates/docs/` | INTERVIEW · AGREEMENT · SOURCE_MATRIX · FINDINGS · REPORT · DECISIONS · VERIFY · HANDOFF |
| `templates/changes_log.md`, `portal_check.md` | 데이터 전후 비교표 · 외부 자료 대조표 |
| `playbook/` | 사람이 읽는 것 4개: RUN(시험 중 여는 시간표 — 지시 틀·창 8개·단계마다 치는 것 1개·볼 것·터지는 것) · PROMPTS(붙여 넣는 완성 프롬프트, `refs/BOXES.md`에서 `scripts/gen_prompts.mjs`가 생성) · ASK(담당자 질문 상한·DM 4개) · DEFEND(제출 전 "설명 준비" 읽는 순서·출제 6유형). bootstrap이 작업 폴더 `_playbook/`에 사본을 두고 `.gitignore`에 넣는다 |
| `refs/` | 평소엔 안 여는 참고: BOXES(PROMPTS.md의 원본 — 상자 본문·지시 4줄) · ORDER(PROMPTS.md 맨 위 순서 절의 원본) · TAILS(단계별 꼬리 상황) · QUESTION_BANK(질문 순서·서술형 22개·용어 카드) · ENV_FACTS · DOMAIN_SEMI. 하네스 폴더에만 있다 |
| `scripts/` | node 표준 라이브러리만: `inventory.mjs`(행 수·빈칸·중복·코드값·날짜 범위·키별 요약) · `changes_log.mjs`(전후 건수·합계 행) · `fetch_portal.mjs`(주소 → 원문 저장·행 수) · `readme_to_requirements.mjs`(README → REQUIREMENTS 표·필수 파일 껍데기) · `check_evidence.mjs`(제출 전 점검 판정, README 대조 포함) · `summary10.mjs`(10줄 요약 뼈대) · `diag_web.mjs`(빈 화면 원인 5단계) · `screen_check.mjs`(역할별 화면 확인) · `prove_table.mjs`(효과 비교표 채우기·대조) · `handoff.mjs`(역할 탭 커밋 목록 모으기) |
| `scaffold/node/`, `scaffold/python/` | 의존성 0 서버 뼈대(0.0.0.0, `PORT`) + 스모크 테스트 |
| `scaffold/node-v2/` | `--scaffold node-v2 [--with 부품]`: 바닥(0.0.0.0·`/health`·설정 기본값·업무 시간대 고정·스모크) + 고르는 부품 auth(HttpOnly 쿠키 로그인·역할 2개·데모 계정) · store(SQLite, 없으면 JSON) · lock(쓰기 409) · schema(스키마 키 대조) · docker(Dockerfile·`scripts/verify_container.sh`). 부품마다 시험이 따라온다. 과제 로직은 비어 있다 |
| `.agents/skills/` | 한 단어 명령 `$s0`·`$s1`·`$ask`·`$plan`·`$feat`·`$readme`·`$verify`·`$defend`·`$debug`·`$screen`·`$prove` · 역할 카드 `$role-a`~`$role-d`(4탭 병렬, 커밋은 A만) · dev-workflow · ops-workflow · findings-doc |
| `tests_harness/` | 이 저장소 자체 시험: `node --test tests_harness/*.test.mjs` |

## check_evidence 종료 코드

| 코드 | 뜻 |
|---|---|
| 0 | 제출 가능 — FAIL 0개(WARN은 있을 수 있다) |
| 1 | 막힘 — FAIL 1개 이상. 위 FAIL부터 고친다 |
| 2 | 검사한 것이 없다 — 양식·README·out/이 하나도 없는 폴더. 통과로 읽지 마라 |

- 테스트 검사: `out/test_result.txt`의 통과가 0이면 FAIL, 테스트 파일에 건너뛰기 표식(`.skip(`·`.only(`·`pytest.mark.skip` 등)이 있으면 WARN, 직전 커밋보다 테스트 수가 줄면 FAIL.

## 원칙

- 하네스는 **일하는 방식**만 제공합니다. 결과물 코드는 과제 안에서 새로 작성하고, 하네스에서 가져온 부분(예: 서버 뼈대)은 LOG의 차용 표에 출처·범위를 적습니다.
- 스크립트는 읽고 세기만 합니다. 원본 데이터를 바꾸지 않고, `out/`·`portal/`에만 씁니다. 외부로 보내는 기능은 없습니다(`fetch_portal.mjs`는 GET만).
- 요구 사항: Node 18 이상(스크립트·뼈대), git. Python 뼈대는 3.8 이상.

## 라이선스

MIT — `LICENSE` 참고.
