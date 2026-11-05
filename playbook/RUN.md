# RUN — 막혔을 때·시간 볼 때만 여는 시간표 (평소엔 PROMPTS.md 한 장만 본다)
> 붙이는 글은 전부 `_playbook/PROMPTS.md`의 ▶ 상자에 있다 — 여기 ‘이름’은 그 상자의 첫 줄(`$이름`)이다. 상자 안 〔 〕는 과제의 말로 채운다.
> 담당자 DM은 `ASK.md`, 제출 전 읽기는 `DEFEND.md`. 숫자는 out/ 파일에서만. 멈춘 뒤 내가 본 것은 `기록만 해라:`로 남긴다 — 이 한 줄이 서술형 재료다.

## 창 셋 · 공통
| 창 | 이름 | 무엇 | 언제 |
|---|---|---|---|
| 1 | Codex | `codex` 하나. 설정은 S0에 한 번(`/fast` 토글 켬 · `/model` medium · `/status`), 이후 만지지 않는다(xhigh 금지). S4 120분과 S6 리뷰에서만 `/quit` → `codex`로 세션을 바꾼다 | 전 구간 |
| 2 | 터미널 | Codex 없이 bash `$`에 직접: clone·bootstrap·git log·curl·check_evidence·rm -rf _playbook | 전 구간 |
| 3 | 서버 | `PORT=3000 node server.js` 하나만(`&` 없이 — 로그가 보인다). 코드가 바뀌면 Ctrl+C → 같은 명령 | S3~ |
- 병렬은 없다. 창 1에서 하나가 멈추면 다음 상자를 붙인다. DM만 Enter 직후 보내고 답을 기다리지 않는다.
- bash에 붙였다(`syntax error near unexpected token`·`^[[200~`·`/status: No such file`) → Ctrl+C → `codex` → `›` 뜬 뒤 붙인다. `[1]+ Stopped codex` → `fg`. 승인 창이 매번 뜬다 → `/quit` → `codex -s workspace-write -a never -c sandbox_workspace_write.network_access=true` → `/status`.
- 쓰지 않는다: "다 해 줘"·"알아서"·"계속"·같은 상자를 글자 그대로 두 번·README 통째 붙여넣기. 상자의 〔 〕를 비우거나 일반어로 메우지 않는다 — 과제 단어·담당자 단어·숫자가 들어가야 내 이해와 판단이 기록에 남는다.

- **시간표**: S0 0~8 · S1 8~30 · S2 30~48 · S3 48~55 · S4 1패스 55~120 · S4 2패스 120~150 · S5 150~163 · S6 163~172 · 읽기 172~180. **163분이 유일한 고정선**(S5를 끊고 S6으로). 1패스에 남은 행이 있으면 2패스 대신 1패스를 계속한다.
- 시간이 남으면 보강 순서: defend '기록 없음' 0 → ★ 행 경계 테스트 1 → prove → readme 재실행 → 중간 보고 DM → decide. 새 기능은 만들지 않는다.
- **지시 시간 상한 12분**: 넘으면 Esc·둘로 쪼갠다(verify 제외).

## S0 세팅 (0~8분)
- 강제 이동: 8분이면 양식이 덜 돼도 S1로.
- 치는 것: PROMPTS.md S0 1→5(‘s0’).
1. [창 2] clone + bootstrap.
   - 내 눈: 출력 "원래 있던 것"에 README·데이터, README_RUN 머리에 작업 틀 출처 줄.
   - 안 되면: clone 실패 → 한 번만 재시도, 그래도 안 되면 에디터에 AGENTS.md 규칙 12줄을 직접 치고 S1로. `/tmp`에 못 쓴다 → `.harness`로 받고 `echo ".harness/" >> .git/info/exclude`. node가 없다 → `sh /tmp/harness/bootstrap.sh`.
2. [창 1] `codex` → `/fast` → `/model`(medium) → `/status` → ‘s0’(/status 출력을 끝에).
   - 내 눈: 보고 첫 줄 "이번 목적:" · 규칙 요약이 12줄과 맞다 · git log에 [S 0/6].
   - 안 되면: "이번 목적:"이 없다 = `$명령` 인식 안 됨 → 이후 상자 첫 줄을 `.agents/skills/이름/SKILL.md 절차대로:`로. [S 0/6]이 없다(Operation not permitted) → 커밋은 내가 창 2에서 `git add -A && git commit -m "[S n/6] …"`.
   - 안 되면: fast가 default로 보인다(`/fast`는 토글 — 한 번 치면 priority=켜짐, 두 번 치면 default=꺼짐; /fast on 이라는 명령은 없다) → `/fast` 한 번 더 → `/status`.
3. [창 2] `git log --oneline && ls -R data && wc -l README.md && ls -d src` → 유형 표.

| 유형 | 신호 | 대응 |
|---|---|---|
| ① 장문·요구 다수·알고리즘 행 | README 2,000줄 안팎, 요구 9행↑, 최적·배치 동사 | ‘s1’에 `장문` · ‘algo’ · 묶음 |
| ② 짧은 README·CSV·규칙형 | README 150줄 안팎, data/가 CSV | 기본 운영 그대로 |
| ③ 수치+텍스트 혼합 데이터 | data/에 CSV와 JSON·TXT·MD | inventory 폴백 표를 먼저 보고 텍스트 처리 범위를 DM 1로 |
| ④ 기존 코드 수정·외부 API | src/ 있음, 'API·연동' 문장 | S3 뼈대 대신 기존 코드 실행부터, 키 없으면 가짜 응답을 PLAN 가정에 |
| ⑤ 요구 충돌형 | 두 규칙이 동시에 성립 못 함 | ‘plan’ 보고 끝 '충돌:' 줄 → 어느 쪽을 먼저 지킬지 내가 DECISIONS D7에 |

## S1 요구·껍데기 (8~30분)
- 강제 이동: 30분이면 표가 덜 돼도 S2로(빠진 행은 담당자 답으로 메운다).
- 치는 것: PROMPTS.md S1 1→5(‘s1’ → DM 1·2 → 숨은 제약 → 기록).
1. [창 1] ‘s1’ — Enter 직후 기다리지 말고 15분에 DM 1·2 먼저(답은 기다리지 않는다).
   - 내 눈: 보고 첫 줄 "요구 n · 규칙 n · 산출물 n"이 표 행 수와 같다. 껍데기 목록에 README 백틱 파일이 다 있다.
   - 안 되면: 원문과 다른 행이 있다 → `〔R번호〕 행만 README 원문으로 고쳐라`. README가 언어·프레임워크를 정했다 → S3에서 ‘s3’ 대신 ‘traps’.
   - 안 되면: "번호 목록 요구가 0개" 경고 → 스킬이 문단마다 행으로 옮긴다(묻지 않는다) — 행 수를 내가 센다.
2. [DM] DM 1 → 답 뒤 DM 2. 답은 LOG '담당자 대화'에 Codex가 적는다(원문만 붙인다).
3. [창 1] 30분 전 ‘기록만 해라: REQUIREMENTS n행…’.

## S2 질문·PLAN (30~48분)
- 강제 이동: 48분이면 답이 덜 와도 ‘plan’ — 잠정값은 PLAN 가정에.
- 치는 것: PROMPTS.md S2 1→7(‘ask’ → DM → 답 붙이기 → ‘algo’ → ‘plan’ → 확인 DM → 맞다·기록).
1. [창 1] ‘ask’ → [DM] 위 번호부터 한 메시지에 하나씩(답을 기다리지 않는다).
   - 내 눈: 첫 두 행이 DM 1·2, 그다음 지목 조건, 질문마다 숫자 제안형.
   - 안 되면: "[n]번 답인가요?" → 숫자만. 답이 두 뜻·"판단해 주세요" → ‘판단 넘김’ 상자 → ‘내 선택’.
2. [창 1] 핵심 행이 있으면 `$plan` 직전 `$algo R★` — 표가 오면 `기준 a 후보 n`과 고른 이유 한 줄.
   - 내 눈: 평가 기준 표, 후보 3행과 기준 충족 칸, 기준별 탈락 이유, 추천 한 줄.
   - 안 되면: 8분을 넘긴다 → Esc, 후보 둘로 줄여 다시.
3. [창 1] ‘plan’ → [DM] 확인 DM → 답 붙이기 → `1A 2B`·`R25 만들 R26 뺄` → `맞다` → ‘기록-합의’.
   - 내 눈: 만들 것/안 만들 것 빈 행 0, ★ 3개, 확인 받은 시각이 PLAN 합의 기록에.
   - 안 되면: 새로 나온 요구가 3개 이상 → Codex가 다시 만든 확인 DM을 보내고 답을 그대로.

## S3 뼈대·로그인 눈 확인 (48~55분)
- 강제 이동: 55분이면 로그인 화면만 보고 S4로.
- 치는 것: PROMPTS.md S3 1→7(bootstrap --scaffold → ‘s3’ → 서버 → curl → Browser → 기록 → ‘screen’).
1. [창 2] `node /tmp/harness/bootstrap.mjs --scaffold node-v2 --with plan` → [창 1] ‘s3’(README가 언어를 정했으면 ‘traps’).
   - 내 눈: out/test_result.txt 스모크 통과, [S 3/6] 커밋.
   - 안 되면: '뼈대 부품:' 줄이 비어 있다 → [창 1] `PLAN '- 뼈대 부품:' 줄만 auth,store,lock,schema,docker 중에서 채워라, 없으면 없음` → 다시. Codex가 서버를 띄운 채 멈춤 → Ctrl+C → `서버는 내가 띄운다. 너는 curl만`.
2. [창 3] `PORT=3000 node server.js` → [창 2] `ss -ltnp | grep 3000 && curl -s localhost:3000/health` → [Browser] Port `3000` · Path `/` 로그인 1회 → [창 1] ‘기록-로그인 화면’ → ‘screen’.
   - 내 눈: curl 200, Browser에 로그인 뒤 화면, screen_check 표에 빈 화면·로그인 실패 0행.
   - 안 되면: 포트 사용 중 → `PORT=3001 node server.js`(Browser Port·README_RUN·screen 포트도 3001). 빈 화면 → `node /tmp/harness/scripts/diag_web.mjs 3000` → FAIL 줄을 ‘debug’ 증상에 → 창 3 재시작.

## S4 기능 (55~150분) — 1패스 얇게 → 2패스 깊게
- 강제 이동: **100분**에 만들 것 행이 반 미만이면 묶음으로 전환 · **120분** 세션 교체 판단 · **150분** 무조건 S5.
- 치는 것: PROMPTS.md S4 1→8(‘feat’ 행마다 → 퀴즈 답 → 요구 밖 되돌리기 → DM 중간 보고 → 문서 → 세션 교체 → 깊게 ‘feat’ + ‘prove’ → DM).
1. [창 1] ‘feat’(얇게, 첫 행) — 상자의 〔 〕를 행마다 새로 채운다. 퀴즈는 코드를 보지 않고 `1A 2B 3A 4B`처럼 답한다 — 비울 칸: 네 글자. 틀린 고름 2개 이상이면 커밋하지 않는다.
   - 내 눈: 테스트 3개 이름(정상·경계·오류), 경계가 담당자 기준값과 딱 같은 값, 커밋 메시지 [S 4/6] R번호, 설명 카드 1장.
   - 안 되면: 틀린 고름 2개 이상 → `가`(단순화, 퀴즈 다시) 또는 `나`(제외). 테스트 실패 → 기대값 바꾸지 말고 담당자 답 기준으로 판단 한 줄. 같은 지시로 두 번 실패 → ‘debug’. 12분 초과 → Esc, 둘로.
   - 안 되면: 요구 밖 기능이 보인다 → ‘반응-요구 밖’ 상자(과제당 최소 1회 — DECISIONS '거부한 것'이 비면 서술 Q3 재료가 없다).
2. [DM] 첫 기능 직후(~75분) 중간 보고 → 만들 것 행이 끝날 때까지 1번 반복 → [창 1] 문서 채우기(~110분).
3. **120분**: Codex가 S2 결정을 잊거나 보고가 느려지면 ‘세션 교체-기록’ → `/quit` → `codex` → ‘세션 교체-새 탭’. 아니면 건너뛴다.
4. [창 1] 2패스 — ★1 행을 ‘feat’ 깊게(범위 〔깊게: 지표 1 + 규칙 1〕) → ‘prove’ → [DM] ~150분 숫자 보고. 끝 조건: 안 만들 것 = X행과 README 제외만.
   - 내 눈: out/prove.md 비교표 네 줄(현행·기준안·우리 안·하한)과 하한 대비 %.
   - 안 되면: prove가 35분 안에 안 끝난다 → 현행 vs 우리 안 두 줄로.

## S5 검증·규모·동시성·docker (150~163분)
- 강제 이동: **163분**이면 verify가 덜 돼도 S6(남은 측정은 PLAN 한계에).
- 치는 것: PROMPTS.md S5 1→4(‘verify’ → DM → 기록·커밋 → ‘decide’).
1. [창 1] ‘verify’ → [DM] 결과 확인 → [에디터] out/ 열기 → [창 1] ‘기록만 해라: out/…에서 …를 봤다’ → `[S 5/6] 검증·측정` 커밋.
   - 내 눈: out/rule_check.txt 위반 건수, out/concurrency_check.txt 200·409 수, out/scale_check.txt 10배 ms, out/docker_build.txt PASS/FAIL/SKIP.
   - 안 되면: docker build 실패 → 의존성 0으로·`mkdir -p /app/var && chown`·못 고치면 PLAN 한계에. 200이 아닌 경로 → `200이 아닌 경로마다 원인 한 줄과 고칠 곳 하나씩 제안만 하고 멈춰라` → 고를 것만.
2. [창 1] ‘decide’(`$decide`) → 표가 오면 `D1-A② D2-B① 거부-A③ 고정 절 맞다`처럼 번호로만.
   - 내 눈: DECISIONS 결정 칸의 '내 선택 — 이유' 수, git show --stat HEAD.
   - 안 되면: 이유 후보에 내 이유가 없다 → `D1-A 이유: 〔한 줄〕`로 직접 친다.

## S6 리뷰·설명 준비·제출 (163~172분)
- 강제 이동: 172분이면 ‘마감’만 치고 읽기로.
- 치는 것: PROMPTS.md S6 1→7(세션 교체 → ‘readme’ → ‘반영’ → ‘defend’ → check_evidence → ‘마감’ → git status) → 제출.
1. [창 1] `/quit` → `codex` → `/fast` → `/model`(medium) → `/status` → ‘readme’(리뷰어 — 새 세션이 새 눈이다) → ‘반영’(고칠 것만) → ‘defend’ → `Q1-A Q2-B Q3-A`로 고른다.
   - 내 눈: out/readme_check.md FAIL·미검증 목록, LOG "## 설명 준비" 6장, out/defend_cards.md '기록 없음' 수.
   - 안 되면: FAIL이 많다 → 제출을 막는 것(제출물 파일 없음·다루지 않는 범위가 코드에 있음)만 고친다.
2. [창 2] `node /tmp/harness/scripts/check_evidence.mjs` → "제출 가능"까지 FAIL만 → [창 1] ‘마감’ → [창 2] `git status` → [에디터] out/defend_cards.md·LOG "## 설명 준비" 읽기(≥8분).
   - 내 눈: check_evidence FAIL 0, git status 깨끗.
   - 안 되면: FAIL 양식 → `그 문서의 빈 칸을 LOG·out/ 근거로만 채워라, 근거 없으면 "미확인"`. FAIL git 상태 → `커밋 안 된 파일 목록을 보여 줘라`.
3. 제출: [창 2] `rm -rf _playbook` → 에디터 "저장됨" → "제출하고 문제풀기" → 미리보기 → "제출물 확정하고 문제풀기" → 제출 ID·시각·파일 수 확인.

## 뒤에 두는 것
- 기본 운영은 창 셋 순차다. 역할 카드(`$role-a`·`$role-c`·`$role-d`·`$role-b`·`$role-a2`)는 스킬로만 남아 있다.
4탭 확장(탭마다 역할·중계): refs/PARALLEL4.md — 병렬이 필요할 때만 연다.
