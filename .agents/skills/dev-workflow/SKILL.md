---
name: dev-workflow
description: 구현 과제(README 요구 → 담당자 요구 확인 → 구현 → 테스트·미리보기 검증 → 계획 문서·협업 기록)를 S1~S6 단계로 운영한다. 과제 시작, 단계 전환, 새 세션 재개, "다음 뭐 하지", 제출 전 점검에 쓴다. 코드 없이 자료만 정리하는 과제에는 ops-workflow를 쓴다.
---

# dev-workflow — 구현 과제 운영 절차 (S1~S6)

## 0. 시작할 때
- 작업 폴더 루트의 AGENTS.md를 먼저 읽는다. 규칙 블록 12줄이 본문이다.
- PLAN.md·LOG.md·DECISIONS.md·VERIFY.md·README_RUN.md·tests/·out/이 있으면 → AGENTS.md → PLAN → LOG 순으로 읽고 현재 단계를 5줄로 보고한다. 없으면 표 머리만으로 만들고(git 없으면 init, 빈 폴더는 .gitkeep) 커밋한 뒤 목록만 보여주고 멈춘다.
- 과제 README.md와 제공 데이터는 덮어쓰지 않는다. 덮였으면 `git checkout -- README.md`로 되돌리고 알린다.

## 단계별 끝 조건
| 단계 | 할 일 | 끝 조건(파일) | 커밋 |
|---|---|---|---|
| S1 요구·데이터 확인 | `$s1`과 같다: `node /tmp/harness/scripts/readme_to_requirements.mjs`로 README 요구·규칙·필수 파일을 REQUIREMENTS.md 표에, 없는 필수 파일은 껍데기로. 데이터 파일은 `node /tmp/harness/scripts/inventory.mjs <파일들>`로 out/inventory.md. 업무자료 주소가 있으면 `node /tmp/harness/scripts/fetch_portal.mjs <URL> --name x`. 해석·구현 금지 | REQUIREMENTS.md, 껍데기, out/inventory.md | `[S 1/6]` |
| S2 PLAN 합의 | `$ask`로 질문 초안(README가 지목한 조건 → 숫자 없는 행 → inventory 이상값 순, 상한 없음, 최근 3답에 새 정보가 없으면 멈춤)과 inventory에서 센 것의 처리 방법을 LOG에 → 사람이 한 번에 하나씩 담당자에게 → "기록만 해라"로 받은 답 원문·시각을 LOG에 → PLAN 7칸 → 사람이 PLAN을 담당자에게 보내 확인 → '확인 받은 시각' | PLAN 합의 기록(시각) | `[S 2/6]` |
| S3 골격+스모크 | 과제 언어 → node 내장 http → python http.server. 0.0.0.0·PORT(기본 3000). 필요하면 `/tmp/harness/scaffold/node/` 참고(출처 LOG). 스모크 테스트 1개, 출력 out/test_result.txt | README_RUN.md, 스모크 통과 | `[S 3/6]` |
| S4 기능 1개씩 | 시작 전 inventory 항목마다 처리 규칙이 PLAN '데이터 처리 규칙'·changes_log에 있는지 대조. 기능 하나 = 테스트(정상·경계·오류) + 커밋. 데이터를 빼·바꾸·합치면 먼저 `node /tmp/harness/scripts/changes_log.mjs` | 기능별 통과 n/n, 커밋 | `[S 4/6]` 기능마다 |
| S5 미리보기 검증 | 서버를 띄워 `curl -s -w "\n%{http_code}\n"` 출력을 out/browser_check.txt에. 사람이 화면을 보고 "기록만 해라"로 알려 준 것을 LOG에. 안 되는 것은 PLAN 한계. 결과를 바꾼 뒤엔 S5를 다시 | out/browser_check.txt, PLAN 한계 | `[S 5/6]` |
| S6 리뷰어·제출 | 새 터미널의 새 세션이 리뷰어: 테스트 재실행·문서 숫자 ↔ out/ 대조·지적만 VERIFY에(고치지 않음). 메인 세션은 사람이 고른 지적만 고침 → 테스트 재실행 → `node /tmp/harness/scripts/check_evidence.mjs` 판정 → 커밋 | VERIFY.md, check_evidence "제출 가능" | `[S 6/6]` |

## 전환 의식 (단계 끝마다)
1. 테스트 재실행, 출력(통과·실패 개수)을 out/test_result.txt에. 2. 커밋 본문 3줄: 드리프트 / 증거 / 의심. 3. `git show --stat HEAD`로 파일이 들어갔는지 확인. 4. 멈추고 보고.

## 사람이 손으로 한 일
"기록만 해라: …"를 받으면 그 내용만 LOG(본표 '내가 직접 확인한 것' 또는 담당자 대화 표)에 원문·시각으로 적고 다른 작업은 하지 않는다. 고정 절 "AI 위임 vs 직접 검증"은 S5 끝에 사람이 채운다 — 너는 '맡긴 것' 후보 목록만 준다.

## 하지 않는 것
요구되지 않은 기능 / 범위·출력 파일 없는 작업 / 전체 재작성 / 테스트 삭제·약화 / 기대값을 바꿔 통과시키기 / 남의 프로세스 종료 / 승인 없는 삭제·덮어쓰기·설치 / 작업 내용을 밖으로 보내는 도구.
