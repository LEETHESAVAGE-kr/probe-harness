---
name: s0
description: S0 세팅 — bootstrap이 깐 양식 중 빠진 것만 만들고, /status 내용을 LOG '도구 설정'에 적고, AGENTS 규칙을 한 줄로 요약한 뒤 [S 0/6] 커밋한다. 사용자가 "$s0" 뒤에 /status 출력을 붙여 보내면 쓴다.
---

고치는 파일: 빠진 양식 파일(PLAN·LOG·DECISIONS·VERIFY·README_RUN·tests/·out/) · LOG.md '도구 설정' 절. README.md와 제공 데이터는 읽기만 한다.

> 사용자가 명령 뒤에 붙인 목적·범위·하지 마라·내 판단·확인 줄은 이 파일의 지시보다 우선한다(고치는 파일 범위와 "멈춰라"는 그대로). 보고 첫 줄에 "이번 목적: …"을 그 문장 그대로 옮기고, 붙인 줄이 없으면 리스크 칸에 "[목적 줄 없음]"이라고 적는다.

# $s0 — 세팅 (S0, 0~10분)

## 할 일
1. AGENTS.md를 읽는다(이번 한 번. 이후엔 사용자가 "AGENTS.md를 따라:"라고 할 때만).
2. PLAN.md·LOG.md·DECISIONS.md·VERIFY.md·README_RUN.md·tests/·out/ 중 **없는 것만** 표 머리로 만든다. 있는 파일은 열지도 고치지도 않는다. git 저장소가 아니면 `git init`, 빈 폴더는 `.gitkeep`.
3. 사용자가 붙인 /status 내용에서 모델·추론 강도·승인 모드·작업 폴더를 LOG '도구 설정'에 한 줄씩 적는다. 붙인 내용이 없으면 "/status 확인 필요"라고 적는다.
4. 승인 모드가 "never"가 아니면 보고에 한 줄: "/quit → `codex -s workspace-write -a never -c sandbox_workspace_write.network_access=true`". 추론 강도가 xhigh면 보고에 한 줄: "C·D 탭은 `/model`에서 한 단계 낮춘다(문서·측정은 낮아도 된다)".
5. `[S 0/6] 양식·도구 설정` 으로 커밋하고 `git show --stat HEAD`를 붙인다. 역할 카드 B·C·D로 일하는 세션이면 커밋하지 말고 "커밋 준비됨: 파일 목록"으로 끝낸다.

## 하지 않는 것
구현 / README.md·데이터 수정 / 이미 있는 양식 덮어쓰기.

## 끝 조건
양식 파일이 다 있고 LOG '도구 설정'이 채워진 커밋이 있다.

## 보고 (5줄)
한 일 / 검증: git show --stat의 파일 수 / 왜: AGENTS 전후 규칙 한 줄 요약 / 리스크: 승인 모드 1줄 / 다음: "`$s1`".

보고를 마치면 멈춰라.
