# RUN — 시험 중 여는 시간표 ("지금 몇 분이냐"로 해당 칸만 본다)
> 명령은 Codex 입력칸(`›`)에 `$명령` + **내 문장 4줄**. 치는 글은 전부 `_playbook/PROMPTS.md`에 있다 — 여기 ‘이름’이 나오면 PROMPTS.md 블록을 통째로 붙인다 — $ 인식 여부와 무관. `<…>` 칸만 바꾸고(선택지 `<가/나>`는 하나만), 블록 아래 "비울 칸:"이 어디서 채우는지 알려 준다.
> 담당자 DM은 `ASK.md`, 제출 전 읽기는 `DEFEND.md`. 숫자는 out/ 파일에서만. 멈춘 뒤 내가 본 것은 이름이 '기록-'으로 시작하는 블록(`기록만 해라:`)으로 남긴다 — 이 한 줄이 서술형 재료다.

## 지시 틀 · 반응 문장
> `$명령` 목적: <왜 지금 이걸 하나> — 근거: <담당자 HH:MM 답 또는 README:줄>
> 범위: <이번에 할 것만> / 하지 마라: <다음 R번호·요구 밖 기능> / 고칠 파일: <파일>
> 내 판단: <가/나 중 고른 것> — 이유: <한 줄(더 단순한 쪽을 고른 이유 등)>
> 확인: 끝나면 내가 <out 파일·테스트 이름>에서 <무엇을 숫자로> 본다
- 결과를 받으면 반응 한 줄: PROMPTS.md ‘반응-요구 밖’·‘반응-내가 검증’·‘반응-바로잡기’·‘반응-의도 갱신’·‘반응-접근 변경’·‘반응-숫자 없는 완료’ 블록.
- 쓰지 않는다: "다 해 줘"·"알아서"·"계속"·"좋아 진행해"·같은 지시 반복·README 통째 붙여넣기. `$명령`은 Codex `›`에만 — bash에 치면 빈 변수로 조용히 사라진다.

## 공통 · 탭
- bash에 붙였다(`syntax error near unexpected token`·`^[[200~`·`/status: No such file`) → Ctrl+C → `codex` → `›` 뜬 뒤 붙인다. `[1]+ Stopped codex` → `fg`, `>`에서 멈춤 → Ctrl+C. 승인 창이 매번 뜬다 → 그 탭 `/quit` → `codex -s workspace-write -a never -c sandbox_workspace_write.network_access=true` → `/status`로 확인.

| 창 | 이름 | Codex | 설정(고정) | 치는 명령 | 커밋 | 언제 |
|---|---|---|---|---|---|---|
| 1 | 판단 | ○ | high · fast on | 역할 카드 없음 · $algo R★ · $plan · $decide · $defend | ○ (S2·S5·S6에만) | S2, S5~S6 |
| 2 | A 구현 | ○ | medium · fast on | $role-a로 시작 · $s0 · $s1 · $ask · $feat(묶음) · $debug | ○ (S0·S1·S4에만) | S0~S4 |
| 3 | A2 구현 | ○ | medium · fast on | $role-a2 | ○ ([A2] 접두, 자기 파일만) | S4 첫 A 커밋 뒤 |
| 4 | C 문서 | ○ | medium · fast on | $role-c · 100분 $readme | × | S1~S5 |
| 5 | D 측정 | ○ | medium · fast on | $role-d · $verify · $screen · $prove | × | S3~S5 |
| 6 | 터미널 | × | — | clone+bootstrap · git status · curl · check_evidence · rm -rf _playbook | — | 전 구간 |
| 7 | B 리뷰 | ○ | medium · fast on | $role-b · $readme | × | S6만 (새 세션) |
| 8 | 서버 | × | — | `PORT=3000 node server.js` 하나만(`&` 쓰지 않음, 로그가 이 창에 그대로 보인다. 코드가 바뀌면 Ctrl+C → 같은 명령) | — | S3~ |
- 규칙 ①: 창 1과 창 2는 같은 시간에 커밋하지 않는다 — S2 끝 PLAN 커밋(창 1) 뒤에 S4 첫 feat(창 2), 163분에 창 2가 멈춘 뒤 창 1이 $decide·$defend. 창 3은 자기 파일만.
- 규칙 ②: S0 속도 설정 줄.
- 규칙 ③: 창을 바꿀 땐 탭 이름을 본다. 명령이 표의 창과 다르면 치지 않고 창을 옮긴다.
- 가동 수: S0 **A** / S1~S2 창 2(+창 4 C) / S3~S5 **A+C+D** / S6 **A+B+C**. 커밋: 창 1·2·3만, 시간대 분리(규칙 ①). 탭 이름: `printf '\033]0;2 A 구현\007'`. 중계는 나: C·D·B 보고 끝 `A에게 요청: …`을 A에 붙인다. C·D·B는 `커밋 준비됨`으로 멈추고 A가 `handoff.mjs`의 `git add`로 커밋한다. 중계가 10건을 넘으면 D를 S5로 내린다 — 그때까지 데이터셋은 C, 깊게 구간 `$prove`는 C가 돌린다.

- **시간표**: S0 0~8 · S1 8~30 · S2 30~48 · S4 1패스 48~120(S3 포함) · S4 2패스 120~150 · S5 150~163 · S6 163~172 · 읽기 172~180. **163분이 유일한 고정선**(S5를 끊고 S6으로). 1패스에 남은 행이 있으면 2패스 대신 1패스를 계속한다.
- 시간이 남으면 보강 순서: defend '기록 없음' 0 → ★ 행 경계 테스트 1 → prove → readme 재실행 → 중간 보고 DM → decide. 새 기능은 만들지 않는다.
- **지시 시간 상한 12분**: 넘으면 Esc·둘로 쪼갠다(verify 제외).

## S0 세팅 (0~8분) — A
- 강제 이동: 8분이면 양식이 덜 돼도 S1로.
- 치는 것: 터미널 `git clone --depth 1 https://github.com/LEETHESAVAGE-kr/probe-harness /tmp/harness && node /tmp/harness/bootstrap.mjs` → 창 8개 → A·C에서 `codex` → `/status` → 승인 모드가 never가 아니면 `/quit` 뒤 `codex -s workspace-write -a never -c sandbox_workspace_write.network_access=true`로 다시 띄운다 → A에 PROMPTS.md ‘s0’ 블록 + /status 출력. 에디터에서 `_playbook/PROMPTS.md`를 옆에 열어 둔다.
- 내 눈: bootstrap "원래 있던 것"에 README·데이터, README_RUN 머리에 작업 틀 출처 줄. 보고의 규칙 요약이 규칙 12줄과 맞나(규칙 인식 확인). 첫 파일을 열고 **Alt+Z**.
- 속도 설정: 창마다 표의 강도로 한 번, 이후 변경 없음. xhigh 금지, `/status` 결과는 LOG '도구 설정'에.
- 규칙 ②: 모든 창은 S0에서 /fast on → /model(강도) → /status 한 번, 이후 설정을 만지지 않는다. 느리면 지시 크기를 줄인다(12분 규칙).
- `/fast status`가 꺼져 있으면 `/model`에서 fast가 되는 모델로 바꾼다.
- 유형 판별: `ls -R data` · `wc -l README.md` · src/ 유무로 고른다.

| 유형 | 신호 | 대응 |
|---|---|---|
| ① 장문·요구 다수·알고리즘 행 | README 2,000줄 안팎, 요구 9행↑, 최적·배치 동사 | `$s1` 장문 · `$algo` · 묶음 · A2 |
| ② 짧은 README·CSV·규칙형 | README 150줄 안팎, data/가 CSV | 기본 운영 그대로 |
| ③ 수치+텍스트 혼합 데이터 | data/에 CSV와 JSON·TXT·MD | inventory 폴백 표를 먼저 보고 텍스트 처리 범위를 DM 1로 |
| ④ 기존 코드 수정·외부 API | src/ 있음, 'API·연동' 문장 | S3 뼈대 대신 기존 코드 실행부터, 키 없으면 가짜 응답을 PLAN 가정에 |
| ⑤ 요구 충돌형 | 동시에 못 지키는 두 문장 | `$plan` '충돌:' 줄 → 내가 D7에 고른다 |

- 내 눈: s0 보고 첫 줄에 "이번 목적:"이 없으면 `$명령`이 인식되지 않는 것 — 이후 블록은 PROMPTS.md의 같은 이름 블록을 그대로 쓴다(`$` 없이도 동작하게 만들어져 있는지 확인하고, 아니면 `/tmp/harness/refs/BOXES.md` 상자).
- 내 눈: 창 6에서 `git log --oneline`에 [S 0/6]이 없으면(Operation not permitted) 이후 모든 커밋은 내가 창 6에서 `git add -A && git commit -m "[S n/6] …"`으로 친다 — A에는 `커밋은 내가 한다, 너는 git add 목록만`이라고 한 줄.
- 터지는 것: `/tmp`에 못 쓴다 → `.harness`로 받고 `echo ".harness/" >> .git/info/exclude`, 이후 경로 `./.harness`. node가 없다 → `sh /tmp/harness/bootstrap.sh`.
- 터지는 것: clone이 안 된다 → 한 번만 재시도, 안 되면 에디터에 AGENTS.md 규칙 12줄을 직접 치고 첫 지시 `작업 규칙: README 최우선, push·외부 전송 금지, 0.0.0.0, 요구를 표로 만든 뒤 내 승인 뒤 구현, 단계마다 테스트·커밋, 답은 한 일·검증·왜·다음`.

## S1 요구·껍데기 (8~30분) — A + C
- 강제 이동: 30분이면 inventory가 덜 돼도 ‘ask’로(빠진 것은 기록만).
- 치는 것: A에 PROMPTS.md ‘s1’ 블록 → 숨은 제약(data/README·스키마 md의 "휴무자 제외", 키 이름)이 표에 없으면 ‘숨은 제약’ → 맞으면 ‘기록-요구표’. **15분에 DM 1·2 먼저**(ASK.md 맨 위). 장문이면 범위 줄에 `장문`. C는 `$role-c` — 껍데기가 생기면 HOW_TO_RUN 뼈대·AI_COLLABORATION 임시 1줄.
- 내 눈: 껍데기 파일이 탐색기에 보인다. `$s1`의 "뼈대 추천" 근거 줄을 README에서 본다(깔 부품은 PLAN에서 정한다).
- 터지는 것: 번호 없는 README → `$s1`이 문단을 '요구(번호 없음)' 행으로 옮긴다. 원문과 다른 행은 그 행만 원문으로 고치라고 한다.
- 터지는 것: README가 다른 언어·프레임워크를 정했다 → S3에서 ‘s3’ 대신 PROMPTS.md ‘traps’ 블록.

## S2 질문·PLAN (30~48분) — A + C · 개수 상한 없음, 수확률로 멈춤
- 강제 이동: 48분이면 남은 질문은 중간 보고 DM으로 넘기고 PLAN 확인 DM을 보낸다. 최근 3답이 새 정보 없음이면 그 전에 ‘plan’.
- 치는 것: A에 PROMPTS.md ‘ask’ → DM(ASK.md, 한 번에 하나) → 답마다 ‘기록-담당자 답’ → `$plan` 직전 `$algo R★`(‘algo’) → ‘plan’ → 확인 DM(답을 기다리지 않음) → 확인 받으면 ‘기록-합의’.
- 창: `$algo`·`$plan`은 창 1.
- `$algo`: 핵심 행(최적·최소·배치·경로·일정·탐색·매칭 동사 / '~이내·~이상' 기준)에 반드시, 8분 상한, 생략 금지. 표가 오면 `후보 n`으로만 답한다.
- 내 눈: REQUIREMENTS 모든 행이 만들 것/안 만들 것 중 하나, 빠진 번호 0, 안 만들 것 = X행과 README 제외만, ★ 3개. AI_COLLABORATION Q1~Q3에 임시 1줄(C).
- 터지는 것: 한 주제에서 "아는 정보가 없어요"·"아까와 같아요"가 두 번 → 그 주제를 닫고 PLAN '가정'에.
- 터지는 것: 답이 두 뜻이다 / "판단해 주세요" → **내가 고른다**(이유가 서술형 재료). A에 ‘판단 넘김’ → 표를 보고 ‘내 선택’.

## S3 뼈대·로그인 눈 확인 (48~55분) — A + C + D
- 강제 이동: 55분이면 로그인 화면이 안 떠도 ‘debug’ 한 번 뒤 S4로(안 되는 것은 PLAN 한계).
- 치는 것: 창 6에서 `node /tmp/harness/bootstrap.mjs --scaffold node-v2 --with <PLAN이 정한 부품>`(바닥만이면 `--with` 없이) → 창 5 `codex` → `$role-d`(첫 일 데이터셋 2벌) → A에 PROMPTS.md ‘s3’ 블록 → 로그인 화면을 본 뒤 ‘기록-로그인 화면’.
- 내 눈: bootstrap 출력에 '껍데기 교체 3개'가 있고 Dockerfile 첫 줄이 FROM인가. 창 8 서버 → 창 6 `ss -ltnp | grep 3000`(0.0.0.0)·curl `/health` 200 → Browser Port 3000 · Path `/`에서 **로그인 1회를 내 눈으로**. 계정이 HOW_TO_RUN과 같은가. S3 끝에 D에 ‘screen’.
- 터지는 것: 빈 화면 → 창 6 `node /tmp/harness/scripts/diag_web.mjs 3000` → 멈춘 단계를 A에 ‘debug’(증상 칸). 로그인이 안 붙으면 쿠키 Secure·SameSite·Domain을 뺀다.
- 터지는 것: `EADDRINUSE` → 창 8 Ctrl+C → 같은 명령, 안 되면 `PORT=3001`(Browser·HOW_TO_RUN도). Codex가 서버를 띄운 채 멈춤 → Ctrl+C → `서버는 내가 띄운다. 너는 curl만`.

## S4 기능 (55~150분) — A + C + D · 1패스 얇게 → 2패스 깊게 1
- 강제 이동: **150분 S4 종료** — 끝 조건 안 만들 것 = X행과 README 제외만. 시간이 모자라면 깊게를 줄이고 얇게는 줄이지 않는다.
- 치는 것: A에 PROMPTS.md ‘feat’ 블록을 행마다(범위 칸에서 얇게/깊게를 고른다). 첫 기능 커밋 때 ‘첫 기능 커밋’. **100분: C에 ‘readme’** · **120분: 세션 교체 판단**(‘세션 교체-기록’ → 창 3 ‘세션 교체-새 탭’).
- **① 1패스 얇게 전 행 (55~120분)**: 만들 것 모든 행을 '얇게'로 — 최소 동작 1 + 테스트 1(경계 1개는 반드시), 커밋 1, 설명 카드 1. 뼈대가 든 행(로그인·배포·스키마·잠금)은 확인만.
- **② 깊게 1 + `$prove` (120~150분)**: ★1 핵심 계산 한 행만 '깊게' — 지표 1 + 규칙 1. 동시에 D에 PROMPTS.md ‘prove’ 블록(35분 안에 안 끝나면 현행 vs 우리 안 두 줄로).
- **③ 마무리 (140~150분)**: HOW_TO_RUN 6항목(C가 채운 것을 A가 확인) · 데이터셋 2벌(D) · 두 번째 중간 보고 DM(ASK.md ②′).
- 묶음: 같은 모듈 2~3행은 범위 칸 맨 앞에 `묶음: R3 R4 R5`. 보고 첫 줄의 경과 분이 12분을 넘으면 끊는다.
- 창: `$feat`는 창 2, A2는 창 3.
- A2 **기본 켬**: 첫 A 커밋 확인 뒤 · 분할표가 있을 때 창 3에 ‘role-a2’. 행 ≤8이거나 모듈 경계가 없으면 안 켠다.
- A2 충돌 복구: 창 6 `git status` → A2 파일만 `git stash push -- <파일>` → A 커밋 → `git stash pop`. 그래도 꼬이면 A2를 끄고 A 단독.
- 4문장 퀴즈(문장 4개 × A/B 두 판)가 오면 코드를 보지 않고 맞는 판을 고른다: `1A 2B 3A 4B`처럼 답한다 — 비울 칸: 네 글자. **틀린 고름 2개 이상이면 커밋하지 않는다** → `더 단순한 방식으로 바꿔라. 지금 방식은 PLAN 한계에 '대안(D1 대안)'으로 적고, 바꾼 뒤 퀴즈를 다시 내라`
- **거부 기록 회차당 최소 1회**: ‘반응-요구 밖’을 쓴다. `$feat` 보고에 `[거부 기록 0건]`이 보이면 그 결과에서 요구 밖·과설계를 찾아 쓴다(없으면 꾸며 내지 않고 리스크로 둔다). 데이터를 빼·바꾸·합치기 전에 D에 ‘전후 기록’.
- 내 눈: 기능 커밋마다 REQUIREMENTS 상태 칸 1개, 설명 카드 1장(총 = 만들 것 행 수, `- 기법:` 칸, `- 내 4문장:`에 퀴즈 정답 n/4), 커밋 괄호에 Dn. 경계 테스트 값이 담당자 기준값인가. 첫 기능이 끝까지 돈 직후(~75분) 중간 보고 DM ②.
- 터지는 것: 테스트 실패 → `기대값을 바꿔 통과시키지 마라. 코드가 틀렸는지 기대값이 틀렸는지 담당자 답 기준으로 한 줄 판단 뒤 멈춰라`.
- 터지는 것: 100분이 넘으면 Codex가 S2 결정을 잊는다 → 위 세션 교체. 같은 지시로 두 번 실패 → ‘반응-접근 변경’.

## S5 검증·규모·동시성·docker (150~163분) — A + C + D
- 창: `$decide`·`$defend`는 창 1, 창 2는 163분에 멈춤.
- 강제 이동: **163분부터 새 기능 금지** — 측정이 덜 끝나도 PLAN 한계에 "미검증"으로 적고 S6.
- 치는 것: D에 PROMPTS.md ‘verify’ → D에 ‘screen’ → 결과 DM(ASK.md ③, 성공 기준 숫자, 답을 기다리지 않음) → out/ 파일을 내가 연 뒤 ‘기록-out 확인’ → A에 ‘측정 커밋’ → 창 1에 ‘decide’ 블록(`$decide` — DECISIONS·고정 절은 내가 번호로 고르기만 한다).
- 내 눈: out/browser_check.txt(200)·scale_check(ms·건수)·concurrency_check(200·409)·docker_build(PASS/FAIL/SKIP)·prove.md 다 있다. `$decide` 표가 오면 `D1-A② D2-B① 거부-A③ 고정 절 맞다`처럼 번호로만 답한다. DECISIONS 결정 칸이 `내 선택: … — 이유: …`, 고정 절이 확정 표.
- 터지는 것: docker build 실패 → `npm install`이 네트워크를 타면 의존성 0으로, `USER node` 뒤 쓰기 오류면 `mkdir -p /app/var && chown`. 못 고치면 PLAN 한계에 사실대로.
- 터지는 것: 200이 아닌 경로 → `200이 아닌 경로마다 원인 한 줄과 고칠 곳 하나씩 제안만 하고 멈춰라` → 고를 것만 A에.

## S6 리뷰·설명 준비·제출 (163~172분) — A + B + C
- 창: `$decide`·`$defend`는 창 1, 창 2는 163분에 멈춤.
- 강제 이동: 172분이면 고치던 것을 멈추고 마감 커밋 → 8분 읽기 → 제출.
- 치는 것: 창 7 새 `codex` → `$role-b` → PROMPTS.md ‘readme’ → 고칠 것만 A에 ‘반영’ → 창 1에 ‘defend’ → 창 6 `node /tmp/harness/scripts/check_evidence.mjs`("제출 가능"까지 FAIL만) → A에 ‘마감’.
- 내 눈: out/defend_cards.md와 LOG "## 설명 준비"를 **읽기만(≥8분, DEFEND.md 순서)**. "기록 없음"은 지금 한 줄 메운다. AI_COLLABORATION은 Q1-A Q2-B Q3-A로 고른다(`$defend` 끝 질문에 번호로). `git status` 깨끗.
- 터지는 것: check_evidence FAIL — 양식 그대로 → `그 문서의 빈 칸을 LOG·out/ 근거로만 채워라, 근거 없으면 "미확인"` / git 상태 → `커밋 안 된 파일 목록을 보여 줘라`.
- 터지는 것: 마지막 10분 → 새 작업 금지, ‘마감’ 블록만. 미리보기에 파일 일부만 보이는 것은 정상.
- 제출: `rm -rf _playbook` → 에디터 "저장됨" → "제출하고 문제풀기" → 미리보기 → "제출물 확정하고 문제풀기" → 제출 ID·시각·파일 수. 대기 5~10분은 DEFEND.md 순서로 소리 내어(AI 없이).
4탭 확장(시간이 남고 중계가 부담 없을 때만): B를 S3부터 테스트 보강에 — `/tmp/harness/refs/PARALLEL4.md`
