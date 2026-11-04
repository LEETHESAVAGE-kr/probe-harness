// harness.test.mjs — 하네스 자체 시험. 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs, plan, run, PLAYBOOK } from "../bootstrap.mjs";
import { readTable, parseCsv, toNum } from "../scripts/lib.mjs";
import { inventory, profileTable } from "../scripts/inventory.mjs";
import { makeRow, measure, appendRow } from "../scripts/changes_log.mjs";
import { htmlTables, saveBody } from "../scripts/fetch_portal.mjs";
import { testCounts, filledRows, check } from "../scripts/check_evidence.mjs";
import { summary } from "../scripts/summary10.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "hz-"));
const write = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
const git = (d, ...a) => execFileSync("git", a, { cwd: d, encoding: "utf8" });

// ---- bootstrap
test("bootstrap 정상: 양식 생성, 기존 README·uploads 보존, LOG 출처 행", () => {
  const d = tmp(); write(d, "README.md", "과제 원문"); write(d, "uploads/a.csv", "x\n1\n");
  const r = run(parseArgs(["--target", d]), HARNESS);
  for (const f of ["AGENTS.md", "PLAN.md", "LOG.md", "DECISIONS.md", "VERIFY.md", "README_RUN.md", "out/changes_log.md", "tests/.gitkeep", "portal/.gitkeep"])
    assert.ok(fs.existsSync(path.join(d, f)), f);
  assert.strictEqual(fs.readFileSync(path.join(d, "README.md"), "utf8"), "과제 원문");
  assert.strictEqual(fs.readFileSync(path.join(d, "uploads/a.csv"), "utf8"), "x\n1\n");
  assert.match(fs.readFileSync(path.join(d, "LOG.md"), "utf8"), /\| S0 \|.*harness \S+ \S+ MIT/);
  assert.match(fs.readFileSync(path.join(d, "LOG.md"), "utf8"), /\| 작업 틀.*\| MIT \|/);
  assert.ok(fs.existsSync(path.join(d, ".gitignore")));
  assert.ok(fs.existsSync(path.join(d, ".git")));
  assert.ok(r.created.length >= 10);
  assert.deepStrictEqual(r.before.sort(), ["README.md", "uploads"]);
});
test("bootstrap 경계: 두 번 돌려도 덮어쓰지 않고, 기존 LOG엔 출처 행만 덧붙인다", () => {
  const d = tmp(); run(parseArgs(["--target", d]), HARNESS);
  write(d, "PLAN.md", "내가 쓴 PLAN");
  const r = run(parseArgs(["--target", d]), HARNESS);
  assert.strictEqual(fs.readFileSync(path.join(d, "PLAN.md"), "utf8"), "내가 쓴 PLAN");
  assert.ok(r.kept.includes("PLAN.md"));
  assert.strictEqual((fs.readFileSync(path.join(d, "LOG.md"), "utf8").match(/harness \S+ \S+ MIT/g) || []).length, 2);
});
test("bootstrap 모드: docs는 nondev 규칙·문서 8, scaffold node는 server.js", () => {
  const d = tmp(); run(parseArgs(["--target", d, "--mode", "docs", "--scaffold", "node"]), HARNESS);
  assert.match(fs.readFileSync(path.join(d, "AGENTS.md"), "utf8"), /1순위 규칙/);
  for (const f of ["INTERVIEW.md", "FINDINGS.md", "HANDOFF.md", "server.js", "tests/smoke.test.js"]) assert.ok(fs.existsSync(path.join(d, f)), f);
  assert.deepStrictEqual(plan("dev", "").filter(([s]) => s && !fs.existsSync(path.join(HARNESS, s))), []);
  assert.deepStrictEqual(plan("docs", "python").filter(([s]) => s && !fs.existsSync(path.join(HARNESS, s))), []);
});
test("bootstrap 오류: 하네스 폴더 안·모르는 인자는 거부", () => {
  assert.throws(() => run(parseArgs(["--target", HARNESS]), HARNESS), /작업 폴더에서/);
  assert.throws(() => parseArgs(["--mode", "x"]), /dev\|docs/);
  assert.throws(() => parseArgs(["--force"]), /모르는 인자/);
});

// ---- lib / inventory
test("lib: 따옴표 속 쉼표·줄바꿈, 숫자 속 쉼표, BOM", () => {
  assert.deepStrictEqual(parseCsv('a,b\n"1,040","x\ny"\n'), [["a", "b"], ["1,040", "x\ny"]]);
  assert.strictEqual(toNum("1,040"), 1040); assert.strictEqual(toNum("3kg"), null); assert.strictEqual(toNum(""), null);
  const d = tmp(); write(d, "b.csv", "﻿id,v\n1,2\n"); assert.deepStrictEqual(readTable(path.join(d, "b.csv")).header, ["id", "v"]);
});
test("inventory 정상: 행 수·완전 중복·id만 다른 중복·코드값·날짜·표기 흔들림", () => {
  const d = tmp();
  write(d, "a.csv", "rec_id,code,date,qty,site\nA1,AB-01,2025-01-01,5,Site A\nA2,AB-01,2025-01-01,5,Site A\nA3,AB-02,2025-01-03,,site-a\nA3,AB-02,2025-01-03,,site-a\n");
  const p = profileTable(readTable(path.join(d, "a.csv")));
  assert.strictEqual(p.rows, 4); assert.strictEqual(p.exact_dup, 1);
  const c = Object.fromEntries(p.columns.map(x => [x.name, x]));
  assert.strictEqual(c.qty.n_empty, 2); assert.strictEqual(c.qty.sum, 10);
  assert.deepStrictEqual(c.date.date_range, ["2025-01-01", "2025-01-03", 4]);
  assert.deepStrictEqual(c.code.prefixes, [["AB", 4]]);
  assert.strictEqual(c.site.wobble.length, 1);
  const md = inventory([path.join(d, "a.csv")]); assert.match(md, /완전 중복 1/);
});
test("inventory id만 다른 중복: id 열이 유일할 때 나머지가 같은 행을 센다", () => {
  const d = tmp(); write(d, "a.csv", "rec_id,eq,t\n1,X,9\n2,X,9\n3,Y,9\n");
  assert.deepStrictEqual(profileTable(readTable(path.join(d, "a.csv"))).id_dup, { rec_id: 1 });
});
test("inventory 경계·오류: 빈 파일은 행 0, 없는 파일은 '읽기 실패' 행", () => {
  const d = tmp(); write(d, "e.csv", "");
  const md = inventory([path.join(d, "e.csv"), path.join(d, "none.csv")]);
  assert.match(md, /e\.csv \| 0 \| 0/); assert.match(md, /읽기 실패/);
});

// ---- changes_log
test("changes_log 정상: 파일 두 개로 전후 건수·합계·차이 행", () => {
  const d = tmp(); write(d, "a.csv", "k,amt\n1,10\n2,\n3,\"1,000\"\n"); write(d, "b.csv", "k,amt\n1,10\n3,1000\n");
  const a = measure(path.join(d, "a.csv"), "amt"), b = measure(path.join(d, "b.csv"), "amt");
  assert.deepStrictEqual([a.count, a.sum, a.bad], [3, 1010, 1]);
  const row = makeRow({ step: "S4", why: "빈 금액 제외", bc: a.count, ac: b.count, bs: a.sum, as: b.sum, affects: "아니오" });
  assert.strictEqual(row, "| S4 | 빈 금액 제외 | 3 | 2 | 1010 | 1010 | 건수 -1 · 합계 0 | 아니오 |");
  const f = path.join(d, "out/changes_log.md"); appendRow(f, row); appendRow(f, row);
  assert.strictEqual(filledRows(fs.readFileSync(f, "utf8"), "changes_log"), 2);
});
test("changes_log 경계: 합계 없이 건수만이면 합계 칸은 -", () => {
  assert.match(makeRow({ step: "S1", why: "중복 제거", bc: 5, ac: 4, bs: NaN, as: NaN }), /\| 5 \| 4 \| - \| - \| 건수 -1 \| 미판정/);
});
test("changes_log 오류: 없는 합계 열·숫자 아닌 건수는 거부", () => {
  const d = tmp(); write(d, "a.csv", "k\n1\n");
  assert.throws(() => measure(path.join(d, "a.csv"), "amt"), /열이 없다/);
  assert.throws(() => makeRow({ step: "S", why: "w", bc: NaN, ac: 1 }), /건수가 숫자가 아니다/);
});

// ---- fetch_portal (저장·세기만 — 네트워크 없이)
test("fetch_portal: HTML 표 → csv·행 수·합계, JSON 배열 행 수, 표 없는 HTML", () => {
  const d = tmp();
  const html = "<html><table><tr><th>id</th><th>금액</th></tr><tr><td>1</td><td>1,040</td></tr><tr><td>2</td><td>60</td></tr></table></html>";
  assert.deepStrictEqual(htmlTables(html)[0], [["id", "금액"], ["1", "1,040"], ["2", "60"]]);
  const r = saveBody(html, "text/html", "p", "금액", path.join(d, "portal"));
  assert.deepStrictEqual([r[0].rows, r[0].sum], [2, 1100]);
  assert.match(fs.readFileSync(r[0].file, "utf8"), /"1,040"/);
  assert.strictEqual(saveBody('[{"a":1},{"a":2}]', "application/json", "j", "a", path.join(d, "portal"))[0].sum, 3);
  assert.strictEqual(saveBody("<html><p>x</p></html>", "text/html", "n", "", path.join(d, "portal"))[0].rows, "표 없음");
});

// ---- check_evidence / summary10
test("check_evidence: 테스트 출력 형식 3종을 읽는다", () => {
  assert.deepStrictEqual(testCounts("# tests 3\n# pass 3\n# fail 0\n"), { pass: 3, fail: 0 });
  assert.deepStrictEqual(testCounts("ℹ pass 2\nℹ fail 1\n"), { pass: 2, fail: 1 });
  assert.deepStrictEqual(testCounts("Ran 4 tests in 0.1s\n\nFAILED (failures=1)"), { pass: 3, fail: 1 });
  assert.deepStrictEqual(testCounts("5 passed, 1 failed"), { pass: 5, fail: 1 });
  assert.strictEqual(testCounts("hello"), null);
});
test("check_evidence: 양식 그대로면 막힘, 다 채우고 합의가 기능 커밋보다 앞이면 제출 가능", () => {
  const d = tmp(); run(parseArgs(["--target", d]), HARNESS);
  const before = check(d, "dev");
  assert.ok(before.some(r => r.item === "PLAN.md" && r.note === "양식 그대로(안 채움)"));
  write(d, "PLAN.md", "| 성공 기준 | 응답 200ms 이하 |\n| 한계 | 동시 사용자 미검증 |\n확인 받은 시각: 23:59\n");
  git(d, "add", "PLAN.md"); git(d, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "[S 2/6] 합의");
  for (const f of ["DECISIONS.md", "VERIFY.md", "README_RUN.md"]) write(d, f, `# ${f}\n채움\n`);
  write(d, "LOG.md", fs.readFileSync(path.join(d, "LOG.md"), "utf8").replace("\n## 설명 카드", "| 서버 골격 | curl 200 | 직접 curl | 1건 |\n\n## 설명 카드"));
  write(d, "out/test_result.txt", "# pass 4\n# fail 0\n"); write(d, "out/browser_check.txt", "{\"ok\":true}\n200\n");
  write(d, "out/inventory.md", "x"); appendRow(path.join(d, "out/changes_log.md"), "| S4 | x | 2 | 1 | - | - | 건수 -1 | 아니오 |");
  git(d, "add", "-A"); git(d, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "[S 4/6] 기능 1");
  const R = check(d, "dev"); const fails = R.filter(r => r.verdict === "FAIL");
  assert.deepStrictEqual(fails, []);
  assert.match(summary(d).join("\n"), /통과 4 · 실패 0/);
});
test("check_evidence 오류: 실패 테스트·200 없는 curl·빈 고정 절은 막힘", () => {
  const d = tmp(); run(parseArgs(["--target", d]), HARNESS);
  write(d, "out/test_result.txt", "# pass 3\n# fail 1\n"); write(d, "out/browser_check.txt", "500\n");
  const R = Object.fromEntries(check(d, "dev").map(r => [r.item, r.verdict]));
  assert.strictEqual(R["out/test_result.txt"], "FAIL"); assert.strictEqual(R["out/browser_check.txt"], "FAIL");
  assert.strictEqual(R["LOG 고정 절 'AI 위임 vs 직접 검증'"], "FAIL");
});
test("check_evidence 오류: 합의 시각이 첫 기능 커밋보다 뒤면 막힘", () => {
  const d = tmp(); run(parseArgs(["--target", d]), HARNESS);
  write(d, "PLAN.md", "| 한계 | x |\n확인 받은 시각: 23:59\n");
  git(d, "add", "-A"); git(d, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "[S 4/6] 기능 1", "--date", "2026-01-01T00:01:00");
  const r = check(d, "dev").find(x => x.item === "합의 시각 < 첫 기능 커밋");
  assert.strictEqual(r.verdict, "FAIL", r.note);
});
test("inventory --by: 키별 숫자 요약으로 한 키만 다른 수준이 보이고, 최소·최대값 반복을 센다", () => {
  const d = tmp(); write(d, "s.csv", "\uFEFFk,v\nA,1\nA,0\nA,0\nB,500\nB,999\nB,999\n");
  const t = readTable(path.join(d, "s.csv"));
  assert.strictEqual(t.encoding, "utf-8-bom");
  const md = inventory([path.join(d, "s.csv")], "k");
  assert.match(md, /\| B \| v \| 3 \| 0 \| 500~999 \|/);
  assert.match(md, /0×2/);
  assert.strictEqual(inventory([path.join(d, "s.csv")], "없는열").includes("별 숫자 열"), false);
});
test("changes_log --cells: 행은 남기고 값만 비운 처리를 칸 수로 센다", () => {
  const d = tmp(); write(d, "a.csv", "k,v\n1,0\n2,5\n3,-1\n"); write(d, "b.csv", "k,v\n1,\n2,5\n3,\n");
  assert.strictEqual(measure(path.join(d, "a.csv"), "", "v").count, 3);
  assert.strictEqual(measure(path.join(d, "b.csv"), "", "v").count, 1);
  assert.strictEqual(measure(path.join(d, "b.csv")).count, 3);
  assert.throws(() => measure(path.join(d, "b.csv"), "", "x"), /열이 없다/);
});
test("summary10: /status는 '도구 설정' 줄에서, 시작 명령은 README_RUN에서, 긴 칸은 자른다", () => {
  const d = tmp(); run(parseArgs(["--target", d]), HARNESS);
  const log = fs.readFileSync(path.join(d, "LOG.md"), "utf8").replace("- /status: ", "- /status: 모델 X · 승인 기본");
  write(d, "LOG.md", log); write(d, "README_RUN.md", "- 시작(포트 3971): `PORT=3971 node server.js`\n");
  write(d, "PLAN.md", `| 만들 것 | ${"가".repeat(300)} |\n`);
  const out = summary(d).join("\n");
  assert.match(out, /⑥ 모델·설정: 모델 X · 승인 기본/);
  assert.match(out, /⑩ 서버 시작·포트: PORT=3971 node server.js/);
  assert.ok(out.split("\n")[0].length < 140);
});

test("bootstrap: 단계 지시문 사본을 _playbook/에 두고 커밋에서 뺀다", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pb-"));
  fs.writeFileSync(path.join(d, ".gitignore"), "dist/\n");
  run(parseArgs(["--target", d]));
  for (const f of PLAYBOOK) assert.ok(fs.existsSync(path.join(d, "_playbook", f)), f);
  const gi = fs.readFileSync(path.join(d, ".gitignore"), "utf8");
  assert.ok(/^dist\/$/m.test(gi) && /^_playbook\/$/m.test(gi));
  run(parseArgs(["--target", d]));
  assert.strictEqual((fs.readFileSync(path.join(d, ".gitignore"), "utf8").match(/^_playbook\/$/gm) || []).length, 1);
});

test("F7 bootstrap: README_RUN.md 머리에 작업 틀 출처 한 줄 — 다시 돌려도 한 번, 원래 있던 README_RUN에도, 없으면 만들지 않는다, 양식 그대로 판정은 유지", () => {
  const LINE = ".agents/skills/와 AGENTS.md는 응시자가 미리 만든 작업 틀(출처: LOG 차용 표, MIT)";
  const n = s => s.split(LINE).length - 1;
  const d = tmp(); run(parseArgs(["--target", d]), HARNESS); run(parseArgs(["--target", d]), HARNESS);
  const s = fs.readFileSync(path.join(d, "README_RUN.md"), "utf8");
  assert.strictEqual(n(s), 1);
  assert.ok(s.split("\n").slice(0, 3).some(l => l.includes(LINE)), "머리 3줄 안");
  assert.ok(check(d, "dev").some(r => r.item === "README_RUN.md" && r.note === "양식 그대로(안 채움)"), "출처 줄이 '채움'으로 세지면 안 된다");
  const e = tmp(); write(e, "README_RUN.md", "# 내 실행 문서\n- 시작: node app.js\n"); run(parseArgs(["--target", e]), HARNESS);
  const t = fs.readFileSync(path.join(e, "README_RUN.md"), "utf8");
  assert.ok(t.startsWith("# 내 실행 문서\n") && n(t) === 1 && t.endsWith("- 시작: node app.js\n"), t);
  const f = tmp(); run(parseArgs(["--target", f, "--mode", "docs"]), HARNESS);
  assert.ok(!fs.existsSync(path.join(f, "README_RUN.md")), "docs 모드는 README_RUN을 만들지 않는다");
});
