# README_RUN — 실행·테스트
> .agents/skills/와 AGENTS.md는 응시자가 미리 만든 작업 틀(출처: LOG 차용 표, MIT)

- 런타임: (과제 지정 / node 내장 http / python http.server)
- 시작: `PORT=3000 node server.js`  ← 실제 명령으로 바꾼다
- 주소: 0.0.0.0:PORT (기본 3000, 차 있으면 다른 포트)
- 테스트: `node --test`  → 출력은 out/test_result.txt
- 확인: `curl -s -w "\n%{http_code}\n" http://localhost:3000/health` → out/browser_check.txt
- 끄기: 내가 띄운 터미널에서 Ctrl+C (남의 프로세스는 끄지 않는다)
