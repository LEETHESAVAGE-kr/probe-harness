// v26.test.mjs — v2.6 (AGGRESSIVE_PLAN_1105 6장): S4 얇게 8 → 깊게 1 + $prove → 마무리 · 3탭(A·C·D)+리뷰어 · $prove 필수(D) · 카드 = 만들 것 행 수 · 중간 보고 2회 · 범위 축소 WARN
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, run as boot } from "../bootstrap.mjs";
import { check } from "../scripts/check_evidence.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(HARNESS, f), "utf8").replace(/\r\n/g, "\n");
const RUN = rd("playbook/RUN.md");
const stage = n => RUN.split(/^## (?=S\d )/m).find(s => s.startsWith(`S${n} `)) || "";
// v2.8: 붙이는 블록은 PROMPTS.md에 있다(첫 줄이 $이름 한 단어)
const PROMPTS = rd("playbook/PROMPTS.md");
const blockOf = cmd => (PROMPTS.match(new RegExp("^```\\n(\\" + cmd + "\\n[\\s\\S]*?)^```", "m")) || [])[1] || "";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v26-"));

test("v2.9 시간표: S0 0~8 · S1 8~30 · S2 30~48 · S3 48~55 · S4 55~150 · S5 150~163 · S6 163~172", () => {
  const want = { 0: "0~8", 1: "8~30", 2: "30~48", 3: "48~55", 4: "55~150", 5: "150~163", 6: "163~172" };
  for (const [n, r] of Object.entries(want)) assert.match(stage(n).split("\n")[0], new RegExp(`\\(${r}분\\)`), `S${n}`);
});

test("v2.6 S4 세 구간: ① 1패스 얇게 → ② 깊게 1 + $prove(30분) → ③ 마무리(10분), 끝 조건 '안 만들 것 = X행과 README 제외만'", () => {
  const s = stage(4);
  assert.match(s, /^- \*\*① 1패스 얇게 전 행 \(55~120분\)\*\*/m);
  assert.match(s, /^- \*\*② 깊게 1 \+ `\$prove` \(120~150분\)\*\*/m);
  assert.match(s, /^- \*\*③ 마무리 \(140~150분\)\*\*/m);
  assert.match(s, /안 만들 것 = X행과 README 제외만/);
  assert.ok(s.indexOf("① 1패스") < s.indexOf("② 깊게 1") && s.indexOf("② 깊게 1") < s.indexOf("③ 마무리"));
});

test("v2.6 $feat 블록: 범위 칸이 <얇게: 최소 동작 1 + 테스트 1/깊게: 지표 1 + 규칙 1> 선택지", () => {
  const b = blockOf("$feat");
  assert.ok(b, "$feat 블록 없음");
  assert.match(b.split("\n").find(l => l.startsWith("범위:")), /<얇게: 최소 동작 1 \+ 테스트 1\/깊게: 지표 1 \+ 규칙 1>/);
});

test("v2.6 $prove 블록: S4에 D 탭용, 지표 1개 · 현행/기준안/우리 안/하한 · out/prove.md", () => {
  const b = blockOf("$prove");
  assert.ok(b, "$prove 블록이 PROMPTS에 없다");
  for (const k of ["지표", "현행", "기준안", "우리 안", "하한", "out/prove.md"]) assert.ok(b.includes(k), k);
  assert.match(stage(4), /D에 PROMPTS\.md ‘prove’ 블록/);
});

test("창 표: 판단 · A 구현 · A2 구현 · C 문서 · D 측정(S3~S5) · 터미널 · B 리뷰 · 서버, 중계 10건 초과면 D를 S5로", () => {
  const rows = RUN.split("\n").filter(l => /^\| [1-8] \| /.test(l));
  assert.deepStrictEqual(rows.map(r => r.split("|")[2].trim()), ["판단", "A 구현", "A2 구현", "C 문서", "D 측정", "터미널", "B 리뷰", "서버"]);
  const d = rows.find(r => r.includes("D 측정"));
  assert.match(d, /\$role-d/); assert.match(d, /\| S3~S5 \|$/);
  assert.match(RUN, /중계가 10건을 넘으면 D를 S5로/);
  assert.match(RUN, /S0 \*\*A\*\* \/ S1~S2 창 2\(\+창 4 C\) \/ S3~S5 \*\*A\+C\+D\*\* \/ S6 \*\*A\+B\+C\*\*/);
});

test("v2.6 역할 카드: D가 S3~S5 기본(첫 일 데이터셋 2벌, 깊게 구간 $prove 필수), C는 문서, 소유 파일은 A·B·C·D 서로 겹치지 않는다", () => {
  const d = rd(".agents/skills/role-d/SKILL.md"), c = rd(".agents/skills/role-c/SKILL.md");
  assert.match(d, /\$prove.*필수/); assert.match(d, /첫 일은 데이터셋 2벌/);
  assert.doesNotMatch(d, /4탭 확장 때만/);
  assert.match(rd(".agents/skills/prove/SKILL.md").split("\n").find(l => l.startsWith("description:")), /D 탭.*필수/);
  const own = r => rd(`.agents/skills/role-${r}/SKILL.md`).split("\n").find(l => l.startsWith("소유 파일: ")).replace("소유 파일: ", "").split(" · ").map(s => s.trim());
  assert.ok(own("c").includes("HOW_TO_RUN.md") && !own("c").includes("out/prove.md"));
  for (const f of ["data/prepared/", "out/prove.md", "out/changes_log.md", "out/schema_check.txt"]) assert.ok(own("d").includes(f), f);
});

test("v2.6 카드 수: $feat 끝 조건 '요구마다 설명 카드 1장(총 = 만들 것 행 수)', $defend 예상 문항 수 = 설명 카드 수", () => {
  assert.match(rd(".agents/skills/feat/SKILL.md").split("## 끝 조건")[1], /요구마다 설명 카드 1장\(총 = 만들 것 행 수\)/);
  assert.match(rd(".agents/skills/defend/SKILL.md"), /예상 문항 수 = 설명 카드 수/);
});

test("v2.6 ASK: 중간 보고 DM 2회(~75분·~150분) 문장, 결과 DM에 성공 기준 숫자 자리", () => {
  const a = rd("playbook/ASK.md");
  assert.match(a, /\*\*② 중간 보고 1 — [^\n]*75분/); assert.match(a, /\*\*②′ 중간 보고 2 — [^\n]*150분/);
  const res = a.split("**③")[1].split("**④")[0];
  assert.match(res, /성공 기준\{[^}]+\}: 지금 \{[^}]+\} → \{[^}]+\}/);
});

const req = rows => `| # | 종류 | 원문 | 만들 것/안 만들 것 | 파일 | 테스트 | 상태 |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n\n## 다루지 않는 범위\n| # | 원문 |\n|---|---|\n| X1 | 결제는 다루지 않습니다. |\n`;
test("v2.6 check_evidence 범위 축소: '안 만들 것'이 X행·README 제외 사유가 아닌 행이면 WARN '범위 축소 n행', 없으면 PASS", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  const one = rows => { fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), req(rows)); return check(d, "dev").find(x => x.item === "범위 축소"); };
  let r = one(["| R1 | 요구 | a | 만들 것 ★1 | x | t | 됨 |", "| R2 | 요구 | b | 안 만들 것 — README 제외(X1) |  |  | 안 만듦 — README 제외 |"]);
  assert.strictEqual(r.verdict, "PASS", r.note);
  r = one(["| R1 | 요구 | a | 만들 것 | x | t | 됨 |", "| R2 | 요구 | b | 안 만들 것 — 시간 |  |  | 안 만듦 — 시간 |", "| R3 | 요구 | c | 만들 것 | x | t | 안 만듦 — 시간 |"]);
  assert.strictEqual(r.verdict, "WARN"); assert.match(r.note, /범위 축소 2행: R2 R3/);
});

test("v2.6 check_evidence 설명 준비: 예상 문항 기준 = max(6, 설명 카드 수)", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  const mock = rd("tests_harness/fixtures/mock_log/LOG.md");
  const cards = n => Array.from({ length: n }, (_, i) => `### 카드 ${i + 1} — 기능\n- 내 4문장: 문장\n`).join("\n");
  fs.writeFileSync(path.join(d, "LOG.md"), mock.replace(/## 설명 카드[\s\S]*?(?=\n## 설명 준비)/, `## 설명 카드\n\n${cards(9)}`));
  const r = check(d, "dev").find(x => x.item === "LOG 설명 준비");
  assert.strictEqual(r.verdict, "WARN"); assert.match(r.note, /문항 8\/9/);
});
