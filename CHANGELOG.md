# CHANGELOG

## v2.9.2 — RUN 시간 순서 · 부품 자동 · 답 붙여넣기

| 결함(일반) | 변경 | 검증 |
|---|---|---|
| RUN이 단계마다 '치는 것·내 눈·터지는 것' 나열이라, 무엇을 몇 번째로 치고 어디서 막혔을 때 무엇을 하는지 찾기 어렵다 | 단계마다 번호 순서 + `[창 n]` + 바로 밑 `내 눈`·`안 되면` | tests_harness/v2.test.mjs G-1 |
| S3 bootstrap 명령의 `--with <부품>`을 손으로 바꿔 쳐야 한다 | `--with plan`: PLAN '- 뼈대 부품:' 줄을 읽는다($plan이 채움, 비면 오류로 멈춤). PLAN 템플릿에 그 줄 | tests_harness/v29.test.mjs C10 |
| 담당자 답을 붙일 때 앞말·번호를 매번 쳐야 한다 | 명령 없이 붙인 글 = 담당자 답, 묶음이면 질문 문장으로 번호를 맞춰 나눠 기록 | tests_harness 전체 |
| PLAN 확인 DM의 답을 받아도 PLAN을 손으로 고쳐야 한다 | `$plan` '확인 답 반영': 답을 붙이면 문장마다 맞다/고침/넘김/새로 나옴 판정, 맞다·고침은 바로 반영, 넘김은 후보 A/B·결과 차이·추천 → `1A 2B`로 고르고 `맞다`면 ‘기록-합의’ | tests_harness 전체 |

## v2.9.1 — 서술형 카드 경량화

| 결함(일반) | 변경 | 검증 |
|---|---|---|
| 카드 문장이 길고 숫자·영어가 많아 5분 안에 손으로 치기 어렵다 | DEFEND 카드 6장을 같은 네 마디의 짧은 우리말 문장으로 다시 씀. 당일 값 다섯 → 넷(테스트·건수·10배 시간·기준값), 413·1MB·UTC 예시 시각·SQLite 등 세부 숫자 제거 | tests_harness/memorize.test.mjs |
| '입력이 늘면'과 '동시 접속' 카드가 같은 저장·잠금 이야기를 따로 외우게 한다 | 두 카드를 틀 B 한 장(D3·D2)으로 합치고, AI 협업은 틀 C 한 장으로 새로 둠. 권한 답은 D6 안에 | tests_harness/memorize.test.mjs · v29.test.mjs |
| `$defend` 읽기 카드 머리와 칸 출처가 옛 카드 칸을 가리킨다 | SKILL·BOXES의 읽기 카드 머리 `C AI`, 새 칸의 출처 목록 갱신, PROMPTS 재생성 | tests_harness/v29.test.mjs C9 |

## v2.9 — 장문 README·요구 다수·알고리즘 선택형 과제 일반 대비

새 모드는 전부 범위 줄이나 새 명령을 줄 때만 켜진다.

| 결함(일반) | 변경 | 검증 |
|---|---|---|
| 장문 README에서 예시와 후보가 요구에 섞인다 | `$s1` 장문 모드: 켜는 조건, 후보 절, `out/examples.md` | tests_harness/v29.test.mjs |
| 알고리즘을 고르는 과제에서 근거 없이 첫 구현으로 간다 | `$algo`: 후보 표와 고르는 규칙, `$plan` 직전에 실행 | tests_harness/v29.test.mjs |
| 요구가 많으면 한 행씩 구현하는 속도로는 모자란다 | `$feat` 묶음: 같은 모듈 최대 3행, 묶음당 퀴즈 한 번, 실패 행 되돌림 | tests_harness/v29.test.mjs |
| 줄기를 나눌 때 같은 파일을 두 줄기가 고친다 | `$plan`: 줄기·묶음 열, 소유 파일 분할 절 | tests_harness/v29.test.mjs |
| 구현 줄기를 탭 하나로 소화하지 못한다 | `$role-a2`: 공용 파일은 읽기만, 'A에게 요청', [A2] 커밋 접두 | tests_harness/v29.test.mjs |
| `data/`에 CSV가 없으면 데이터 목록을 못 만든다 | `inventory` 폴백: JSON 배열·TXT 집계, 깨진 JSON은 줄 기준 | tests_harness/v29.test.mjs |
| 상태가 빈 행과 서술형 재료 누락을 제출 전에 못 잡는다 | `check_evidence`: 빈 상태 행 WARN, 훅 8개 점검 | tests_harness/v29.test.mjs |
| 시작할 때 과제 유형과 속도를 판단할 틀이 없다 | RUN S0 유형 ①~⑤·속도 3줄·12분 상한, ASK 맨 위 규칙·DM 1·2 | tests_harness/v29.test.mjs |
| 서술형 직전에 읽을 내용을 고르는 데 시간이 든다 | `$defend` 읽기 카드: `## 0. 읽기 카드` A~F 6줄 | tests_harness/v29.test.mjs |
