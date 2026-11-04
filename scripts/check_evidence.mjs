#!/usr/bin/env node
// check_evidence.mjs — 제출 전 점검: 증거 파일·양식 그대로 남은 문서·README 대조(REQUIREMENTS·필수 파일·docker 기록·AI_COLLABORATION)·테스트·curl·고정 절·합의 순서·git 상태 → 항목별 판정 + 최종 판정
// 사용: (작업 폴더에서) node /tmp/harness/scripts/check_evidence.mjs [--mode dev|docs]
// 종료 코드: 0 제출 가능(FAIL 0) · 1 막힘(FAIL 1개 이상) · 2 검사한 것이 없다(양식·README·out/이 하나도 없음 — 통과로 읽지 마라)
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib.mjs";
import { extract, MARK } from "./readme_to_requirements.mjs";
import { testChecks, screenChecks } from "./evidence_tests.mjs";
import { checkProve } from "./prove_table.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
const git = (args, cwd) => { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };

/** 입력: 테스트 출력 문자열 / 출력: {pass, fail}|null (node --test·unittest·pytest 형식) / 깨지는 조건: 다른 러너 형식은 null */
export function testCounts(s) {
  if (!s) return null;
  const np = s.match(/^[#ℹ]\s*pass\s+(\d+)/m), nf = s.match(/^[#ℹ]\s*fail\s+(\d+)/m);
  if (np) return { pass: +np[1], fail: nf ? +nf[1] : 0 };
  const ran = s.match(/Ran (\d+) tests?/);
  if (ran) { const f = s.match(/FAILED \((?:failures|errors)=(\d+)(?:, (?:failures|errors)=(\d+))?/); const fail = f ? +f[1] + (+f[2] || 0) : 0; return { pass: +ran[1] - fail, fail }; }
  const py = s.match(/(\d+) passed/); if (py) { const f = s.match(/(\d+) failed/); return { pass: +py[1], fail: f ? +f[1] : 0 }; }
  return null;
}

/** 입력: 마크다운·절 제목 일부 / 출력: 그 절 표의 채워진 데이터 행 수 / 깨지는 조건: 절이 없으면 -1 */
export function filledRows(md, heading) {
  if (!md) return -1;
  const i = md.indexOf(heading); if (i < 0) return -1;
  const rest = md.slice(i).split(/\r?\n/).slice(1); const next = rest.findIndex(l => /^#{1,6} /.test(l));
  const lines = (next < 0 ? rest : rest.slice(0, next)).filter(l => l.trim().startsWith("|"));
  return lines.slice(2).filter(l => l.split("|").slice(1, -1).some(c => c.trim() !== "")).length;
}

/** 입력: REQUIREMENTS 마크다운 / 출력: 상태 칸이 빈 행의 # 목록 / 깨지는 조건: 상태 머리가 있는 표가 없으면 [] */
export function statusGaps(md) {
  const L = (md || "").split(/\r?\n/), h = L.findIndex(l => /^\|/.test(l) && /\|\s*상태\s*\|/.test(l));
  if (h < 0) return [];
  const cells = l => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(x => x.trim());
  const col = cells(L[h]).indexOf("상태"), gaps = [];
  for (let i = h + 2; i < L.length && L[i].trim().startsWith("|"); i++) { const r = cells(L[i]); if (!r[col]) gaps.push(r[0]); }
  return gaps;
}

/** 입력: REQUIREMENTS 마크다운 / 출력: '만들 것'인데 상태 칸이 빈 행의 # 목록(v2.9) / 깨지는 조건: 표가 없으면 [] */
export function makeGaps(md) {
  const L = (md || "").split(/\r?\n/), h = L.findIndex(l => /^\|/.test(l) && /\|\s*상태\s*\|/.test(l));
  if (h < 0) return [];
  const cells = l => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(x => x.trim());
  const head = cells(L[h]), cMake = head.findIndex(c => /안 만들 것/.test(c)), cState = head.indexOf("상태"), out = [];
  for (let i = h + 2; i < L.length && L[i].trim().startsWith("|"); i++) { const r = cells(L[i]); if (/만들 것/.test(r[cMake] || "") && !/안 만들/.test(r[cMake]) && !r[cState]) out.push(r[0]); }
  return out;
}

/** 입력: REQUIREMENTS 마크다운 / 출력: '안 만들 것'(만들 것/안 만들 것 칸 또는 상태 칸의 "안 만듦")인데 사유가 README 제외·X행이 아닌 행의 # 목록 / 깨지는 조건: 표가 없으면 [] (v2.6) */
export function scopeCuts(md) {
  const L = (md || "").split(/\r?\n/), h = L.findIndex(l => /^\|/.test(l) && /\|\s*상태\s*\|/.test(l));
  if (h < 0) return [];
  const cells = l => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(x => x.trim());
  const head = cells(L[h]), cMake = head.findIndex(c => /안 만들 것/.test(c)), cState = head.indexOf("상태"), out = [];
  for (let i = h + 2; i < L.length && L[i].trim().startsWith("|"); i++) {
    const r = cells(L[i]), said = `${r[cMake] || ""} ${r[cState] || ""}`;
    if (/안 만들|안 만듦/.test(said) && !/README 제외|다루지 않는 범위|범위 밖|X\d/.test(said)) out.push(r[0]);
  }
  return out;
}

/** README 대조 검사 4개: REQUIREMENTS 상태 빈 행 / 필수 파일 부재 / Dockerfile인데 빌드 기록 없음 / AI_COLLABORATION "(답변)" 잔존 → FAIL */
export function readmeChecks(dir, add) {
  const hasReadme = fs.existsSync(path.join(dir, "README.md")), req = read(path.join(dir, "REQUIREMENTS.md"));
  if (req === null) add("REQUIREMENTS.md", hasReadme ? "FAIL" : "WARN", "없음 — $s1(readme_to_requirements.mjs)로 만든다");
  else {
    const g = statusGaps(req); add("REQUIREMENTS 상태 칸", g.length ? "FAIL" : "PASS", g.length ? `빈 행 ${g.length}개: ${g.slice(0, 10).join(" ")}` : "전 행 채움");
    const mg = makeGaps(req); if (mg.length) add("상태 없는 요구", "WARN", `상태 없는 요구 ${mg.length}행 — ${mg.join(" ")}`);
    const cut = scopeCuts(req); add("범위 축소", cut.length ? "WARN" : "PASS", cut.length ? `범위 축소 ${cut.length}행: ${cut.slice(0, 10).join(" ")} — '안 만들 것'은 X행·README 제외만(얇게라도 만든다)` : "안 만들 것 = X행·README 제외뿐");
  }
  if (hasReadme) {
    const files = extract(dir).files, miss = files.filter(f => !fs.existsSync(path.join(dir, f.name))).map(f => f.name);
    add("README 필수 파일", miss.length ? "FAIL" : "PASS", miss.length ? `없음: ${miss.join(", ")}` : `${files.length}개 있음`);
    const shells = files.filter(f => (read(path.join(dir, f.name)) || "").includes(MARK)).map(f => f.name);
    if (shells.length) add("필수 파일 껍데기 그대로", "WARN", `"${MARK}" 남음: ${shells.join(", ")}`);
  }
  if (fs.existsSync(path.join(dir, "Dockerfile"))) {
    const b = read(path.join(dir, "out/docker_build.txt"));
    const v = !b || !b.trim() ? "FAIL" : /^FAIL/m.test(b) ? "FAIL" : /^SKIP/m.test(b) ? "WARN" : "PASS";
    add("out/docker_build.txt", v, v === "PASS" ? "" : !b || !b.trim() ? "Dockerfile이 있는데 docker build 기록이 없다 — $verify" : (b.match(/^(FAIL|SKIP).*$/m) || [""])[0]);
  }
  const ai = read(path.join(dir, "AI_COLLABORATION.md"));
  if (ai !== null) { const n = (ai.match(/\(답변\)/g) || []).length; add("AI_COLLABORATION.md 답변", n ? "FAIL" : "PASS", n ? `"(답변)" ${n}곳 그대로` : ""); }
  if (ai !== null) { const n = (ai.match(/\[초안[AB]?\]/g) || []).length; add("AI_COLLABORATION.md [초안]", n ? "WARN" : "PASS", n ? `${n}곳 남음 — $defend 끝의 "Q1-A Q2-B Q3-A"로 고르면 고른 쪽만 남는다` : ""); }
  // v2.3 V3: 요구·규칙 행에 내보내기·스키마가 있으면 $verify의 스키마 대조 기록이 있어야 한다
  const wantsExport = (req || "").split(/\r?\n/).some(l => /^\|\s*[RK]\d+\s*\|/.test(l) && /내보내기|export|_SCHEMA\.md|스키마/i.test(l));
  if (wantsExport) {
    const sc = read(path.join(dir, "out/schema_check.txt"));
    const v = !sc || !sc.trim() ? "WARN" : /^FAIL/m.test(sc) ? "FAIL" : /^PASS/m.test(sc) ? "PASS" : "WARN";
    add("out/schema_check.txt", v, !sc || !sc.trim() ? "내보내기 요구가 있는데 스키마 대조 기록이 없다 — $verify 5단계" : sc.trim().split(/\r?\n/)[0].slice(0, 120));
  }
}

/** v2.3 V8: 커밋 메시지에 "요구 변경"이 있으면, 마지막 그런 커밋 뒤에 out/test_result.txt·out/browser_check.txt를 바꾼 커밋이 있어야 한다(없으면 WARN) */
export function changeChecks(dir, add) {
  const log = git(["log", "--reverse", "--format=@@%h\t%s", "--name-only"], dir);
  if (!log) return;
  const commits = log.split("@@").filter(Boolean).map(b => { const [head, ...files] = b.split(/\r?\n/).filter(Boolean); const [h, s] = head.split("\t"); return { h, s: s || "", files }; });
  const last = commits.map(c => /요구 변경/.test(c.s)).lastIndexOf(true);
  if (last < 0) return;
  const after = commits.slice(last + 1).flatMap(c => c.files);
  const miss = ["out/test_result.txt", "out/browser_check.txt"].filter(f => !after.includes(f));
  add("요구 변경 뒤 재측정", miss.length ? "WARN" : "PASS", miss.length ? `요구 변경 뒤 재측정 없음(${commits[last].h} 뒤 커밋에 ${miss.map(f => f.replace("out/", "")).join("·")} 갱신 없음) — 테스트 재실행·$verify` : `${commits[last].h} 뒤 테스트·curl 다시 커밋됨`);
}

/** 입력: 마크다운·"## " 제목 앞부분 / 출력: 그 절의 본문 줄 배열(다음 "## " 전까지) 또는 null / 깨지는 조건: 없음 */
export function section(md, title) {
  const L = (md || "").split(/\r?\n/), i = L.findIndex(l => l.startsWith(`## ${title}`));
  if (i < 0) return null;
  const j = L.findIndex((l, k) => k > i && /^## /.test(l));
  return L.slice(i + 1, j < 0 ? L.length : j);
}

/** 서술형 훅 8개(파일 존재·비어 있지 않음만, 내용 해석 없음 — WARN만): 설명 문항의 재료가 제출물에 있는가 (v2.9) */
export function hookChecks(dir, add) {
  const full = f => !!(read(path.join(dir, f)) || "").trim();
  const H = [["scale_check", full("out/scale_check.txt")], ["concurrency_check", full("out/concurrency_check.txt")], ["docker_build", full("out/docker_build.txt")],
    ["test_result", full("out/test_result.txt")], ["browser_check", full("out/browser_check.txt")], ["prove", full("out/prove.md")],
    ["DECISIONS거부", filledRows(read(path.join(dir, "DECISIONS.md")), "거부한 것") > 0], ["퀴즈정답", /퀴즈 정답/.test(read(path.join(dir, "LOG.md")) || "")]];
  const miss = H.filter(h => !h[1]).map(h => h[0].replace("DECISIONS거부", "DECISIONS 거부").replace("퀴즈정답", "LOG 퀴즈 정답"));
  add(`훅 ${H.length - miss.length}/8`, miss.length ? "WARN" : "PASS", H.map(([k, v]) => `${k === "퀴즈정답" ? "퀴즈정답(LOG '퀴즈 정답')" : k} ${v ? "○" : "×"}`).join(" "));
  if (miss.length) add("서술형 재료", "WARN", `서술형 재료 없음 — ${miss.join(", ")}`);
}

const DEFEND_PARTS = ["구조 한 장", "기준과 이유", "숫자", "AI를 바로잡은 지점", "한계", "깨지는 조건", "예상 문항", "AI_COLLABORATION"];
/** 설명 재료 검사(WARN만): 됨 행 수 대비 설명 카드 수·카드의 내 4문장 / "설명 준비" 절의 6장·문항·초안과 60줄 상한 */
export function explainChecks(dir, add) {
  const log = read(path.join(dir, "LOG.md")), req = read(path.join(dir, "REQUIREMENTS.md")) || "";
  if (!log) return;
  const done = (req.match(/^\| R\d+ \|.*\|\s*됨[^|]*\|\s*$/gm) || []).length;
  const cards = (section(log, "설명 카드") || []).join("\n").split(/^### /m).slice(1);
  const no4 = cards.filter(c => !/^- 내 4문장: \S/m.test(c)).map(c => c.split("\n")[0]);
  add("LOG 설명 카드", !cards.length && done ? "WARN" : no4.length ? "WARN" : "PASS",
    `카드 ${cards.length}장 · REQUIREMENTS 요구 '됨' ${done}행${no4.length ? ` · 내 4문장 없음: ${no4.join(", ")}` : ""}`);
  const prep = section(log, "설명 준비");
  const body = (prep || []).filter(l => l.trim());
  if (!body.length) return add("LOG 설명 준비", "WARN", "비어 있음 — 제출 10분 전 $defend");
  const miss = DEFEND_PARTS.filter(p => !body.some(l => /^###/.test(l) && l.includes(p)));
  const q = body.filter(l => /^- Q\d+\./.test(l)).length, none = body.join("\n").split("기록 없음").length - 1;
  const need = Math.max(6, cards.length); // v2.6: 예상 문항 수 = 설명 카드 수(반드시 넣을 6유형이 바닥)
  add("LOG 설명 준비", miss.length || body.length > 60 || q < need ? "WARN" : "PASS",
    `${body.length}줄(상한 60) · 문항 ${q}/${need} · "기록 없음" ${none}곳${miss.length ? ` · 빠진 장: ${miss.join(", ")}` : ""}`);
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7]; // D1~D6 시그니처 기법 · D7 상충 조건(v2.3)
const SKIP_DIRS = new Set(["node_modules", "out", "tests", "_playbook", "data", "portal", "var"]);
const CODE_EXT = /\.(m?js|cjs|ts|py|sh|go|java|rb)$/;
/** 입력: 폴더·상대 경로 / 출력: 그 아래 파일의 상대 경로 목록(점으로 시작하는 폴더는 건너뜀) / 깨지는 조건: 없음(없으면 []) */
function files(dir, rel = "") {
  let es; try { es = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }); } catch { return []; }
  return es.flatMap(e => e.name.startsWith(".") ? [] : e.isDirectory() ? files(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]);
}
const slotsIn = (s, re) => new Set([...(s || "").matchAll(re)].map(m => +m[1]));

/** 입력: DECISIONS 본문 / 출력: {n: "본문"|"해당 없음"|""} — "### Dn" 절의 "- 칸: 값" 줄(">" 안내 줄은 빼고)과 "| Dn |" 표 행을 본다 / 깨지는 조건: 없음 */
export function decisionSlots(md) {
  const L = (md || "").split(/\r?\n/), r = {};
  for (const n of SLOTS) {
    const vals = [], h = L.findIndex(l => new RegExp(`^#{2,4} D${n}(?!\\d)`).test(l));
    if (h >= 0) for (let i = h + 1; i < L.length && !/^#{1,4} /.test(L[i]); i++) { const m = L[i].match(/^- [^:]+:\s*(.*)$/); if (m && m[1].trim()) vals.push(m[1]); }
    const row = L.find(l => new RegExp(`^\\|\\s*D${n}(?!\\d)\\s*\\|`).test(l));
    if (row) vals.push(...row.split("|").slice(2, -1).map(c => c.trim()).filter(Boolean));
    r[n] = vals.some(v => v.includes("해당 없음")) ? "해당 없음" : vals.length ? "본문" : "";
  }
  return r;
}

/** F4-4 시그니처 기법: 슬롯마다 다섯 곳(DECISIONS 본문 · 코드 주석 [Dn] · 테스트 이름 [Dn] · 커밋 메시지 Dn · AI_COLLABORATION Dn) — 3 이상 PASS, "해당 없음" SKIP, 2 이하 WARN(FAIL 없음) */
export function signatureChecks(dir, add) {
  const dec = decisionSlots(read(path.join(dir, "DECISIONS.md")));
  const all = files(dir).filter(f => !SKIP_DIRS.has(f.split(path.sep)[0]));
  const code = new Set(all.filter(f => CODE_EXT.test(f)).flatMap(f => [...slotsIn(read(path.join(dir, f)), /(?:\/\/|#)\s*\[D([1-7])\]/g)]));
  const test = new Set(files(dir, "tests").flatMap(f => [...slotsIn(read(path.join(dir, f)), /(?:test|it|describe)\s*\(\s*["'`]\[D([1-7])\]/g), ...(/\.py$/.test(f) ? slotsIn(read(path.join(dir, f)), /\[D([1-7])\]/g) : [])]));
  const commits = slotsIn(git(["log", "--format=%s%n%b"], dir), /(?<![\w-])D([1-7])(?!\d)/g);
  const ai = slotsIn(read(path.join(dir, "AI_COLLABORATION.md")), /(?<![\w-])D([1-7])(?!\d)/g);
  const parts = SLOTS.map(n => {
    if (dec[n] === "해당 없음") return [n, "SKIP", `D${n} SKIP(README 범위 밖)`];
    const k = [dec[n] === "본문", code.has(n), test.has(n), commits.has(n), ai.has(n)].filter(Boolean).length;
    const v = k >= 3 ? "PASS" : "WARN";
    return [n, v, `D${n} ${k}/5 ${v}`];
  });
  add("시그니처", parts.some(p => p[1] === "WARN") ? "WARN" : "PASS", parts.map(p => p[2]).join(" · "));
}

/** 입력: 작업 폴더·모드 / 출력: [{item, verdict: PASS|FAIL|WARN, note}] — 판정할 재료(양식·README·out/)가 하나도 없으면 [] / 깨지는 조건: 없음(git 없으면 WARN) */
export function check(dir = process.cwd(), mode = "dev") {
  const R = [], add = (item, verdict, note = "") => R.push({ item, verdict, note });
  const tdir = path.join(HARNESS, "templates", mode === "dev" ? "dev" : "docs");
  const docs = mode === "dev" ? ["AGENTS.md", "PLAN.md", "LOG.md", "DECISIONS.md", "VERIFY.md", "README_RUN.md"]
    : ["AGENTS.md", "INTERVIEW.md", "AGREEMENT.md", "SOURCE_MATRIX.md", "FINDINGS.md", "REPORT.md", "DECISIONS.md", "VERIFY.md", "HANDOFF.md"];
  if (![...docs, "README.md", "out"].some(f => fs.existsSync(path.join(dir, f)))) return R;
  for (const f of docs) {
    const s = read(path.join(dir, f)), t = read(path.join(tdir, f));
    if (s === null || !s.trim()) add(f, "FAIL", "없음/빈 파일");
    else if (t !== null && s.trim() === t.trim()) add(f, "FAIL", "양식 그대로(안 채움)");
    else add(f, "PASS");
  }
  const log = read(path.join(dir, "LOG.md"));
  add("LOG 하네스 출처 행", log && /harness \S+ \S+ MIT/.test(log) ? "PASS" : "WARN", "없으면 차용 표에 하네스 URL·커밋을 적는다");
  if (mode === "dev") {
    readmeChecks(dir, add);
    explainChecks(dir, add);
    hookChecks(dir, add);
    signatureChecks(dir, add);
    changeChecks(dir, add);
    screenChecks(dir, add);
    const pv = read(path.join(dir, "out/prove.md"));
    if (pv !== null) { const r = checkProve(pv, dir); add("out/prove.md 비교표", r.mismatches.length ? "FAIL" : "PASS", r.mismatches.length ? `표 숫자 ≠ out/prove_*.json: ${r.mismatches.slice(0, 3).join(" · ")}` : `${r.rows}행 일치`); }
    testChecks(dir, add, testCounts(read(path.join(dir, "out/test_result.txt"))));
    const bc = read(path.join(dir, "out/browser_check.txt"));
    add("out/browser_check.txt", bc && /\b200\b/.test(bc) ? "PASS" : "FAIL", bc ? (/\b200\b/.test(bc) ? "상태 200 있음" : "상태 200 없음") : "없음");
    const fixed = filledRows(log, "AI 위임 vs 직접 검증");
    add("LOG 고정 절 'AI 위임 vs 직접 검증'", fixed > 0 ? "PASS" : "FAIL", fixed < 0 ? "절 없음" : `채운 행 ${fixed}`);
    const plan = read(path.join(dir, "PLAN.md")) || "";
    const lim = plan.match(/\|\s*한계[^|]*\|([^|]*)\|/);
    add("PLAN 한계", lim && lim[1].trim() ? "PASS" : "FAIL", lim ? "" : "한계 칸을 못 찾음");
    const crit = plan.match(/\|\s*성공 기준[^|]*\|([^|]*)\|/);
    add("PLAN 성공 기준 숫자", crit && /\d/.test(crit[1]) ? "PASS" : "WARN", "숫자가 없으면 측정 불가");
    const agreed = plan.match(/확인 받은 시각:\s*(\d{1,2}:\d{2})/);
    // 시계(시간대·자정)에 기대지 않고 커밋 순서로 본다: '확인 받은 시각'이 처음 PLAN에 들어간 커밋이 첫 [S 4] 커밋보다 앞인가
    const order = (git(["log", "--reverse", "--format=%h\t%s"], dir) || "").split("\n").filter(Boolean).map(l => l.split("\t"));
    const firstFeat = order.findIndex(([, s]) => /\[S ?4/.test(s));
    const agreeHash = agreed ? (git(["log", "--reverse", "--format=%h", "-S", `확인 받은 시각: ${agreed[1]}`, "--", "PLAN.md"], dir) || "").split("\n")[0].trim() : "";
    const agreeIdx = order.findIndex(([h]) => h === agreeHash);
    if (!agreed) add("합의 시각 < 첫 기능 커밋", "FAIL", "PLAN '확인 받은 시각: HH:MM' 없음");
    else if (firstFeat < 0) add("합의 시각 < 첫 기능 커밋", "WARN", `합의 ${agreed[1]} · [S 4] 커밋 없음`);
    else if (agreeIdx < 0) add("합의 시각 < 첫 기능 커밋", "FAIL", `합의 ${agreed[1]}이 첫 기능 커밋 전에 커밋되지 않음`);
    else add("합의 시각 < 첫 기능 커밋", agreeIdx < firstFeat ? "PASS" : "FAIL", `합의 기록 커밋 ${agreeHash}(${agreeIdx + 1}번째) · 첫 기능 커밋 ${order[firstFeat][0]}(${firstFeat + 1}번째)`);
  } else {
    const ag = read(path.join(dir, "AGREEMENT.md")) || "";
    add("AGREEMENT 확인 시각", /확인 받은 시각:\s*\d{1,2}:\d{2}/.test(ag) ? "PASS" : "FAIL");
    const fixed = filledRows(read(path.join(dir, "DECISIONS.md")), "AI 위임 vs 직접 검증");
    add("DECISIONS 고정 절", fixed > 0 ? "PASS" : "FAIL", fixed < 0 ? "절 없음" : `채운 행 ${fixed}`);
  }
  const cl = filledRows(read(path.join(dir, "out/changes_log.md")), "changes_log");
  add("out/changes_log.md", cl > 0 ? "PASS" : "WARN", cl > 0 ? `행 ${cl}` : "행 없음 — 데이터를 안 바꿨으면 그렇다고 PLAN에");
  add("out/inventory.md", read(path.join(dir, "out/inventory.md")) ? "PASS" : "WARN", "데이터가 없는 과제면 무시");
  const st = git(["status", "--porcelain"], dir), n = git(["rev-list", "--count", "HEAD"], dir);
  if (st === null) add("git", "WARN", "git 저장소 아님");
  else {
    const lines = st.split("\n").filter(Boolean), untracked = lines.filter(l => l.startsWith("??")), changed = lines.length - untracked.length;
    add("git 상태", changed ? "FAIL" : untracked.length ? "WARN" : "PASS",
      changed ? `커밋 안 된 변경 ${changed}개` : untracked.length ? `추적 안 하는 파일 ${untracked.length}개(${untracked.map(l => l.slice(3)).slice(0, 3).join(", ")}) — 제출물이면 커밋, 아니면 .gitignore` : `깨끗 · 커밋 ${String(n).trim()}개`);
  }
  return R;
}

if (isMain(import.meta.url)) {
  const i = process.argv.indexOf("--mode"); const mode = i > 0 ? process.argv[i + 1] : "dev";
  const R = check(process.cwd(), mode);
  if (!R.length) { console.log("검사한 것이 없다 — 통과로 읽지 마라(작업 폴더에서 실행했나? 양식·README·out/이 하나도 없다)"); process.exit(2); }
  for (const r of R) console.log(`${r.verdict.padEnd(4)}  ${r.item}${r.note ? "  — " + r.note : ""}`);
  const fail = R.filter(r => r.verdict === "FAIL").length, warn = R.filter(r => r.verdict === "WARN").length;
  console.log(`판정: ${fail ? `막힘 ${fail}건 — 위 FAIL부터 고친다` : "제출 가능"} (경고 ${warn})`);
  process.exit(fail ? 1 : 0);
}
