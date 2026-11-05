#!/usr/bin/env node
// screen_check.mjs — 역할별 화면 확인: REQUIREMENTS의 화면 행 × 데모 계정으로 로그인 → 화면 → out/screens/*.png · out/screen_check.md
// 사용: (작업 폴더에서) node /tmp/harness/scripts/screen_check.mjs [--port 3000] [--user id --pass pw] [--path /경로]
// playwright가 작업 폴더에 있으면 쓴다(설치하지 않는다). 없으면 꾸며 내지 않고 "미측정" 표 + 사람이 Browser로 볼 체크 문구. 종료 코드: 빈 화면·로그인 실패가 있으면 1
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { isMain, mdTable } from "./lib.mjs";

const SCREEN = /화면|역할|로그인|조회|보기/;
const read = f => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };

/** 입력: REQUIREMENTS 마크다운 / 출력: 화면 행 [{id, text, path}] — 원문에 /경로가 있으면 그것, 없으면 "/" / 깨지는 조건: 없음 */
export function screenRows(md) {
  return md.split(/\r?\n/).filter(l => /^\| [RK]\d+ \|/.test(l) && SCREEN.test(l)).map(l => {
    const c = l.split(/(?<!\\)\|/).map(x => x.trim()), text = c[3] || "";
    const p = (text.replace(/— \S+:\d+$/, "").match(/(?:^|\s|`)(\/[a-z0-9][\w\-/]*)/i) || [])[1] || "/";
    return { id: c[1], text: text.slice(0, 40), path: p };
  });
}

/** 입력: 작업 폴더 / 출력: 데모 계정 [{role, user, pass}] — HOW_TO_RUN.md·README_RUN.md의 '아이디'·'비밀번호' 머리가 있는 표에서 / 깨지는 조건: 표가 없으면 [] */
export function demoAccounts(dir) {
  const out = [];
  for (const f of ["HOW_TO_RUN.md", "README_RUN.md"]) {
    const L = read(path.join(dir, f)).split(/\r?\n/), cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(x => x.trim());
    const h = L.findIndex(l => /^\|/.test(l) && /아이디|id/i.test(l) && /비밀번호|password/i.test(l));
    if (h < 0) continue;
    const head = cells(L[h]), iu = head.findIndex(x => /아이디|^id$/i.test(x)), ip = head.findIndex(x => /비밀번호|password/i.test(x)), ir = head.findIndex(x => /역할|role/i.test(x));
    for (let i = h + 2; i < L.length && /^\|/.test(L[i]); i++) {
      const c = cells(L[i]), user = (c[iu] || "").replace(/`/g, "").split(/\s/)[0], pass = (c[ip] || "").replace(/`/g, "").split(/[\s(]/)[0];
      if (user && pass && !/채운다|\(/.test(user)) out.push({ role: (ir >= 0 ? c[ir] : user) || user, user, pass });
    }
    if (out.length) break;
  }
  return out;
}

/** 입력: HTML / 출력: 스크립트 없이도, 있어도 보이는 글이 20자 미만이고 스크립트가 없으면 true(확실한 빈 화면) / 깨지는 조건: 없음 */
export function staticBlank(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, "");
  return text.length < 20 && !/<script\b/i.test(html);
}

/** 입력: {text, rootEmpty} / 출력: "보임" 또는 "빈 화면"(본문 20자 미만이거나 #app·#root가 비었다) / 깨지는 조건: 없음 */
export const judge = ({ text, rootEmpty }) => (rootEmpty || String(text || "").replace(/\s+/g, "").length < 20 ? "빈 화면" : "보임");

const get = (base, p) => new Promise(ok => {
  const req = http.get(base + p, { timeout: 4000 }, res => { const c = []; res.on("data", d => c.push(d)); res.on("end", () => ok({ status: res.statusCode, body: Buffer.concat(c).toString("utf8") })); });
  req.on("error", e => ok({ status: 0, body: "", error: e.code })); req.on("timeout", () => req.destroy(new Error("timeout")));
});

async function loadPlaywright(dir) {
  for (const base of [path.join(dir, "_.js"), import.meta.url]) {
    try { const m = await import(pathToFileURL(createRequire(base).resolve("playwright")).href); return m.chromium ? m : m.default; } catch { /* 없음 */ }
  }
  return null;
}

/** 입력: {dir, base, accounts, rows} / 출력: {mode, table: [[REQ#, 역할, 경로, 판정, 보인 글, 콘솔 오류, 스크린샷]], checklist} / 깨지는 조건: 서버가 꺼져 있으면 판정 "미측정"과 연결 오류 */
export async function screenCheck({ dir, base, accounts, rows, pw }) {
  const accs = accounts.length ? accounts : [{ role: "로그인 없음", user: "", pass: "" }], table = [], checklist = [];
  if (pw) {
    fs.mkdirSync(path.join(dir, "out/screens"), { recursive: true });
    let browser;
    try { browser = await pw.chromium.launch(); } catch (e) { console.error(`[screen_check] 브라우저를 못 띄움(${String(e.message).split("\n")[0]}) — http 확인으로 바꾼다`); return screenCheck({ dir, base, accounts, rows, pw: null }); }
    try {
      for (const a of accs) {
        const page = await (await browser.newContext()).newPage(); let errors = 0, failed = false;
        page.on("console", m => { if (m.type() === "error") errors++; }); page.on("pageerror", () => errors++);
        await page.goto(base + "/", { waitUntil: "networkidle" }).catch(() => {});
        if (a.user && await page.locator("input[type=password]").count()) {
          await page.locator("input:not([type=password]):not([type=hidden])").first().fill(a.user);
          await page.locator("input[type=password]").first().fill(a.pass);
          await page.locator("input[type=password]").first().press("Enter");
          await page.waitForLoadState("networkidle").catch(() => {});
          failed = !(await page.locator("input[type=password]").first().waitFor({ state: "hidden", timeout: 5000 }).then(() => true, () => false));
        }
        for (const r of rows) {
          const shot = `out/screens/${a.role}_${r.id}.png`.replace(/[^\w./가-힣-]/g, "_");
          if (failed) { table.push([r.id, a.role, r.path, "로그인 실패", "", errors, ""]); continue; }
          await page.goto(base + r.path, { waitUntil: "networkidle" }).catch(() => {});
          const text = await page.evaluate(() => document.body ? document.body.innerText : "");
          const rootEmpty = await page.evaluate(() => { const x = document.querySelector("#app, #root"); return !!x && !x.children.length && !x.textContent.trim(); });
          await page.screenshot({ path: path.join(dir, shot), fullPage: true });
          table.push([r.id, a.role, r.path, judge({ text, rootEmpty }), text.replace(/\s+/g, " ").slice(0, 200), errors, shot]);
        }
      }
    } finally { await browser.close(); }
    return { mode: "playwright", table, checklist };
  }
  for (const a of accs) for (const r of rows) {
    const g = await get(base, r.path);
    const v = g.status && g.status < 400 && staticBlank(g.body) ? "빈 화면" : "미측정";
    table.push([r.id, a.role, r.path, v, g.status ? `HTTP ${g.status}` : `연결 안 됨 ${g.error || ""}`, "", ""]);
    checklist.push(`- [ ] ${a.role}${a.user ? `(${a.user} / ${a.pass})` : ""}로 Browser에서 ${r.path} → 볼 것: ${r.id} "${r.text}" — 보이면 위 표의 판정을 "내가 확인"으로 고친다`);
  }
  return { mode: "폴백(playwright 없음 — 화면은 사람이 Browser로 확인)", table, checklist };
}

/** 입력: screenCheck 결과 / 출력: out/screen_check.md 본문 / 깨지는 조건: 없음 */
export function render(r) {
  return `# screen_check — 역할별 화면 확인\n\n- 방식: ${r.mode}\n\n${mdTable(["REQ#", "역할", "경로", "판정", "보인 글 일부", "콘솔 오류", "스크린샷"], r.table)}\n` +
    (r.checklist.length ? `\n## 사람이 Browser로 확인할 것\n${r.checklist.join("\n")}\n` : "");
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const dir = process.cwd(), base = `http://127.0.0.1:${arg("--port") || 3000}`;
  let rows = screenRows(read(path.join(dir, "REQUIREMENTS.md")));
  if (arg("--path")) rows = [{ id: "P1", text: "지정 경로", path: arg("--path") }, ...rows];
  if (!rows.length) rows = [{ id: "-", text: "첫 화면", path: "/" }];
  const accounts = arg("--user") ? [{ role: arg("--user"), user: arg("--user"), pass: arg("--pass") || "" }] : demoAccounts(dir);
  const r = await screenCheck({ dir, base, accounts, rows, pw: await loadPlaywright(dir) });
  fs.mkdirSync(path.join(dir, "out"), { recursive: true });
  fs.writeFileSync(path.join(dir, "out/screen_check.md"), render(r));
  console.log(render(r));
  process.exit(r.table.some(t => /빈 화면|로그인 실패/.test(t[3])) ? 1 : 0);
}
