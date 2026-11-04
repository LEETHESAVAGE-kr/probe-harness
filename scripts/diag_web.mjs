#!/usr/bin/env node
// diag_web.mjs — 빈 화면 원인 분리: ① 듣는 프로세스 ② 0.0.0.0 바인딩 ③ GET / ④ 화면이 부르는 js·css ⑤ /health·/api 인증. 처음 실패한 단계에서 멈춘다.
// 사용: (작업 폴더에서) node /tmp/harness/scripts/diag_web.mjs [포트=3000]   서버를 띄우거나 끄지 않는다. 결과는 out/diag_web.txt에도. 종료 코드: 0 이상 없음 · 1 실패 단계 있음
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { isMain, mdTable } from "./lib.mjs";

const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }); } catch { return null; } };
const connect = (host, port) => new Promise(ok => { const s = net.connect({ host, port, timeout: 1500 }, () => { s.destroy(); ok(true); }); s.on("error", () => ok(false)); s.on("timeout", () => { s.destroy(); ok(false); }); });
const get = (port, p) => new Promise(ok => {
  const req = http.get({ host: "127.0.0.1", port, path: p, timeout: 4000 }, res => { const c = []; res.on("data", d => c.push(d)); res.on("end", () => ok({ status: res.statusCode, type: String(res.headers["content-type"] || ""), body: Buffer.concat(c).toString("utf8") })); });
  req.on("error", e => ok({ status: 0, type: "", body: "", error: e.code || e.message })); req.on("timeout", () => req.destroy(new Error("timeout")));
});

/** 입력: 포트 / 출력: 그 포트를 듣는 줄들(ss → netstat 순, 둘 다 없으면 []) / 깨지는 조건: 없음 */
export function listenLines(port) {
  const re = new RegExp(`[:.]${port}\\b`);
  for (const [cmd, args] of [["ss", ["-ltnp"]], ["netstat", ["-ano"]], ["netstat", ["-ltn"]]]) {
    const out = run(cmd, args);
    if (out !== null) return out.split(/\r?\n/).filter(l => re.test(l) && /LISTEN/i.test(l)).map(l => l.trim().replace(/\s+/g, " "));
  }
  return [];
}

/** 입력: HTML / 출력: 화면이 부르는 같은 서버의 js·css 경로 목록(외부 http·data: 제외) / 깨지는 조건: 없음 */
export function assets(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) if (/stylesheet|modulepreload/i.test(m[0])) out.push(m[1]);
  return out.filter(u => !/^(https?:)?\/\/|^data:/i.test(u)).map(u => (u.startsWith("/") ? u : "/" + u.replace(/^\.\//, "")));
}

/** 입력: 포트 / 출력: {rows: [[단계, 결과, 원인 후보, 다음에 칠 것]], ok, cause} — 처음 실패한 단계에서 멈춘다 / 깨지는 조건: 없음(네트워크 오류는 결과로 적는다) */
export async function diag(port = 3000) {
  const rows = [], stop = (step, result, cause, next) => { rows.push([step, `FAIL ${result}`, cause, next]); return { rows, ok: false, cause }; };
  const lines = listenLines(port), loop = await connect("127.0.0.1", port);
  if (!loop && !lines.length) return stop("① 듣는 프로세스", `${port}번에 연결 안 됨`, "서버가 꺼졌다(서버 탭이 죽었거나 다른 포트)", "서버 탭에서 README_RUN 시작 명령을 다시 친다");
  rows.push(["① 듣는 프로세스", `PASS ${lines[0] || "127.0.0.1 연결됨"}`, "", ""]);
  const lan = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === "IPv4" && !i.internal);
  const wide = lines.some(l => /(0\.0\.0\.0|\*|\[::\]|:::)[:.]\d+\s/.test(l + " "));
  const viaLan = lan ? await connect(lan.address, port) : null;
  if (viaLan === false || (viaLan === null && lines.length && !wide))
    return stop("② 바인딩", `127.0.0.1(또는 localhost)에만 묶였다${lan ? ` — ${lan.address}:${port} 연결 실패` : ""}`, "Browser 미리보기에서 빈 화면이 된다", "server의 listen 주소를 0.0.0.0으로(HOST=0.0.0.0) 바꾸고 서버를 다시 띄운다");
  rows.push(["② 바인딩", `PASS ${viaLan ? `${lan.address}로도 연결됨(0.0.0.0)` : wide ? "0.0.0.0" : "미확인(바깥 주소 없음)"}`, "", ""]);
  const root = await get(port, "/");
  if (!root.status || root.status >= 400 || !root.body.length)
    return stop("③ GET /", `${root.status || root.error} · ${root.body.length}바이트`, root.status === 404 ? "첫 화면 경로가 없다(정적 폴더·라우트)" : "첫 화면이 비었거나 서버 오류", "curl -s -w \"\\n%{http_code}\\n\" localhost:" + port + "/ 로 본문을 본다");
  rows.push(["③ GET /", `PASS ${root.status} · ${root.body.length}바이트 · ${root.type || "형식 없음"}`, /html/i.test(root.type) ? "" : "HTML이 아니다 — 화면이 아니라 API 응답일 수 있다", ""]);
  const bad = [];
  for (const a of assets(root.body)) {
    const r = await get(port, a);
    if (!r.status || r.status >= 400) bad.push(`${a} ${r.status || r.error}`);
    else if (/\.m?js(\?|$)/.test(a) && /html/i.test(r.type)) bad.push(`${a} 형식 ${r.type}(HTML을 js로 받음 — 없는 파일을 index로 돌려줌)`);
    else if (/\.css(\?|$)/.test(a) && !/css/i.test(r.type)) bad.push(`${a} 형식 ${r.type || "없음"}`);
  }
  if (bad.length) return stop("④ js·css", bad.join(" · "), "화면 스크립트가 안 불려 빈 화면이 된다(경로·빌드 결과·MIME)", "HTML의 src·href 경로와 실제 파일 위치를 맞춘다");
  rows.push(["④ js·css", `PASS ${assets(root.body).length}개`, "", ""]);
  const health = await get(port, "/health"), api = (root.body.match(/["'`](\/?api\/[\w\-/]+)/) || [])[1];
  const apiRes = api ? await get(port, api.startsWith("/") ? api : "/" + api) : null;
  const authNote = apiRes && [401, 403].includes(apiRes.status) ? "로그인 전 401/403 — 정상일 수 있다(로그인 뒤 다시)" : "";
  rows.push(["⑤ /health·/api", `${health.status === 200 ? "PASS" : "WARN"} /health ${health.status || health.error}${api ? ` · ${api} ${apiRes.status}` : " · 화면이 부르는 /api 없음"}`, health.status === 200 ? authNote : "헬스체크 경로가 없다", health.status === 200 ? "" : "GET /health 200 라우트를 더한다"]);
  return { rows, ok: true, cause: authNote || "서버 쪽 이상 없음 — Browser의 포트·경로 입력과 새로고침을 본다" };
}

if (isMain(import.meta.url)) {
  const port = Number(process.argv[2] || 3000);
  const r = await diag(port);
  const text = `${mdTable(["단계", "결과", "원인 후보", "다음에 칠 것"], r.rows)}\n원인 후보: ${r.cause}\n`;
  console.log(text);
  try { fs.mkdirSync("out", { recursive: true }); fs.writeFileSync("out/diag_web.txt", `# diag_web ${port}\n\n${text}`); } catch { /* 쓰기 못 해도 화면 출력은 남는다 */ }
  process.exit(r.ok ? 0 : 1);
}
