// evidence_tests.mjs — check_evidence의 보조 검사: 통과 0은 통과가 아니다 · 건너뛰기 표식 · 직전 커밋보다 테스트가 줄었나 · 화면 확인 표
// check_evidence.mjs가 import해서 쓴다. 읽기만 하고 아무것도 고치지 않는다.
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SKIP = /\.skip\(|\.todo\(|\b(test|it|describe)\.only\(|describe\.skip|@unittest\.skip|pytest\.mark\.skip|\{\s*skip:\s*true|\{\s*todo:\s*true/;
const TEST_CALL = /(?<![.\w])(test|it)\s*\(|^\s*def test_\w*\s*\(/gm;
const isTestFile = f => /(\.test\.[cm]?[jt]s|_test\.py|^test_.*\.py|\.spec\.[cm]?[jt]s)$/.test(path.basename(f)) || /(^|\/)tests?\//.test(f) && /\.([cm]?[jt]s|py)$/.test(f);
const git = (args, cwd) => { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };

/** 입력: 테스트 개수 {pass, fail}|null / 출력: [판정, 메모] — 통과 0이면 FAIL / 깨지는 조건: 없음 */
export function resultVerdict(tc) {
  if (!tc) return ["FAIL", "없음 또는 개수를 못 읽음"];
  if (tc.fail) return ["FAIL", `통과 ${tc.pass} · 실패 ${tc.fail}`];
  if (!tc.pass) return ["FAIL", "통과 0 · 실패 0 — 테스트가 하나도 안 돌았다(통과 아님)"];
  return ["PASS", `통과 ${tc.pass} · 실패 0`];
}

/** 입력: 작업 폴더 / 출력: tests/(·test/) 아래 테스트 파일의 건너뛰기 표식 [{file, line, text}] / 깨지는 조건: 폴더가 없으면 [] */
export function skipMarks(dir) {
  const out = [];
  const walk = d => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); continue; }
      const rel = path.relative(dir, p).split(path.sep).join("/");
      if (!isTestFile(rel)) continue;
      fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((t, i) => { if (SKIP.test(t)) out.push({ file: rel, line: i + 1, text: t.trim().slice(0, 60) }); });
    }
  };
  for (const d of ["tests", "test"]) walk(path.join(dir, d));
  return out;
}

/** 입력: 작업 폴더·리비전 / 출력: 그 커밋의 테스트 파일들 속 test(·it(·def test_ 개수, 커밋이 없으면 null / 깨지는 조건: git이 없으면 null */
export function testCountAt(dir, rev) {
  const files = git(["ls-tree", "-r", "--name-only", rev], dir);
  if (files === null) return null;
  let n = 0;
  for (const f of files.split("\n").filter(f => f && isTestFile(f))) n += ((git(["show", `${rev}:${f}`], dir) || "").match(TEST_CALL) || []).length;
  return n;
}

/** 화면 확인 검사: out/screen_check.md에 빈 화면·로그인 실패가 있으면 FAIL, 전부 미측정이면 WARN, REQUIREMENTS에 화면 행이 있는데 파일이 없으면 WARN */
export function screenChecks(dir, add) {
  const read = f => { try { return fs.readFileSync(path.join(dir, f), "utf8"); } catch { return null; } };
  const sc = read("out/screen_check.md"), req = read("REQUIREMENTS.md") || "";
  if (sc === null) {
    if (/^\| [RK]\d+ \|.*(화면|역할|로그인|조회|보기)/m.test(req)) add("out/screen_check.md", "WARN", "REQUIREMENTS에 화면 행이 있는데 화면 확인 기록이 없다 — $screen");
    return;
  }
  const rows = sc.split(/\r?\n/).filter(l => /^\| (?!REQ#|---)/.test(l)).map(l => l.split("|")[4]?.trim() || "");
  const bad = rows.filter(v => /빈 화면|로그인 실패/.test(v)).length, unseen = rows.filter(v => v === "미측정").length;
  add("out/screen_check.md", bad ? "FAIL" : rows.length && unseen === rows.length ? "WARN" : "PASS",
    `행 ${rows.length} · 빈 화면·로그인 실패 ${bad} · 미측정 ${unseen}${unseen && !bad ? " — Browser로 보고 '내가 확인'으로" : ""}`);
}

/** 테스트 검사 3개를 add(item, verdict, note)로 낸다: 결과 파일(통과 0 = FAIL) · 건너뛰기 표식(WARN) · 직전 커밋 대비 테스트 감소(FAIL) */
export function testChecks(dir, add, tc) {
  const [v, note] = resultVerdict(tc);
  add("out/test_result.txt", v, note);
  const marks = skipMarks(dir);
  if (marks.length) add("테스트 건너뛰기 표식", "WARN", marks.slice(0, 5).map(m => `${m.file}:${m.line} ${m.text}`).join(" · ") + (marks.length > 5 ? ` 외 ${marks.length - 5}곳` : ""));
  const now = testCountAt(dir, "HEAD"), before = testCountAt(dir, "HEAD~1");
  if (now !== null && before !== null)
    add("테스트 개수(직전 커밋 대비)", now < before ? "FAIL" : "PASS", now < before ? `${before} → ${now} — 테스트가 줄었다, 삭제 이유를 LOG에` : `${before} → ${now}`);
}
