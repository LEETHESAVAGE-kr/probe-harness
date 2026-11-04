# CHANGELOG

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
