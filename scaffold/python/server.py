"""server.py — node가 없을 때의 골격: 표준 라이브러리 http.server, 0.0.0.0, PORT 환경변수(기본 3000).
시작: PORT=3000 python3 server.py · 확인: curl -s -w "\n%{http_code}\n" http://localhost:3000/health
SPDX-License-Identifier: MIT
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/health":
            return self.send(200, {"ok": True})
        if path == "/":
            return self.send(200, b"<!doctype html><meta charset=utf-8><h1>ok</h1>", "text/html; charset=utf-8")
        return self.send(404, {"error": "not found"})


def make_server(port):
    """입력: 포트(0이면 빈 포트) / 출력: ThreadingHTTPServer / 깨지는 조건: 포트 사용 중이면 OSError"""
    return ThreadingHTTPServer(("0.0.0.0", port), Handler)


if __name__ == "__main__":
    srv = make_server(int(os.environ.get("PORT", "3000")))
    print(f"listening on 0.0.0.0:{srv.server_address[1]} pid {os.getpid()}", flush=True)
    srv.serve_forever()
