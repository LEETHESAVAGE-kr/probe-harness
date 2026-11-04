// server.js — 의존성 0 골격: node 내장 http, 0.0.0.0, PORT 환경변수(기본 3000). 기능은 routes에 하나씩 더한다.
// 시작: PORT=3000 node server.js · 확인: curl -s -w "\n%{http_code}\n" http://localhost:3000/health
// SPDX-License-Identifier: MIT
const http = require("node:http");

const routes = {
  "GET /health": (req, res) => send(res, 200, { ok: true }),
  "GET /": (req, res) => send(res, 200, "<!doctype html><meta charset=utf-8><title>app</title><h1>ok</h1>", "text/html; charset=utf-8"),
};

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const route = routes[`${req.method} ${new URL(req.url, "http://x").pathname}`];
  if (!route) return send(res, 404, { error: "not found" });
  try { route(req, res); } catch (e) { send(res, 500, { error: String(e.message || e) }); }
});

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  server.on("error", e => { console.error(e.code === "EADDRINUSE" ? `포트 ${port} 사용 중 — PORT를 바꿔 다시 띄운다` : e.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`listening on 0.0.0.0:${server.address().port} pid ${process.pid}`));
}
module.exports = { server, routes, send };
