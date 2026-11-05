---
name: verify
description: S5 검증·측정 — 사용자가 띄운 서버에 ss·curl, 10배 입력 시간, 동시 쓰기 요청 2개, docker build·run을 돌려 out/에 남긴다. 고치지 않는다. 사용자가 "$verify"라고 치면 쓴다(D 탭).
---

고치는 파일: out/browser_check.txt · out/scale_check.txt · out/concurrency_check.txt · out/docker_build.txt · out/export_sample.json · out/schema_check.txt · out/rule_check.txt · scripts/rule_check.* · out/ 아래 10배 입력 사본. 서버·코드·문서는 읽기만 한다.

> 사용자가 명령 뒤에 붙인 목적·범위·하지 마라·내 판단·확인 줄은 이 파일의 지시보다 우선한다(고치는 파일 범위와 "멈춰라"는 그대로). 보고 첫 줄에 "이번 목적: …"을 그 문장 그대로 옮기고, 붙인 줄이 없으면 리스크 칸에 "[목적 줄 없음]"이라고 적는다.

# $verify — 검증·규모·동시성·컨테이너 (S5, 150~163분)

## 할 일 (각 단계 명령과 출력을 붙인다)
1. **바인딩·curl** — 서버는 사용자가 띄워 두었다(켜거나 끄지 않는다). README_RUN·HOW_TO_RUN의 포트로 `ss -ltnp | grep <포트>` 출력을 out/browser_check.txt 첫 줄에. 127.0.0.1에만 묶였으면 "바인딩 수정 필요"라고 쓰고 이 단계를 멈춘다. 그다음 만든 경로마다 `curl -s -w "\n%{http_code}\n"`(로그인이 필요한 경로는 데모 계정으로 쿠키를 받아 `-b`) 출력을 이어 붙인다.
   이어서 본문을 읽는 POST 경로 하나에 깨진 JSON을 보내(`-H "Content-Type: application/json" -d '{깨짐'`) 400도 남기고, `/health`의 `store` 값(저장 종류)이 보이는 출력을 남긴다.
2. **규모 10배** — 제공 데이터를 10배로 복제한 입력을 out/ 아래에만 만들고(원본은 건드리지 않는다), 핵심 계산을 1배·10배로 한 번씩 돌려 `| 입력 | 건수 | 시간(ms) | 결과 건수 |`를 out/scale_check.txt에. 가장 오래 걸린 함수 이름과 이유 한 줄.
3. **동시 쓰기** — 같은 쓰기 요청(재계산·적용 등) 2개를 동시에 보낸다(`curl … & curl … & wait`). 상태 코드 2개와 최종 결과가 한 번만 반영됐는지를 out/concurrency_check.txt에. 둘 다 200이어도 잠금이 없다고 쓰지 않는다 — 계산이 동기면 두 요청이 차례로 처리되어 겹치지 않는다. 쓰기가 `lock.exclusive` 안에 있으면 "계산이 동기라 차례로 처리되어 둘 다 200"이라 적고, 겹친 경우를 따로 잰다: 사용자 서버는 그대로 두고 임시 서버 하나(`WORK_DELAY_MS=300 PORT=3998 DB_PATH=/tmp/verify_delay.db node server.js`)에 데모 계정으로 다시 로그인해 쿠키를 받고(저장소가 달라 기존 쿠키는 401) 같은 요청 2개를 동시에 보내 `지연 300ms: 200 n·409 n` 줄을 더한 뒤 그 임시 서버만 끈다(쓰기 경로에 지연 줄이 없으면 "지연 미적용"). 쓰기가 잠금 밖에 있을 때만 "잠금 없음 — 마지막 쓰기 승리"라고 적는다.
4. **컨테이너** — Dockerfile이 있으면 `sh scripts/verify_container.sh`(없으면 `docker build -t app-verify .` → `docker run -d -p 3999:3000` → `/health` → `docker logs` → 정지)를 돌려 끝 20줄과 PASS/FAIL/SKIP을 out/docker_build.txt에. Docker가 없으면 "SKIP: docker 없음"을 그대로 남긴다(성공으로 쓰지 않는다).
5. **스키마 대조** — README가 내보내기 형식(스키마 파일)을 정했으면: 내보내기 경로를 curl로 받아(로그인 경로는 데모 계정 쿠키 `-b`) out/export_sample.json에 저장하고, `node src/validate_schema.js <스키마 md> out/export_sample.json`(또는 과제가 정한 검증기)의 출력을 out/schema_check.txt에 남긴다. 첫 줄은 PASS 또는 FAIL. 내보내기 요구가 없으면 "SKIP: 내보내기 요구 없음" 한 줄.
6. **운영 규칙 대조** — REQUIREMENTS의 규칙 행마다 내보낸 결과(out/export_sample.json 또는 과제의 결과 파일)를 실제로 세는 `scripts/rule_check.*`를 만들어 돌린다. out/rule_check.txt 첫 줄은 PASS 또는 FAIL, 그 아래 `| 규칙 | 출처 | 검사 건수 | 위반 건수 |`. 스크립트로 못 세는 규칙은 "미측정"으로 두고, 내보낸 결과가 없으면 "SKIP: 결과 없음" 한 줄. 형식이 맞아도(스키마 PASS) 규칙 위반은 따로 센다.
7. 안 되는 것은 고치지 않는다. 각각 "PLAN 한계에 넣을 문장" 한 줄로 보여 준다.
8. 역할 카드 D(데이터·측정 탭)로 일하는 세션이면 커밋하지 말고 "커밋 준비됨: out/browser_check.txt out/scale_check.txt out/concurrency_check.txt out/docker_build.txt out/export_sample.json out/schema_check.txt out/rule_check.txt scripts/rule_check.*"로 끝낸다. 혼자면 `[S 5/6] 검증·규모·동시성·컨테이너` 로 그 파일만 커밋한다.

## 끝 조건
out/ 측정 파일 6개(browser·scale·concurrency·docker_build·schema_check·rule_check)가 있고, 각각 PASS·FAIL·SKIP·미측정 중 하나가 적혀 있다.

## 보고 (5줄)
한 일 / 검증: 200 경로 n/n · 10배 ms · 동시 요청 결과 · 컨테이너 판정 · 규칙 위반 건수 / 왜 이렇게 쟀나 1줄 / 리스크: 가장 먼저 깨지는 곳 / 다음: "PLAN 한계 문장을 A에게".

고치지 말고 멈춰라.
