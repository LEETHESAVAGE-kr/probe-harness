# scaffold/node — 의존성 0 골격
- 시작: `PORT=3000 node server.js` (Windows PowerShell: `$env:PORT=3000; node server.js`)
- 테스트: `node --test` → 출력은 out/test_result.txt
- 확인: `curl -s -w "\n%{http_code}\n" http://localhost:3000/health`
- 기능 추가: server.js의 routes에 `"GET /api/x": (req, res) => send(res, 200, …)` 한 줄씩, 테스트는 tests/에 기능마다 정상·경계·오류.
