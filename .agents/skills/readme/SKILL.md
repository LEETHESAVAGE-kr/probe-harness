---
name: readme
description: README 재대조 — README의 요구 번호·운영 규칙·필수 파일·다루지 않는 범위를 하나씩 들고 지금 코드·테스트·out/에서 어디 있는지 대조해 FAIL·미검증만 보여 준다. 고치지 않는다. 사용자가 "$readme"라고 치면 쓴다(100분에 1회, 제출 전 1회).
---

고치는 파일: out/readme_check.md 하나. 그 밖의 파일은 읽기만 한다.

> 사용자가 명령 뒤에 붙인 목적·범위·하지 마라·내 판단·확인 줄은 이 파일의 지시보다 우선한다(고치는 파일 범위와 "멈춰라"는 그대로). 보고 첫 줄에 "이번 목적: …"을 그 문장 그대로 옮기고, 붙인 줄이 없으면 리스크 칸에 "[목적 줄 없음]"이라고 적는다.

# $readme — README 재대조 (S4 100분 · S6 시작)

## 할 일
1. README.md, README가 링크한 data/README.md·*_SCHEMA.md, REQUIREMENTS.md를 읽는다.
2. README의 항목을 **하나도 빼지 않고** 한 행씩 대조한다: 번호 요구 전부, 운영 규칙 불릿 전부, 백틱으로 적힌 파일명 전부, "다루지 않는 범위" 전부. REQUIREMENTS에 없는 README 항목이 있으면 그 행의 판정은 FAIL("표에 없음").
3. 각 행에서 그 항목이 실제로 어디 있는지 찾는다: 코드 파일:함수, 테스트 이름, out/ 파일, 화면 경로. 문서에만 적혀 있고 코드·테스트가 없으면 FAIL. 코드는 있는데 실행·테스트·화면 확인 기록이 없으면 미검증.
4. out/readme_check.md에 표로 쓴다:
   `| # | README 원문 요지 | 어디(파일:함수 · 테스트 · out 파일 · 경로) | 판정(PASS/FAIL/미검증) | 근거 |`
5. `node /tmp/harness/scripts/check_evidence.mjs` 를 실행해 출력 중 README 대조 줄(REQUIREMENTS 상태 칸 · README 필수 파일 · out/docker_build.txt · AI_COLLABORATION.md 답변)을 표 아래에 붙인다.
6. 표 위에 FAIL·미검증만 다시 모아 심각도순으로 한 줄씩 보여 준다. 각 줄 끝에 "고치면 무엇이 바뀌나" 한 줄.
7. 역할 카드 B(S6) 또는 C(100분)로 일하는 세션이면 커밋하지 말고 "커밋 준비됨: out/readme_check.md"로 끝낸다. 혼자 일하는 세션이면 `[S n/6] README 재대조 FAIL n·미검증 n` 형식으로 그 파일만 커밋한다(n은 git log에서 지금 단계).

## 하지 않는 것
코드·문서 수정 / REQUIREMENTS 상태 칸 채우기 / FAIL을 미검증으로 낮추기 / 판정 근거 없는 PASS.

## 끝 조건
README 항목 수 = out/readme_check.md 표 행 수이고, FAIL·미검증 목록이 화면에 있다.

## 보고 (5줄)
한 일 / 검증: 행 수와 PASS n·FAIL n·미검증 n / 왜 이렇게 판정했나 1줄 / 리스크: 가장 비싼 FAIL 1개 / 다음: "고칠 번호를 골라 A에게".

고치지 말고 멈춰라.
