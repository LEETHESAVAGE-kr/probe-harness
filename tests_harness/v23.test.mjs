// v23.test.mjs — v2.3 audit GAP 반영: 규칙 절 불릿(V1) · 지목 Q 행(V2) · 스키마 대조 기록(V3) · 담당자 대화 태그 칸(V4) · C 목록 커밋(V5) · 서사 한 줄(V6) · 상충 슬롯 D7(V7) · 요구 변경 재측정(V8) · 모드 기준(DC3)
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseArgs, run as boot } from "../bootstrap.mjs";
import { extract, run as r2r } from "../scripts/readme_to_requirements.mjs";
import { check } from "../scripts/check_evidence.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(HARNESS, "tests_harness/fixtures/class_signup");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v23-"));
const fixture = () => { const d = tmp(); fs.cpSync(FIX, d, { recursive: true }); return d; };
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const gitc = (d, ...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, encoding: "utf8" });
const item = (d, name) => check(d, "dev").find(x => x.item === name);

// ---- V1 규칙 절 불릿
test("V1 규칙 절: '운영 규칙' 절의 불릿은 숫자·의무형과 무관하게 전부 K 행(README.md:19 포함), 절 밖은 지금 규칙", () => {
  const ex = extract(fixture());
  const src = ex.rules.map(r => r.src);
  for (const n of [15, 16, 17, 18, 19]) assert.ok(src.includes(`README.md:${n}`), `README.md:${n}`);
  assert.ok(src.includes("data/README.md:6"));
  // 절 밖: 요구 1 아래 의무형 불릿은 지금처럼 규칙, 숫자·의무형 없는 배경 불릿(:9)은 규칙 아님
  assert.ok(src.some(s => /^README\.md:2[34]$/.test(s)), "요구 1 아래 '…있어야 합니다'");
  assert.ok(!src.includes("README.md:9"), "배경 절 불릿은 규칙이 아니다");
  assert.strictEqual(ex.rules.length, 7, src.join(" "));
  const d = tmp(); fs.writeFileSync(path.join(d, "README.md"), "# x\n\n## 운영 조건\n- 휴무일 기록은 실적에서 제외합니다.\n- 시간표를 그대로 씁니다.\n\n## 배경\n- 지금은 종이로 처리합니다.\n");
  assert.deepStrictEqual(extract(d).rules.map(r => r.src), ["README.md:4", "README.md:5"]);
});

test("V1 규칙 절(굵은 제목 줄): '**운영 규칙**' 한 줄 아래 불릿도 전부 K 행, 다음 일반 문단에서 절이 끝난다", () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, "README.md"), "# x\n\n## 과제\n**운영 규칙**\n- 정원은 4명입니다.\n- 이동 시간은 반드시 제공 파일의 값을 씁니다.\n\n요구는 아래와 같습니다.\n- 화면은 단순하게 둡니다.\n\n**참고**\n- 지금은 종이로 처리합니다.\n");
  assert.deepStrictEqual(extract(d).rules.map(r => r.src), ["README.md:5", "README.md:6"]);
});

// ---- V2 지목 Q 행
test("V2 지목: '담당자에게 확인' 류 문장은 Q 행(K가 아님), REQUIREMENTS에 들어가고 상태 칸이 비어 있다", () => {
  const d = fixture(); const r = r2r(d);
  assert.strictEqual(r.ex.asks.length, 1, JSON.stringify(r.ex.asks));
  assert.match(r.ex.asks[0].text, /담당자에게 확인/);
  assert.ok(!r.ex.rules.some(x => /담당자/.test(x.text)), "지목 문장이 규칙 행으로 중복");
  const q = rd(d, "REQUIREMENTS.md").split("\n").filter(l => /^\| Q\d+ \|/.test(l));
  assert.strictEqual(q.length, 1); assert.match(q[0], /^\| Q1 \| 지목 \| .*담당자에게 확인.* — README\.md:\d+ \|/);
  const t = tmp(); fs.writeFileSync(path.join(t, "README.md"), "# x\n1. 표를 만든다.\n- 우선순위는 담당자에게 질문해 정합니다.\n대기 기준은 담당자가 알고 있습니다.\n- 정원은 3명입니다.\n");
  const ex = extract(t);
  assert.deepStrictEqual(ex.asks.map(a => a.src), ["README.md:3", "README.md:4"]);
  assert.deepStrictEqual(ex.rules.map(a => a.src), ["README.md:5"]);
});
test("V2 지목: $ask SKILL·BOXES ask 1단계가 REQUIREMENTS의 Q 행부터 시작한다", () => {
  const skill = rd(HARNESS, ".agents/skills/ask/SKILL.md"), box = rd(HARNESS, "refs/BOXES.md").split(/^## /m).find(b => b.startsWith("ask\n"));
  assert.match(skill.split("\n").find(l => /^1\. /.test(l)), /^1\. REQUIREMENTS의 Q(?:\(지목\))? 행부터/);
  assert.match(box.split("\n")[2], /^REQUIREMENTS의 Q\(지목\) 행부터/);
});

// ---- V3 스키마 대조 기록
test("V3 $verify: 내보내기 샘플 → out/export_sample.json, 검증기 출력 → out/schema_check.txt(PASS/FAIL/SKIP) 단계가 SKILL·BOXES에 있다", () => {
  const skill = rd(HARNESS, ".agents/skills/verify/SKILL.md"), box = rd(HARNESS, "refs/BOXES.md").split(/^## /m).find(b => b.startsWith("verify\n"));
  for (const s of [skill, box]) { assert.match(s, /out\/export_sample\.json/); assert.match(s, /validate_schema\.js/); assert.match(s, /out\/schema_check\.txt/); assert.match(s, /SKIP/); }
  assert.match(skill, /^5\. \*\*스키마 대조\*\*/m);
});
test("V3 check_evidence: 내보내기 요구가 있는데 out/schema_check.txt가 없으면 WARN, FAIL 줄이면 FAIL, PASS 줄이면 PASS, 요구가 없으면 항목 없음", () => {
  const d = fixture(); boot(parseArgs(["--target", d]), HARNESS); r2r(d);
  assert.strictEqual(item(d, "out/schema_check.txt").verdict, "WARN");
  fs.writeFileSync(path.join(d, "out/schema_check.txt"), "FAIL 빠진 키 1: class_id\n"); assert.strictEqual(item(d, "out/schema_check.txt").verdict, "FAIL");
  fs.writeFileSync(path.join(d, "out/schema_check.txt"), "PASS 빠진 키 0: - · 남는 키 0: -\n"); assert.strictEqual(item(d, "out/schema_check.txt").verdict, "PASS");
  const e = tmp(); boot(parseArgs(["--target", e]), HARNESS); fs.writeFileSync(path.join(e, "README.md"), "# x\n1. 표를 보여 준다.\n"); r2r(e);
  assert.strictEqual(item(e, "out/schema_check.txt"), undefined);
});

// ---- V4 담당자 대화 태그 칸
test("V4 LOG 양식: 담당자 대화 표가 4칸(태그 포함)이고 $ask 행과 칸 수가 같다, 옛 3칸 LOG도 check_evidence가 깨지지 않는다", () => {
  const log = rd(HARNESS, "templates/dev/LOG.md");
  assert.match(log, /^\| 시각 \| 구분\(초안\/보냄\/답\) \| 내용\(원문\) \| 태그\(새 정보\/확인\/모름\) \|$/m);
  const row = rd(HARNESS, ".agents/skills/ask/SKILL.md").match(/`(\| 시각 \| 초안 \|[^`]*\|)`/)[1];
  assert.strictEqual(row.split("|").length, "| 시각 | 구분(초안/보냄/답) | 내용(원문) | 태그(새 정보/확인/모름) |".split("|").length);
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  const v4 = check(d, "dev").map(r => [r.item, r.verdict]);
  fs.writeFileSync(path.join(d, "LOG.md"), rd(d, "LOG.md").replace(/\| 시각 \| 구분\(초안\/보냄\/답\) \| 내용\(원문\) \| 태그[^\n]*\n\|---\|---\|---\|---\|/, "| 시각 | 구분(초안/보냄/답) | 내용(원문) |\n|---|---|---|"));
  assert.deepStrictEqual(check(d, "dev").map(r => [r.item, r.verdict]), v4);
});

// ---- V5 C 목록 커밋
test("V5 RUN: S2 확인 시각 커밋과 S4 첫 기능 커밋에 'C의 커밋 준비됨 목록(handoff.mjs)도 함께' — v2.8부터 문장은 PROMPTS 블록, RUN은 그 단계에서 부른다", () => {
  const run = rd(HARNESS, "playbook/RUN.md"), stage = n => run.split(/^## (?=S\d )/m).find(s => s.startsWith(`S${n} `));
  const block = n => rd(HARNESS, "playbook/PROMPTS.md").split(/^### /m).find(b => b.startsWith(`${n}\n`)) || "";
  assert.match(block("기록-합의"), /확인 받은 시각[^\n]*C의 커밋 준비됨 목록\(handoff\.mjs\)도 함께/);
  assert.match(block("첫 기능 커밋"), /C의 커밋 준비됨 목록\(handoff\.mjs\)도 함께/);
  assert.match(stage(2), /‘기록-합의’/); assert.match(stage(4), /‘첫 기능 커밋’/);
});

// ---- V6 서사 한 줄
test("V6 $s1: 보고에 '서사: 누가·무엇을·언제 정하나' 한 줄(PLAN 사용자 후보), BOXES s1도", () => {
  assert.match(rd(HARNESS, ".agents/skills/s1/SKILL.md"), /서사: 누가·무엇을·언제 정하나/);
  assert.match(rd(HARNESS, "refs/BOXES.md").split(/^## /m).find(b => b.startsWith("s1\n")), /서사: 누가·무엇을·언제 정하나/);
});

// ---- V7 + DC1 상충 조건 D7
test("V7 상충 조건: DECISIONS 양식 ### D7 슬롯, $plan·BOXES plan '충돌:' 줄, DEFEND 6유형 표에 충돌형 D7, 시그니처가 D7을 센다", () => {
  const dec = rd(HARNESS, "templates/dev/DECISIONS.md");
  assert.match(dec, /^### D7 상충 조건$/m);
  assert.ok(!/^\| D7 \|/m.test(dec), "그 밖의 결정 표가 D7 번호를 쓰면 슬롯과 겹친다");
  assert.match(rd(HARNESS, ".agents/skills/plan/SKILL.md"), /'충돌:' 줄/);
  assert.match(rd(HARNESS, "refs/BOXES.md").split(/^## /m).find(b => b.startsWith("plan\n")), /충돌:/);
  assert.match(rd(HARNESS, "playbook/DEFEND.md"), /^\| 충돌형 과제[^\n]*\| D7 \|$/m);
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  assert.match(item(d, "시그니처").note, /D7 0\/5 WARN$/);
  fs.writeFileSync(path.join(d, "DECISIONS.md"), rd(d, "DECISIONS.md").replace(/(### D7 상충 조건\n- 결정[^:]*:)\s*/, "$1 해당 없음 — README 범위 밖\n"));
  assert.match(item(d, "시그니처").note, /D7 SKIP\(README 범위 밖\)$/);
});

// ---- V8 + DC2 요구 변경 뒤 재측정
test("V8 요구 변경: 커밋 메시지 '요구 변경' 뒤에 browser_check·test_result 갱신 커밋이 없으면 WARN, 둘 다 있으면 PASS, 요구 변경이 없으면 항목 없음", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  gitc(d, "add", "-A"); gitc(d, "commit", "-qm", "[S 4/6] R1 기능");
  assert.strictEqual(item(d, "요구 변경 뒤 재측정"), undefined);
  fs.writeFileSync(path.join(d, "PLAN.md"), "바뀜\n"); gitc(d, "commit", "-qam", "[S 4/6] 요구 변경(10:42) 정원 기준");
  const w = item(d, "요구 변경 뒤 재측정"); assert.strictEqual(w.verdict, "WARN"); assert.match(w.note, /요구 변경 뒤 재측정 없음/);
  fs.writeFileSync(path.join(d, "out/test_result.txt"), "# pass 1\n# fail 0\n"); gitc(d, "add", "-A"); gitc(d, "commit", "-qm", "[S 4/6] 테스트 재실행");
  assert.match(item(d, "요구 변경 뒤 재측정").note, /browser_check/);
  fs.writeFileSync(path.join(d, "out/browser_check.txt"), "200\n"); gitc(d, "add", "-A"); gitc(d, "commit", "-qm", "[S 5/6] 재측정");
  assert.strictEqual(item(d, "요구 변경 뒤 재측정").verdict, "PASS");
});

// ---- DC3 모드 기준
test("DC3 README: --mode docs 기준 한 줄", () => {
  assert.match(rd(HARNESS, "README.md"), /--mode docs는 README 요구에 서버·화면·로그인·API가 하나도 없고 산출물이 문서·표뿐일 때만/);
});
