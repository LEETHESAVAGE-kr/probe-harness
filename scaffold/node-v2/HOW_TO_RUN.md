# HOW_TO_RUN

> 아직 비어 있음 — 스캐폴드 양식이다. (채운다) 칸을 채우고 이 줄을 지운다.

## 기술 스택
- Node.js 22 이상, 외부 패키지 없음(내장 http·crypto·sqlite). 저장: node:sqlite가 있으면 SQLite(`DB_PATH`, 기본 `./var/app.db`), 없으면 같은 경로의 `.json`.
- (채운다: 과제 기능을 맡은 파일과 역할)

## 실행
- 로컬: `PORT=3000 node server.js` → http://localhost:3000 (Windows PowerShell: `$env:PORT=3000; node server.js`)
- 테스트: `node --test`
- 컨테이너: `docker build -t app . && docker run -p 3000:3000 app` · 한 번에 확인: `sh scripts/verify_container.sh`
- 설정값은 전부 기본값이 있다. 비밀값 없이도 뜬다(`.env.example` 참고). 헬스체크: `GET /health`.

## 데모 계정 (빈 저장소에서 처음 뜰 때 자동으로 만든다)
| 역할 | 아이디 | 비밀번호 | 들어가서 볼 것 |
|---|---|---|---|
| 운영자 | operator | operator-demo (`DEMO_OPERATOR_PASSWORD`로 바꿀 수 있다) | (채운다) |
| 일반 사용자 | member | member-demo (`DEMO_MEMBER_PASSWORD`로 바꿀 수 있다) | (채운다) |

## 데이터 준비·선택·적용·오류 확인
(채운다)

## 내보내기
(채운다 — 형식 확인: `node src/validate_schema.js <스키마.md> <내보낸.json>`)
- status 자가 점검: (채운다 — 내보낸 JSON의 status에 넣은 규칙 점검 항목과 결과, out/ 파일과 같은 값)

## 설계 기준과 한계
(채운다 — PLAN 성공 기준·한계에서. 동시에 같은 쓰기 요청이 오면 두 번째는 409로 거절한다.)
- 현행: (채운다 — out/prove.md 지표 값, 없으면 '미측정')
- 기준안: (채운다 — out/prove.md)
- 우리 안: (채운다 — out/prove.md)
- 이론 하한: (채운다 — out/prove.md 계산식 1줄)
