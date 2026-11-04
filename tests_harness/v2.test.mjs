// v2.test.mjs — v2 시험: playbook 3개 재편(G-1) · README → REQUIREMENTS(G-2) · check_evidence README 대조 · skills·역할 카드 lint
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseArgs, run as boot, PLAYBOOK, SKILLS, COMMANDS } from "../bootstrap.mjs";
import { extract, run as r2r, MARK } from "../scripts/readme_to_requirements.mjs";
import { check, statusGaps } from "../scripts/check_evidence.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(HARNESS, "tests_harness/fixtures/class_signup");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v2-"));
const fixture = () => { const d = tmp(); fs.cpSync(FIX, d, { recursive: true }); return d; };
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const lines = s => s.replace(/\r\n/g, "\n").trimEnd().split("\n");
const verdicts = d => Object.fromEntries(check(d, "dev").map(r => [r.item, r.verdict]));
const body = f => { const s = rd(HARNESS, f).replace(/^---\n[\s\S]*?\n---\n/, ""); return lines(s).filter(l => l.trim()); };

// ---- G-1 재편
test("G-1: playbook은 RUN·PROMPTS·ASK·DEFEND 4개(v2.8 PROMPTS는 생성 파일), 길이 상한, 상호 참조 0건, 옛 파일 없음", () => {
  assert.deepStrictEqual(PLAYBOOK, ["RUN.md", "PROMPTS.md", "ASK.md", "DEFEND.md"]);
  assert.deepStrictEqual(fs.readdirSync(path.join(HARNESS, "playbook")).sort(), ["ASK.md", "DEFEND.md", "PROMPTS.md", "RUN.md"]);
  // v2.6: ASK.md는 중간 보고 DM 2회(②·②′)로 70줄까지
  const cap = { "RUN.md": 170, "PROMPTS.md": 400, "ASK.md": 95, "DEFEND.md": 240 }; // v2.2 F5: DEFEND에 MEMORIZE 0~4장을 글자 그대로 넣는다 · 카드마다 외울 답·변형 문장·예시 답안
  for (const f of PLAYBOOK) {
    const s = rd(HARNESS, `playbook/${f}`);
    assert.ok(lines(s).length <= cap[f], `${f} ${lines(s).length}줄`);
    assert.doesNotMatch(s, /절로|로 가라|S\d-\d|\d절/, `${f} 상호 참조`);
  }
  for (const f of ["BOXES.md", "TAILS.md", "QUESTION_BANK.md", "ENV_FACTS.md", "DOMAIN_SEMI.md"]) assert.ok(fs.existsSync(path.join(HARNESS, "refs", f)), f);
  assert.match(rd(HARNESS, "bootstrap.sh"), /for f in RUN PROMPTS ASK DEFEND; do/);
});
test("G-1: RUN은 단계 7개마다 치는 것·내 눈·터지는 것 2줄, 머리에 탭 6칸(v2.2 기본 2탭+리뷰어)과 가동 수, 끝에 4탭 확장", () => {
  const s = rd(HARNESS, "playbook/RUN.md");
  const stages = s.split(/^## (?=S\d )/m).slice(1);
  assert.strictEqual(stages.length, 7);
  for (const st of stages) {
    assert.strictEqual((st.match(/^- 치는 것:/gm) || []).length, 1, st.slice(0, 20));
    assert.ok((st.match(/^- 내 눈:/gm) || []).length >= 1, st.slice(0, 20));
    assert.ok((st.match(/^- 터지는 것:/gm) || []).length >= 2, st.slice(0, 20));
    assert.match(st.split("\n")[0], /\(\d+~\d+분\)/);
  }
  // v2.6: 3탭(A·C·D) + S6 리뷰어(B) + server·check·spare = 7칸
  assert.strictEqual((s.match(/^\| [1-7] \| /gm) || []).length, 7);
  assert.match(s, /S0 \*\*A\*\* \/ S1~S2 창 2\(\+창 4 C\) \/ S3~S5 \*\*A\+C\+D\*\* \/ S6 \*\*A\+B\+C\*\*/);
  assert.match(s.trimEnd().split("\n").at(-1), /^4탭 확장.*refs\/PARALLEL4\.md/);
  assert.match(s, /틀린 고름 2개 이상이면 커밋하지 않는다/);
});
test("bootstrap: _playbook/ 4개와 skills를 깔고, refs는 복사하지 않는다", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  assert.deepStrictEqual(fs.readdirSync(path.join(d, "_playbook")).sort(), ["ASK.md", "DEFEND.md", "PROMPTS.md", "RUN.md"]);
  for (const k of SKILLS) assert.ok(fs.existsSync(path.join(d, ".agents/skills", k, "SKILL.md")), k);
  assert.ok(!fs.existsSync(path.join(d, "refs")));
});

// ---- G-2 README → REQUIREMENTS
test("readme_to_requirements 정상: 요구 8·규칙 7·산출물 5 = 20행 + 지목 1, 껍데기 4, 제공 스키마·README는 그대로", () => {
  const d = fixture(), readme = rd(d, "README.md"), schema = rd(d, "SLOT_SCHEMA.md"), t0 = Date.now();
  const r = r2r(d);
  assert.ok(Date.now() - t0 < 3000);
  // v2.3: 규칙 절 불릿 전부(V1, README.md:19 추가) · 지목 문장은 Q 행(V2)
  assert.deepStrictEqual([r.ex.reqs.length, r.ex.rules.length, r.ex.files.length, r.ex.outScope.length, r.ex.asks.length], [8, 7, 5, 3, 1]);
  const rows = lines(rd(d, "REQUIREMENTS.md")).filter(l => /^\| [RKF]\d+ \|/.test(l));
  assert.strictEqual(rows.length, 20);
  assert.deepStrictEqual(r.created.sort(), [".env.example", "AI_COLLABORATION.md", "Dockerfile", "HOW_TO_RUN.md"]);
  assert.strictEqual(rd(d, "README.md"), readme); assert.strictEqual(rd(d, "SLOT_SCHEMA.md"), schema);
  assert.match(rd(d, "AI_COLLABORATION.md"), /^# AI 협업 기록\n## Q1\./); assert.strictEqual((rd(d, "AI_COLLABORATION.md").match(/\(답변\)/g) || []).length, 3);
  assert.ok(rd(d, "Dockerfile").includes(MARK));
  assert.ok(rows.some(l => /data\/README\.md:6/.test(l)), "링크한 데이터 문서의 규칙");
  assert.ok(!rows.some(l => /전화 접수|마감 3일 전/.test(l)), "코드 펜스 안은 뽑지 않는다");
  assert.ok(rows.some(l => /\| F\d \| 산출물·질문형 \|.*AI_COLLABORATION\.md/.test(l)));
  assert.match(rd(d, "REQUIREMENTS.md"), /\| X3 \| 루트 `README\.md`는 수정하지 않습니다\./);
});
test("readme_to_requirements 경계: 다시 돌려도 REQUIREMENTS·사람이 고친 파일을 덮어쓰지 않는다", () => {
  const d = fixture(); r2r(d);
  fs.writeFileSync(path.join(d, "HOW_TO_RUN.md"), "내가 쓴 실행 문서\n");
  fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), "내가 고친 표\n");
  const r = r2r(d);
  assert.deepStrictEqual(r.created, []);
  assert.strictEqual(rd(d, "HOW_TO_RUN.md"), "내가 쓴 실행 문서\n");
  assert.strictEqual(rd(d, "REQUIREMENTS.md"), "내가 고친 표\n");
  assert.strictEqual(r.reqFile, "out/REQUIREMENTS.new.md");
  assert.ok(r.warnings.some(w => /덮어쓰지 않았다/.test(w)));
  assert.strictEqual(lines(rd(d, "out/REQUIREMENTS.new.md")).filter(l => /^\| [RKF]\d+ \|/.test(l)).length, 20);
});
test("readme_to_requirements 오류: 번호 없는 README는 규칙만 뽑고 경고, README가 없으면 거부", () => {
  const d = tmp(); fs.writeFileSync(path.join(d, "README.md"), "# x\n\n- 하루 2회까지 보낸다.\n- 개인 번호는 저장하지 않습니다.\n- 화면은 단순하게.\n결과는 `REPORT.md`에.\n");
  const ex = extract(d);
  assert.deepStrictEqual([ex.reqs.length, ex.rules.length, ex.files.length], [0, 2, 1]);
  assert.ok(ex.warnings.some(w => /번호 목록 요구가 0개/.test(w)));
  assert.throws(() => extract(tmp()), /README\.md가 없다/);
});

// ---- check_evidence README 대조 4개
test("check_evidence: 상태 빈 행·필수 파일 부재·docker 기록 없음·(답변) 잔존은 FAIL, 채우면 PASS", () => {
  const d = fixture(); boot(parseArgs(["--target", d]), HARNESS); r2r(d);
  let v = verdicts(d);
  assert.strictEqual(v["REQUIREMENTS 상태 칸"], "FAIL"); assert.strictEqual(v["README 필수 파일"], "PASS");
  assert.strictEqual(v["out/docker_build.txt"], "FAIL"); assert.strictEqual(v["AI_COLLABORATION.md 답변"], "FAIL");
  assert.strictEqual(v["필수 파일 껍데기 그대로"], "WARN");
  fs.rmSync(path.join(d, "HOW_TO_RUN.md"));
  assert.strictEqual(verdicts(d)["README 필수 파일"], "FAIL");
  fs.writeFileSync(path.join(d, "HOW_TO_RUN.md"), "# HOW_TO_RUN\n실행: node server.js\n");
  fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), rd(d, "REQUIREMENTS.md").replace(/^(\| [RKFQ]\d+ \|.*\|)\s*\|$/gm, "$1 됨 |"));
  fs.writeFileSync(path.join(d, "AI_COLLABORATION.md"), rd(d, "AI_COLLABORATION.md").replace(/\(답변\)/g, "직접 쓴 답"));
  fs.mkdirSync(path.join(d, "out"), { recursive: true }); fs.writeFileSync(path.join(d, "out/docker_build.txt"), "Successfully built\n");
  v = verdicts(d);
  for (const k of ["REQUIREMENTS 상태 칸", "README 필수 파일", "out/docker_build.txt", "AI_COLLABORATION.md 답변"]) assert.strictEqual(v[k], "PASS", k);
  assert.deepStrictEqual(statusGaps(rd(d, "REQUIREMENTS.md")), []);
});
test("check_evidence: README가 있는데 REQUIREMENTS가 없으면 FAIL, 둘 다 없으면 WARN, 칸 속 \\| 는 칸을 나누지 않는다", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  assert.strictEqual(verdicts(d)["REQUIREMENTS.md"], "WARN");
  fs.writeFileSync(path.join(d, "README.md"), "1. 하나\n");
  assert.strictEqual(verdicts(d)["REQUIREMENTS.md"], "FAIL");
  assert.deepStrictEqual(statusGaps("| # | 원문 | 상태 |\n|---|---|---|\n| R1 | a \\| b |  |\n| R2 | c | 됨 |\n"), ["R1"]);
});

// ---- skills·역할 카드 lint
test("skills lint: 한 단어 명령 8개는 첫 줄이 고치는 파일 범위, 마지막 줄이 '멈춰라', BOXES에 같은 이름 상자", () => {
  assert.deepStrictEqual(COMMANDS, ["s0", "s1", "ask", "plan", "feat", "readme", "verify", "defend", "debug", "screen", "prove", "decide", "algo"]);
  assert.match(rd(HARNESS, ".agents/skills/debug/SKILL.md"), /3번 실패하면 멈춘다[\s\S]*diag_web\.mjs/);
  const boxes = rd(HARNESS, "refs/BOXES.md");
  for (const k of COMMANDS) {
    assert.match(boxes, new RegExp(`^## ${k}\n`, "m"), `BOXES ${k}`);
    const b = body(`.agents/skills/${k}/SKILL.md`);
    assert.match(b[0], /^고치는 파일: /, k); assert.match(b.at(-1), /멈춰라\.$/, k);
  }
  const feat = rd(HARNESS, ".agents/skills/feat/SKILL.md");
  assert.match(feat, /틀린 고름이 \*\*2개 이상\*\*이면 커밋하지 않는다/); assert.match(feat, /1A 2B 3A 4B처럼 답해라/); assert.match(feat, /설명 카드/); assert.match(feat, /더 단순한 방법/);
  assert.match(rd(HARNESS, ".agents/skills/ask/SKILL.md"), /개수 상한 없음/); assert.match(rd(HARNESS, ".agents/skills/ask/SKILL.md"), /숫자를 제안하는 형태/);
  assert.match(rd(HARNESS, ".agents/skills/plan/SKILL.md"), /빠진 번호가 0개/);
  assert.match(rd(HARNESS, ".agents/skills/defend/SKILL.md"), /구조 한 장[\s\S]*기준과 이유[\s\S]*숫자[\s\S]*AI를 바로잡은 지점[\s\S]*한계·안 만든 것[\s\S]*깨지는 조건/);
});
test("역할 카드 lint: A·B·C·D 소유 파일 교집합 0(v2.6 3탭 — D가 데이터·측정, C가 문서), 커밋은 A만, 복잡도 예산 문구", () => {
  const own = Object.fromEntries(["a", "b", "c", "d"].map(r => {
    const b = body(`.agents/skills/role-${r}/SKILL.md`);
    assert.match(b[0], /^소유 파일: /, r); assert.match(b.at(-1), /멈춰라\.$/, r);
    return [r, b[0].replace(/^소유 파일: /, "").split(" · ").map(x => x.trim())];
  }));
  const pre = x => x.replace(/\*.*$/, "");
  const clash = (x, y) => x === y || (x.endsWith("/") && y.startsWith(x)) || (y.endsWith("/") && x.startsWith(y)) || (/\*/.test(x) && y.startsWith(pre(x))) || (/\*/.test(y) && x.startsWith(pre(y)));
  // v2.6: 3탭 기본(A·C·D, S6에 B) — 네 카드가 서로 겹치지 않는다(v2.2의 "D ⊂ C" 통합은 되돌림)
  const roles = Object.keys(own);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
    for (const x of own[roles[i]]) for (const y of own[roles[j]]) assert.ok(!clash(x, y), `${roles[i]}:${x} ↔ ${roles[j]}:${y}`);
  for (const r of ["b", "c", "d"]) {
    const s = rd(HARNESS, `.agents/skills/role-${r}/SKILL.md`);
    assert.match(s, /커밋 준비됨/, r); assert.doesNotMatch(s, /git commit|커밋해라/, r);
  }
  const a = rd(HARNESS, ".agents/skills/role-a/SKILL.md");
  assert.match(a, /단순한 방법 먼저/); assert.match(a, /틀린 고름이 2개 이상이면 커밋하지 않고/);
  assert.match(rd(HARNESS, ".agents/skills/role-b/SKILL.md"), /4문장.*코드가 다른 곳/);
});

// ---- W4 scaffold node-v2
test("node-v2 정상: bootstrap이 뼈대 전부를 깔고 LOG 차용 표에 파일 목록·MIT, 그 폴더에서 node --test 전부 통과", () => {
  const d = tmp(); const r = boot(parseArgs(["--target", d, "--scaffold", "node-v2", "--with", "all"]), HARNESS);
  for (const f of ["server.js", "src/auth.js", "src/store.js", "src/lock.js", "src/time.js", "src/validate_schema.js", "public/index.html", "Dockerfile", ".dockerignore", ".env.example", "HOW_TO_RUN.md", "scripts/verify_container.sh", "tests/smoke.test.js", "tests/feat_lock.test.js"])
    assert.ok(r.created.includes(f), f);
  assert.match(rd(d, "LOG.md"), /\| 서버 뼈대\(scaffold\/node-v2 부품 base\+auth\+store\+lock\+schema\+docker, 과제 로직 없음\) \|.*\| MIT \| 파일 \d+개 복사: .*server\.js/);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; // 바깥 시험 러너의 표식을 지워야 안쪽 결과가 stdout으로 나온다
  const out = execFileSync(process.execPath, ["--test"], { cwd: d, encoding: "utf8", env });
  assert.match(out, /(ℹ|#) fail 0/); assert.match(out, /(ℹ|#) pass (1[8-9]|[2-9]\d)/); // node 22는 파이프에서 TAP(#), 23+는 spec(ℹ)
});
test("node-v2 경계: README가 Dockerfile·HOW_TO_RUN을 요구하면 스캐폴드 파일은 '제공됨'이 아니라 상태 빈 '만들 것'", () => {
  const d = fixture(); boot(parseArgs(["--target", d, "--scaffold", "node-v2", "--with", "docker"]), HARNESS);
  const r = r2r(d), req = rd(d, "REQUIREMENTS.md");
  assert.ok(!r.created.includes("Dockerfile") && !r.created.includes("HOW_TO_RUN.md"));
  assert.match(req, /이미 있음 — 내용 확인\) \| Dockerfile \|  \|  \|/);
  assert.match(req, /\| F5 \| 산출물·질문형 \| `AI_COLLABORATION\.md` — 아래/);
  assert.match(req, /\| — \(제공 문서\) \| SLOT_SCHEMA\.md \|  \| 제공됨 \|/);
  assert.ok(check(d, "dev").some(x => x.item === "필수 파일 껍데기 그대로" && /HOW_TO_RUN\.md/.test(x.note)));
});
test("node-v2 오류: docker가 없으면 verify_container는 SKIP(종료 3)을 남기고, check_evidence는 그것을 PASS로 세지 않는다", (t) => {
  try { execFileSync("sh", ["-c", "true"]); } catch { return t.skip("sh 없음"); }
  const d = tmp(); boot(parseArgs(["--target", d, "--scaffold", "node-v2", "--with", "docker"]), HARNESS);
  let code = 0;
  try { execFileSync("sh", ["scripts/verify_container.sh"], { cwd: d, env: { ...process.env, DOCKER: "__no_docker__" }, stdio: "pipe" }); } catch (e) { code = e.status; }
  assert.strictEqual(code, 3);
  assert.match(rd(d, "out/docker_build.txt"), /^SKIP: docker 없음/m);
  assert.strictEqual(verdicts(d)["out/docker_build.txt"], "WARN");
  fs.writeFileSync(path.join(d, "out/docker_build.txt"), "== x\nFAIL: docker build\n");
  assert.strictEqual(verdicts(d)["out/docker_build.txt"], "FAIL");
});

// ---- W5 설명 카드·설명 준비
test("설명 정상: 모의 LOG의 카드 2장·설명 준비 6장+문항 8+초안이 60줄 안이면 PASS, '기록 없음' 수를 센다", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  fs.copyFileSync(path.join(HARNESS, "tests_harness/fixtures/mock_log/LOG.md"), path.join(d, "LOG.md"));
  fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), "| # | 종류 | 원문 | 만들 것 | 파일 | 테스트 | 상태 |\n|---|---|---|---|---|---|---|\n| R1 | 요구 | a | 만들 것 | x | t | 됨 [S 4/6] |\n| R2 | 요구 | b | 만들 것 | y | t | 됨 [S 4/6] |\n");
  const r = Object.fromEntries(check(d, "dev").map(x => [x.item, x]));
  assert.strictEqual(r["LOG 설명 카드"].verdict, "PASS", r["LOG 설명 카드"].note);
  assert.match(r["LOG 설명 카드"].note, /카드 2장 · REQUIREMENTS 요구 '됨' 2행/);
  assert.strictEqual(r["LOG 설명 준비"].verdict, "PASS", r["LOG 설명 준비"].note);
  assert.match(r["LOG 설명 준비"].note, /문항 8\/6 · "기록 없음" 2곳/); // v2.6: 기준 = max(6, 카드 수) — 카드 2장이면 6
});
test("설명 경계: 빠진 장·60줄 초과·문항이 기준(max(6, 카드 수))보다 적으면 WARN(제출을 막지는 않는다)", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  const mock = rd(HARNESS, "tests_harness/fixtures/mock_log/LOG.md");
  const one = s => { fs.writeFileSync(path.join(d, "LOG.md"), s); return check(d, "dev").find(x => x.item === "LOG 설명 준비"); };
  assert.match(one(mock.replace("### ⑥ 깨지는 조건", "### ⑥ 기타")).note, /빠진 장: 깨지는 조건/);
  assert.strictEqual(one(mock.replace("### AI_COLLABORATION 초안", "- 줄\n".repeat(40) + "### AI_COLLABORATION 초안")).verdict, "WARN");
  const less = one(mock.replace(/^- Q[678]\..*$/gm, ""));
  assert.strictEqual(less.verdict, "WARN"); assert.match(less.note, /문항 5\/6/);
  assert.ok(!check(d, "dev").some(x => x.item.startsWith("LOG 설명") && x.verdict === "FAIL"));
});
test("설명 오류: 기능이 '됨'인데 카드가 없거나 카드에 내 4문장이 없으면 WARN, 설명 준비가 비면 $defend 안내", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), "| # | 종류 | 원문 | 만들 것 | 파일 | 테스트 | 상태 |\n|---|---|---|---|---|---|---|\n| R1 | 요구 | a | 만들 것 | x | t | 됨 |\n");
  let r = Object.fromEntries(check(d, "dev").map(x => [x.item, x]));
  assert.strictEqual(r["LOG 설명 카드"].verdict, "WARN"); assert.match(r["LOG 설명 준비"].note, /\$defend/);
  const mock = rd(HARNESS, "tests_harness/fixtures/mock_log/LOG.md").replace(/^- 내 4문장: 취소가.*$/m, "");
  fs.writeFileSync(path.join(d, "LOG.md"), mock);
  r = Object.fromEntries(check(d, "dev").map(x => [x.item, x]));
  assert.match(r["LOG 설명 카드"].note, /내 4문장 없음: 카드 2/);
});

// ---- W8 handoff
test("handoff: 목록을 모아 git add 명령, 같은 파일 두 목록이면 충돌(종료 1), 없는 파일·목록 밖 변경 경고", async () => {
  const { collect } = await import("../scripts/handoff.mjs");
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  fs.writeFileSync(path.join(d, "HOW_TO_RUN.md"), "x"); fs.mkdirSync(path.join(d, "tests"), { recursive: true }); fs.writeFileSync(path.join(d, "tests/qa_a.test.js"), "x");
  fs.writeFileSync(path.join(d, "out/ready_b.txt"), "tests/qa_a.test.js\nVERIFY.md\n");
  fs.writeFileSync(path.join(d, "out/ready_c.txt"), "- HOW_TO_RUN.md\n# 메모\n./없는파일.md\n");
  let r = collect(d);
  assert.deepStrictEqual(r.conflicts, []); assert.deepStrictEqual(r.missing, ["없는파일.md"]);
  assert.strictEqual(r.add, "git add -- tests/qa_a.test.js VERIFY.md HOW_TO_RUN.md");
  assert.ok(r.unclaimed.includes("PLAN.md"), "목록 밖 변경");
  fs.writeFileSync(path.join(d, "out/ready_d.txt"), "VERIFY.md\n");
  r = collect(d);
  assert.deepStrictEqual(r.conflicts, [{ file: "VERIFY.md", roles: ["b", "d"] }]);
  let code = 0;
  try { execFileSync(process.execPath, [path.join(HARNESS, "scripts/handoff.mjs")], { cwd: d, stdio: "pipe" }); } catch (e) { code = e.status; assert.match(String(e.stdout), /충돌: VERIFY\.md ← b·d/); }
  assert.strictEqual(code, 1);
  assert.match(rd(d, ".gitignore"), /^out\/ready_\*\.txt$/m);
});
test("부품 정상: PARTS가 scaffold/node-v2 파일을 빠짐·겹침 없이 나누고, 바닥만 깔아도 그 폴더 시험이 통과", async () => {
  const { PARTS, walk } = await import("../bootstrap.mjs");
  const all = Object.values(PARTS).flat();
  assert.strictEqual(new Set(all).size, all.length, "부품끼리 겹침");
  assert.deepStrictEqual([...all].sort(), walk(path.join(HARNESS, "scaffold/node-v2")));
  const d = tmp(); const r = boot(parseArgs(["--target", d, "--scaffold", "node-v2"]), HARNESS);
  assert.ok(r.created.includes("server.js") && !r.created.includes("src/auth.js") && !r.created.includes("Dockerfile"));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const out = execFileSync(process.execPath, ["--test"], { cwd: d, encoding: "utf8", env });
  assert.match(out, /(ℹ|#) fail 0/);
  assert.match(rd(d, "LOG.md"), /서버 뼈대\(scaffold\/node-v2 부품 base, 과제 로직 없음\)/);
});
test("부품 경계: 바닥 위에 --with로 부품을 더해도 기존 파일을 안 덮고, 부품 하나씩만 깐 조합도 시험 통과", () => {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  for (const p of ["auth", "store", "lock", "schema", "auth,lock"]) {
    const d = tmp(); boot(parseArgs(["--target", d, "--scaffold", "node-v2"]), HARNESS);
    fs.writeFileSync(path.join(d, "server.js"), rd(d, "server.js") + "// 내가 고친 줄\n");
    const r = boot(parseArgs(["--target", d, "--scaffold", "node-v2", "--with", p]), HARNESS);
    assert.ok(r.kept.includes("server.js") && rd(d, "server.js").endsWith("// 내가 고친 줄\n"), p);
    const out = execFileSync(process.execPath, ["--test"], { cwd: d, encoding: "utf8", env });
    assert.match(out, /(ℹ|#) fail 0/, p);
  }
});
test("부품 오류: 모르는 부품·node-v2 없이 --with는 거부", () => {
  assert.throws(() => parseArgs(["--scaffold", "node-v2", "--with", "auth,payments"]), /payments/);
  assert.throws(() => parseArgs(["--with", "auth"]), /--scaffold node-v2와 함께/);
  assert.deepStrictEqual(parseArgs(["--scaffold", "node-v2", "--with", "all"]).with, ["auth", "store", "lock", "schema", "docker"]);
});
test("뼈대 추천: README 단어로 부품과 근거 줄, 제외 범위·코드 펜스는 무시, 다른 언어면 node 뼈대 대신 traps 상자", async () => {
  const { recommend, recommendLines, scanLines } = await import("../scripts/readme_to_requirements.mjs");
  const ex = extract(fixture());
  assert.deepStrictEqual(ex.scaffold.parts.map(p => p.part), ["auth", "schema", "docker"]);
  assert.strictEqual(ex.scaffold.parts[0].src, "README.md:22");
  assert.match(recommendLines(ex.scaffold)[1], /--scaffold node-v2 --with auth,schema,docker$/);
  const r2 = recommend(scanLines("# x\n1. 표를 보여 준다.\n```\n로그인 Dockerfile\n```\n## 다루지 않는 범위\n- 로그인은 만들지 않습니다.\n"));
  assert.deepStrictEqual(r2.parts, []); assert.match(recommendLines(r2)[1], /node-v2$/);
  const r3 = recommend(scanLines("# x\n- 기술 스택: Python 3.11과 FastAPI로 구현합니다.\n1. 로그인한다.\n"));
  assert.strictEqual(r3.lang.name, "Python"); assert.match(recommendLines(r3)[1], /traps 상자/);
  assert.strictEqual(recommend(scanLines("# x\n- JavaScript로 화면을 만듭니다.\n")).lang, null);
  const traps = rd(HARNESS, "refs/BOXES.md").split(/^## /m).find(b => b.startsWith("traps"));
  for (const n of ["smoke", "feat_time", "feat_auth", "feat_store", "feat_lock", "feat_schema", "verify_container.sh", "멈춰라"]) assert.ok(traps.includes(n), n);
});

// ---- W1 (G-6) 빈 검사·약화된 테스트 차단·환경 5줄
const gitc = (d, ...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, encoding: "utf8" });
test("G-6 통과 0: out/test_result.txt가 '통과 0 · 실패 0'이면 FAIL", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  fs.writeFileSync(path.join(d, "out/test_result.txt"), "# tests 0\n# pass 0\n# fail 0\n");
  const r = check(d, "dev").find(x => x.item === "out/test_result.txt");
  assert.strictEqual(r.verdict, "FAIL"); assert.match(r.note, /하나도 안 돌았다/);
});
test("G-6 건너뛰기: tests/ 아래 .skip(·.only(·pytest.mark.skip은 파일:줄과 함께 WARN, 표식이 없으면 항목도 없다", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  assert.ok(!check(d, "dev").some(x => x.item === "테스트 건너뛰기 표식"));
  fs.writeFileSync(path.join(d, "tests/a.test.js"), "const test = require('node:test');\ntest('ok', () => {});\ntest.skip('나중에', () => {});\n");
  fs.writeFileSync(path.join(d, "tests/test_b.py"), "import pytest\n@pytest.mark.skip\ndef test_x():\n    pass\n");
  const r = check(d, "dev").find(x => x.item === "테스트 건너뛰기 표식");
  assert.strictEqual(r.verdict, "WARN"); assert.match(r.note, /tests\/a\.test\.js:3/); assert.match(r.note, /tests\/test_b\.py:2/);
});
test("G-6 테스트 감소: 직전 커밋보다 test( 수가 줄면 FAIL, 같거나 늘면 PASS", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  fs.writeFileSync(path.join(d, "tests/a.test.js"), "test('a', () => {});\ntest('b', () => {});\nit('c', () => {});\n");
  gitc(d, "add", "-A"); gitc(d, "commit", "-qm", "테스트 3");
  fs.writeFileSync(path.join(d, "tests/a.test.js"), "test('a', () => {});\ntest('b', () => {});\nit('c', () => {});\ntest('d', () => {});\n");
  gitc(d, "commit", "-qam", "테스트 4");
  assert.strictEqual(check(d, "dev").find(x => x.item.startsWith("테스트 개수")).verdict, "PASS");
  fs.writeFileSync(path.join(d, "tests/a.test.js"), "test('a', () => {});\n// test.skip 지움\n");
  gitc(d, "commit", "-qam", "테스트 줄임");
  const r = check(d, "dev").find(x => x.item.startsWith("테스트 개수"));
  assert.strictEqual(r.verdict, "FAIL"); assert.match(r.note, /4 → 1/);
});
test("G-6 빈 폴더: 판정할 재료가 없으면 check는 []이고 CLI는 종료 코드 2 '검사한 것이 없다'", () => {
  const d = tmp();
  assert.deepStrictEqual(check(d, "dev"), []);
  let code = 0, out = "";
  try { execFileSync(process.execPath, [path.join(HARNESS, "scripts/check_evidence.mjs")], { cwd: d, stdio: "pipe" }); } catch (e) { code = e.status; out = String(e.stdout); }
  assert.strictEqual(code, 2); assert.match(out, /검사한 것이 없다/);
});
test("환경 5줄: node·python·docker·playwright·시간대 순, python 3.10 미만이면 Z 접미사 경고", async () => {
  const { envReport, pyWarn } = await import("../bootstrap.mjs");
  const lines = envReport(tmp());
  assert.deepStrictEqual(lines.slice(0, 5).map(l => l.split(" ")[0]), ["node", "python", "docker", "playwright", "시간대"]);
  assert.match(lines[4], /2026-01-01T00:00Z가 로컬 \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  assert.match(pyWarn("Python 3.8.10"), /fromisoformat/); assert.strictEqual(pyWarn("Python 3.10.1"), ""); assert.strictEqual(pyWarn(""), "");
  assert.match(rd(HARNESS, "refs/AGENTS_NOTES.md"), /통과 0은 통과가 아니다/); // v2.2 F1: 줄별 해설은 NOTES로 옮겼다
});

// ---- W2 (G-7) diag_web — 빈 화면 원인 분리
import { createRequire } from "node:module";
const scaffoldCopy = (patch) => {
  const d = tmp(); fs.cpSync(path.join(HARNESS, "scaffold/node-v2"), d, { recursive: true });
  if (patch) patch(d);
  return createRequire(path.join(d, "server.js"))("./server.js");
};
const freePort = () => new Promise(ok => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
import net from "node:net";
test("G-7 (a) 정상: 0.0.0.0 뼈대 → 다섯 단계 모두 지나고 ok", async () => {
  const { diag } = await import("../scripts/diag_web.mjs");
  const app = await scaffoldCopy().start({ port: 0, host: "0.0.0.0", dbPath: path.join(tmp(), "app.db") });
  try {
    const r = await diag(app.port);
    assert.strictEqual(r.ok, true, JSON.stringify(r.rows)); assert.strictEqual(r.rows.length, 5);
    assert.match(r.rows[4][1], /^PASS \/health 200/);
  } finally { await new Promise(ok => app.server.close(ok)); }
});
test("G-7 (b) 127.0.0.1 바인딩: ② 바인딩에서 멈추고 HOST=0.0.0.0을 권한다", async (t) => {
  if (!Object.values(os.networkInterfaces()).flat().some(i => i && i.family === "IPv4" && !i.internal)) return t.diagnostic("바깥 IPv4가 없는 환경 — ss 출력으로만 판정");
  const { diag } = await import("../scripts/diag_web.mjs");
  const app = await scaffoldCopy().start({ port: 0, host: "127.0.0.1", dbPath: path.join(tmp(), "app.db") });
  try {
    const r = await diag(app.port);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.rows.at(-1)[0], "② 바인딩"); assert.match(r.rows.at(-1)[3], /0\.0\.0\.0/);
  } finally { await new Promise(ok => app.server.close(ok)); }
});
test("G-7 (c) js 경로 틀림: ④ js·css에서 멈추고 틀린 경로·404를 보여 준다", async () => {
  const { diag } = await import("../scripts/diag_web.mjs");
  const mod = scaffoldCopy(d => { const f = path.join(d, "public/index.html"); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("</head>", '<script src="js/app.js"></script>\n</head>')); });
  const app = await mod.start({ port: 0, host: "0.0.0.0", dbPath: path.join(tmp(), "app.db") });
  try {
    const r = await diag(app.port);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.rows.at(-1)[0], "④ js·css"); assert.match(r.rows.at(-1)[1], /\/js\/app\.js 404/);
  } finally { await new Promise(ok => app.server.close(ok)); }
});
test("G-7 (d) 서버 꺼짐: ① 듣는 프로세스에서 멈춘다, CLI는 종료 1과 out/diag_web.txt", async () => {
  const { diag, assets } = await import("../scripts/diag_web.mjs");
  const port = await freePort(), r = await diag(port);
  assert.strictEqual(r.ok, false); assert.strictEqual(r.rows.length, 1); assert.match(r.cause, /서버가 꺼졌다/);
  const d = tmp(); let code = 0;
  try { execFileSync(process.execPath, [path.join(HARNESS, "scripts/diag_web.mjs"), String(port)], { cwd: d, stdio: "pipe" }); } catch (e) { code = e.status; }
  assert.strictEqual(code, 1); assert.match(rd(d, "out/diag_web.txt"), /원인 후보: 서버가 꺼졌다/);
  assert.deepStrictEqual(assets('<script src="a.js"></script><script src="https://cdn.x/y.js"></script><link rel="stylesheet" href="./s.css"><link rel="icon" href="f.ico">'), ["/a.js", "/s.css"]);
});

// ---- W3 (G-8) screen_check — 역할별 화면 확인 (이 PC는 playwright 없음 → 폴백 경로만 고정)
const REQ_SCREEN = "| # | 종류 | 원문 | 만들 것 | 파일 | 테스트 | 상태 |\n|---|---|---|---|---|---|---|\n| R1 | 요구 | 1. 운영자 화면 — 전체 목록을 봅니다. — README.md:3 |  |  |  |  |\n| R2 | 요구 | 2. 내보내기 — JSON. — README.md:4 |  |  |  |  |\n";
test("G-8 폴백: 뼈대+데모 계정 두 역할 → 판정을 꾸며 내지 않고 '미측정' 표와 계정이 든 체크 목록, check_evidence WARN", async () => {
  const { screenRows, demoAccounts, screenCheck, render } = await import("../scripts/screen_check.mjs");
  const d = tmp(); boot(parseArgs(["--target", d, "--scaffold", "node-v2", "--with", "auth"]), HARNESS);
  fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), REQ_SCREEN);
  const rows = screenRows(rd(d, "REQUIREMENTS.md")), accounts = demoAccounts(d);
  assert.deepStrictEqual(rows.map(r => [r.id, r.path]), [["R1", "/"]]);
  assert.deepStrictEqual(accounts.map(a => [a.user, a.pass]), [["operator", "operator-demo"], ["member", "member-demo"]]);
  const app = await createRequire(path.join(d, "server.js"))("./server.js").start({ port: 0, host: "127.0.0.1", dbPath: path.join(tmp(), "app.db") });
  try {
    const r = await screenCheck({ dir: d, base: `http://127.0.0.1:${app.port}`, accounts, rows, pw: null });
    assert.match(r.mode, /폴백/); assert.deepStrictEqual(r.table.map(t => t[3]), ["미측정", "미측정"]);
    assert.match(r.checklist[0], /operator \/ operator-demo.*\/ → 볼 것: R1/);
    fs.mkdirSync(path.join(d, "out"), { recursive: true }); fs.writeFileSync(path.join(d, "out/screen_check.md"), render(r));
    const v = check(d, "dev").find(x => x.item === "out/screen_check.md");
    assert.strictEqual(v.verdict, "WARN"); assert.match(v.note, /미측정 2/);
  } finally { await new Promise(ok => app.server.close(ok)); }
});
test("G-8 빈 화면: 빈 HTML을 주는 서버는 폴백에서도 '빈 화면'으로 잡히고 check_evidence FAIL, '내가 확인'으로 고치면 PASS", async () => {
  const { screenCheck, render, judge, staticBlank } = await import("../scripts/screen_check.mjs");
  const http = await import("node:http");
  const srv = http.createServer((q, s) => { s.writeHead(200, { "Content-Type": "text/html" }); s.end("<!doctype html><html><body><div id=app></div></body></html>"); });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  try {
    const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
    const r = await screenCheck({ dir: d, base: `http://127.0.0.1:${srv.address().port}`, accounts: [], rows: [{ id: "R1", text: "x", path: "/" }], pw: null });
    assert.strictEqual(r.table[0][3], "빈 화면");
    fs.writeFileSync(path.join(d, "out/screen_check.md"), render(r));
    assert.strictEqual(check(d, "dev").find(x => x.item === "out/screen_check.md").verdict, "FAIL");
    fs.writeFileSync(path.join(d, "out/screen_check.md"), render(r).replace("| 빈 화면 |", "| 내가 확인 |"));
    assert.strictEqual(check(d, "dev").find(x => x.item === "out/screen_check.md").verdict, "PASS");
  } finally { await new Promise(ok => srv.close(ok)); }
  assert.strictEqual(judge({ text: "짧다", rootEmpty: false }), "빈 화면"); assert.strictEqual(judge({ text: "로그인: operator (operator) 로그아웃 버튼이 있다", rootEmpty: false }), "보임");
  assert.strictEqual(judge({ text: "x".repeat(50), rootEmpty: true }), "빈 화면");
  assert.strictEqual(staticBlank("<div id=root></div><script src=a.js></script>"), false, "스크립트가 있으면 폴백은 단정하지 않는다");
});
test("G-8 기록 없음: REQUIREMENTS에 화면 행이 있는데 out/screen_check.md가 없으면 WARN '$screen'", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  fs.writeFileSync(path.join(d, "REQUIREMENTS.md"), REQ_SCREEN);
  const v = check(d, "dev").find(x => x.item === "out/screen_check.md");
  assert.strictEqual(v.verdict, "WARN"); assert.match(v.note, /\$screen/);
});

// ---- W4 (G-9) $prove — 효과 비교표 숫자는 json에서만
const proveRun = () => {
  const d = tmp(); fs.cpSync(path.join(HARNESS, "tests_harness/fixtures/prove_picking"), d, { recursive: true });
  for (const k of ["baseline", "lower_bound", "ours"]) execFileSync(process.execPath, [`scripts/prove_${k}.mjs`], { cwd: d });
  fs.copyFileSync(path.join(HARNESS, "templates/dev/PROVE.md"), path.join(d, "out/prove.md"));
  return d;
};
test("G-9 정상: 기준안·하한·우리 안 스크립트 실행 → prove_table이 표를 채우고, 표 숫자 = out/prove_*.json", async () => {
  const { loadProve, checkProve } = await import("../scripts/prove_table.mjs");
  const d = proveRun();
  const out = execFileSync(process.execPath, [path.join(HARNESS, "scripts/prove_table.mjs")], { cwd: d, encoding: "utf8" });
  assert.match(out, /대조: 일치 3행/);
  const items = loadProve(d), md = rd(d, "out/prove.md");
  assert.deepStrictEqual(items.map(i => i.kind), ["baseline", "lower_bound", "ours"]);
  for (const { data, file } of items) assert.ok(md.split("\n").some(l => l.includes(`| ${data.metrics["이동 거리(칸)"]} | 7 | ${data.vs_lower_pct} |`) && l.endsWith(`| ${file} |`)), file);
  assert.deepStrictEqual(checkProve(md, d).mismatches, []);
  assert.strictEqual(items[1].data.vs_lower_pct, 100);
  assert.ok(items[2].data.metrics["이동 거리(칸)"] < items[0].data.metrics["이동 거리(칸)"], "우리 안이 기준안보다 짧다");
  assert.strictEqual(check(d, "dev").find(x => x.item === "out/prove.md 비교표").verdict, "PASS");
});
test("G-9 결함 재삽입: 표에 손으로 고친 숫자를 넣으면 prove_table --check 종료 1, check_evidence FAIL", () => {
  const d = proveRun();
  execFileSync(process.execPath, [path.join(HARNESS, "scripts/prove_table.mjs")], { cwd: d });
  const md = rd(d, "out/prove.md"), ours = JSON.parse(rd(d, "out/prove_ours.json")).metrics["이동 거리(칸)"];
  fs.writeFileSync(path.join(d, "out/prove.md"), md.replace(`| 우리 안 | 통로 순·칸 순으로 묶어 집기 | ${ours} |`, `| 우리 안 | 통로 순·칸 순으로 묶어 집기 | ${ours - 10} |`));
  let code = 0, so = "";
  try { execFileSync(process.execPath, [path.join(HARNESS, "scripts/prove_table.mjs"), "--check"], { cwd: d, stdio: "pipe" }); } catch (e) { code = e.status; so = String(e.stdout); }
  assert.strictEqual(code, 1); assert.ok(so.includes(`우리 안 이동 거리(칸): 표 ${ours - 10} ≠ out/prove_ours.json ${ours}`), so);
  assert.strictEqual(check(d, "dev").find(x => x.item === "out/prove.md 비교표").verdict, "FAIL");
});
test("G-9 오류: json이 없으면 종료 1, 비교표 절이 없으면 불일치로 보고, $defend는 out/prove.md를 읽는다", async () => {
  const { checkProve } = await import("../scripts/prove_table.mjs");
  let code = 0;
  try { execFileSync(process.execPath, [path.join(HARNESS, "scripts/prove_table.mjs")], { cwd: tmp(), stdio: "pipe" }); } catch (e) { code = e.status; }
  assert.strictEqual(code, 1);
  assert.match(checkProve("# 표 없음\n", tmp()).mismatches[0], /비교표/);
  assert.match(rd(HARNESS, ".agents/skills/defend/SKILL.md"), /out\/prove\.md/);
  assert.match(rd(HARNESS, ".agents/skills/prove/SKILL.md"), /손으로 쓰거나 고치지 않는다[\s\S]*반증 리뷰어/);
});

// ---- 지시 틀(범용) — 과제 값 없이 빈칸만
test("지시 틀: RUN 머리와 BOXES prompt 상자에 4줄 틀·반응 문장 6개, 빈칸 밖에 숫자(과제 값) 없음, 명령 11개가 붙인 줄을 우선", () => {
  const run = rd(HARNESS, "playbook/RUN.md"), sec = run.split(/^## /m).find(b => b.startsWith("지시 틀"));
  const box = rd(HARNESS, "refs/BOXES.md").split(/^## /m).find(b => b.startsWith("prompt\n"));
  const prompts = rd(HARNESS, "playbook/PROMPTS.md"); // v2.8: RUN의 반응 문장은 PROMPTS ‘반응-…’ 블록으로 옮겼다
  for (const [name, s] of [["RUN", sec], ["BOXES", box]]) {
    assert.ok(s, name);
    // v2.2: RUN 머리의 지시 틀은 코드 블록이 아니라 인용 블록(>)이다 — 둘 다 인정한다
    const fenced = [...s.matchAll(/```\n([\s\S]*?)```/g)].map(m => m[1]).join("\n") + "\n" + s.split("\n").filter(l => l.startsWith("> ")).join("\n");
    for (const k of ["목적:", "근거:", "범위:", "하지 마라:", "고칠 파일:", "내 판단:", "이유:", "확인:"]) assert.ok(fenced.includes(k), `${name} ${k}`);
    const sample = fenced + "\n" + s.split("\n").filter(l => /^\s+- /.test(l)).join("\n");
    assert.doesNotMatch(sample.replace(/<[^>]*>/g, ""), /\d/, `${name}: 빈칸 밖에 숫자`);
    for (const k of ["요구에 없다", "내가 원본과 대조", "실패를 먼저 보이고", "PLAN·REQUIREMENTS를 먼저", "두 번 실패", "통과·실패 개수"]) assert.ok((name === "RUN" ? prompts : s).includes(k), `${name} 반응 ${k}`);
    if (name === "RUN") for (const k of ["요구 밖", "내가 검증", "바로잡기", "의도 갱신", "접근 변경", "숫자 없는 완료"]) assert.ok(s.includes(`‘반응-${k}’`), `RUN 반응 참조 ${k}`);
  }
  for (const k of COMMANDS) assert.match(rd(HARNESS, `.agents/skills/${k}/SKILL.md`), /\[목적 줄 없음\]/, k);
  assert.match(run, /^> 명령은 Codex 입력칸\(`›`\)에 `\$명령` \+ \*\*내 문장 4줄\*\*/m);
  assert.ok(!fs.existsSync(path.join(HARNESS, "scripts/timer.mjs")), "타이머는 뺐다");
});
