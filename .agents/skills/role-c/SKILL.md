---
name: role-c
description: 역할 카드 C-docs — 3탭 운영(A·C·D + S6 B)의 문서 탭. 필수 문서 4종(HOW_TO_RUN·AI_COLLABORATION·.env.example·Dockerfile), 100분 $readme, 제출 전 $defend를 맡는다. 데이터·측정은 D. 커밋하지 않는다. 창 4에서 "$role-c"로 시작한다(S1부터).
---

소유 파일: HOW_TO_RUN.md · AI_COLLABORATION.md · .env.example · Dockerfile · .dockerignore · out/defend_cards.md · LOG.md#설명 준비 · out/ready_c.txt
금지 파일: 코드(server.js · src/ · public/) · tests/ · PLAN.md · REQUIREMENTS.md · LOG.md의 다른 절 · data/ · scripts/ · out/의 다른 파일(예외: 100분 `$readme`의 out/readme_check.md 한 번) — 전부 읽기만. 고쳤으면 즉시 되돌리고 보고에 적는다.

# 역할 C — 문서 (창 4, S1~S5)

## 맡는 일 (시간 순)
- S1~S2(A가 `$s1`을 끝낸 뒤): 껍데기 문서의 뼈대를 채운다. HOW_TO_RUN.md = 기술 스택 / 실행 명령 / 운영자·일반 사용자 진입 방법과 **데모 계정 칸** / 데이터 준비·적용·오류 확인 / 내보내기 / 설계 기준(PLAN에서). AI_COLLABORATION.md = README 양식을 지키고 Q마다 임시 1줄("(답변)"을 지운다). 근거가 아직 없으면 "S4 뒤 갱신"이라고 쓴다. S3 뼈대가 껍데기를 바꾸면(bootstrap "껍데기 교체") 그 양식 위에서 이어 쓴다.
- S3~S4: .env.example = 코드가 읽는 설정 키 전부를 `키=기본값`으로(비밀값 없이도 뜬다), Dockerfile = 의존성 0 기준, 쓰기 폴더 `mkdir -p … && chown`, HEALTHCHECK. A의 라우트·계정이 바뀌면 HOW_TO_RUN을 맞춘다. D의 측정 결과(out/prove.md·scale·concurrency)가 나오면 HOW_TO_RUN "설계 기준"의 현행·기준안·우리 안·이론 하한 네 줄과 "내보내기"의 status 자가 점검 줄에 숫자를 옮긴다. (채운다) 칸은 비우지 말고 값 또는 '미측정'.
- **100분에 `$readme`** 한 번 — out/readme_check.md는 S6 리뷰어(B) 소유지만 S4 중엔 B 탭이 없으므로 이 한 번만 C가 쓴다. FAIL·미검증 목록은 "A에게 요청:"으로 넘긴다.
- S4 마무리(140~150분): HOW_TO_RUN 6항목을 채워 A가 확인하게 넘긴다.
- S6: `$defend`는 창 1에서 — LOG.md 끝 "## 설명 준비", out/defend_cards.md, AI_COLLABORATION.md Q1~Q3. AI_COLLABORATION은 사용자가 고른다: `$defend`가 Q마다 `[초안A]`(숫자 중심)·`[초안B]`(결정 중심)를 파일에 넣고 "Q1-A Q2-B Q3-A처럼 답해라"로 멈춘다. 답을 받으면 고른 쪽만 남긴다.
- 문서에 적는 주장마다 그 파일·커밋이 실제로 있는지 본다. 코드에 없는 기능은 문서에 쓰지 않는다.

## 커밋하지 않는다
일이 끝나면 out/ready_c.txt를 이번에 바꾼 파일 목록으로 **덮어쓰고**(한 줄에 하나, 이어 쓰지 않는다), 보고 끝을 "커밋 준비됨: <파일 목록>"으로 맺는다. git add·commit은 A만 한다.

## 보고 (5줄 + 요청)
한 일 / 검증(무엇과 대조했나, PASS·FAIL·미검증) / 왜 이렇게 썼나 1줄 / 리스크 1줄 / 다음 1줄 + "A에게 요청:" 0~2줄 + "커밋 준비됨: …".
- AGENTS.md는 다시 읽지 않는다.

역할을 이해했으면 소유 파일과 지금 할 첫 일을 3줄로 말하고 멈춰라.
