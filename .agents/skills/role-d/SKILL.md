---
name: role-d
description: 역할 카드 D-data — 3탭 운영(A·C·D + S6 B)의 데이터·측정 탭(S3~S5). 첫 일은 데이터셋 2벌, S4 깊게 구간에 $prove 필수, S5 $verify·$screen. 커밋하지 않는다. 탭 3에서 "$role-d"로 시작한다(S3부터 — 중계가 10건을 넘으면 S5부터).
---

소유 파일: data/prepared/ · scripts/ · out/changes_log.md · out/screen_check.md · out/screens/ · out/prove.md · out/prove_*.json · out/browser_check.txt · out/scale_check.txt · out/concurrency_check.txt · out/docker_build.txt · out/export_sample.json · out/schema_check.txt · out/ready_d.txt
금지 파일: 제공 원본 데이터 · 코드(server.js · src/ · public/) · tests/ · PLAN.md · REQUIREMENTS.md · LOG.md · 문서 4종 — 전부 읽기만. 고쳤으면 즉시 되돌리고 보고에 적는다.

# 역할 D — 데이터·측정 (탭 3, S3~S5)

## 맡는 일 (시간 순)
- **첫 일은 데이터셋 2벌**(A와 독립이라 기다림이 없다): README가 데이터셋 준비를 요구하면 원본을 바꾸지 않고 data/prepared/에 **정상 변경 1벌 + 잘못된 입력 1벌**을 만든다. 만드는 코드는 scripts/에(재현 가능하게). 결과나 오류 문구를 미리 박지 않는다 — 실제 검증 코드가 무엇을 잡는지 보게 둔다.
- 데이터를 빼·바꾸·합치기 전마다 `node /tmp/harness/scripts/changes_log.mjs`로 out/changes_log.md에 전후 행을 남긴다(A의 요청이 오면 그 처리 전에).
- S3 끝: `$screen`으로 로그인 1화면 이상 → out/screen_check.md·out/screens/. playwright가 없으면 "미측정" 표와 체크 목록을 사용자에게 넘긴다(판정을 꾸며 내지 않는다).
- **S4 2패스(120~150분): `$prove` 필수** — PLAN 성공 기준에서 지표 1개, 현행(제공 실적이 있을 때)·기준안·우리 안·하한을 실제 실행해 out/prove_*.json → out/prove.md(표 숫자는 prove_table.mjs가 옮긴다). 35분 안에 안 끝나면 현행 vs 우리 안 두 줄로 줄인다.
- S5 (`$verify`): 사용자가 띄운 서버에 ss·curl → out/browser_check.txt / 10배 입력 → out/scale_check.txt / 같은 쓰기 요청 2개 동시 → out/concurrency_check.txt / `sh scripts/verify_container.sh` → out/docker_build.txt(Docker가 없으면 SKIP 그대로) / 내보내기 샘플 스키마 대조 → out/schema_check.txt. 서버는 띄우거나 끄지 않는다. 이어서 `$screen` 전체.
- 실패한 측정은 고치지 않고 "PLAN 한계에 넣을 문장" 한 줄로 A에게 넘긴다.

## 커밋하지 않는다
일이 끝나면 out/ready_d.txt를 이번에 바꾼 파일 목록으로 **덮어쓰고**(한 줄에 하나, 이어 쓰지 않는다), 보고 끝을 "커밋 준비됨: <파일 목록>"으로 맺는다. git add·commit은 A만 한다.

## 보고 (5줄 + 요청)
한 일 / 검증(명령·출력의 숫자) / 왜 이렇게 했나 1줄 / 리스크 1줄 / 다음 1줄 + "A에게 요청:" 0~2줄 + "커밋 준비됨: …".
- AGENTS.md는 다시 읽지 않는다.

역할을 이해했으면 소유 파일과 지금 할 첫 일을 3줄로 말하고 멈춰라.
