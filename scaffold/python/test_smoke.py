"""test_smoke.py — 골격 스모크: /health 200, 없는 경로 404. 실행: python3 -m unittest discover -s tests"""
# SPDX-License-Identifier: MIT
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from server import make_server  # noqa: E402


class Smoke(unittest.TestCase):
    def test_health_and_404(self):
        srv = make_server(0)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{srv.server_address[1]}"
        try:
            with urllib.request.urlopen(base + "/health") as r:
                self.assertEqual(r.status, 200)
                self.assertEqual(json.loads(r.read()), {"ok": True})
            with self.assertRaises(urllib.error.HTTPError) as e:
                urllib.request.urlopen(base + "/nope")
            self.assertEqual(e.exception.code, 404)
        finally:
            srv.shutdown()
            srv.server_close()


if __name__ == "__main__":
    unittest.main()
