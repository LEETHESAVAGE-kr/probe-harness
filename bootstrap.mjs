#!/usr/bin/env node
// bootstrap.mjs — 작업 폴더에 AGENTS.md·문서 양식·빈 폴더를 깐다. 기존 파일은 덮어쓰지 않는다 — 예외 하나: readme_to_requirements가 만든 빈 껍데기는 --scaffold 때 뼈대 파일로 바꾼다.
// 사용: (작업 폴더에서) node /tmp/harness/bootstrap.mjs [--mode dev|docs] [--scaffold node|python] [--target 폴더]
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { MARK } from "./scripts/readme_to_requirements.mjs";

const HARNESS = path.dirname(fileURLToPath(import.meta.url));

/** 입력: 파일 본문 / 출력: readme_to_requirements가 만든 빈 껍데기 그대로면 true — 제목 한 줄(선택) + "아직 비어 있음 — README 요구 파일(…)" 한 줄뿐(.json은 {"_todo": …} 하나뿐)
 *  깨지는 조건: 사람이 한 줄이라도 더 쓰거나 그 줄을 고치면 false. README 양식이 복사된 껍데기(MARK 없음)·스캐폴드 HOW_TO_RUN 양식(여러 줄)도 false */
export function isShell(text) {
  const L = String(text ?? "").replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  const sig = s => s.startsWith(`${MARK} — README 요구 파일(`);
  if (L.length === 1 && L[0].startsWith("{")) { try { const o = JSON.parse(L[0]); return Object.keys(o).length === 1 && sig(String(o._todo ?? "")); } catch { return false; } }
  const body = L.length === 2 && /^#\s/.test(L[0]) && !L[0].includes(MARK) ? L.slice(1) : L;
  return body.length === 1 && sig(body[0].replace(/^[#>\s]+/, ""));
}
const readIfFile = f => { try { return fs.statSync(f).isFile() ? fs.readFileSync(f, "utf8") : ""; } catch { return ""; } };
// 사람이 읽는 것 4개만(PROMPTS.md는 refs/BOXES.md에서 scripts/gen_prompts.mjs가 만든다) 작업 폴더 _playbook/에 사본(편집기에서 바로 연다, .gitignore로 커밋 제외). refs/는 하네스 폴더에 그대로 둔다.
export const PLAYBOOK = ["RUN.md", "PROMPTS.md", "ASK.md", "DEFEND.md"];
// Codex가 작업 폴더 .agents/skills/에서 찾는 한 단어 명령($s1 등)과 역할 카드($role-a 등)
export const COMMANDS = ["s0", "s1", "ask", "plan", "feat", "readme", "verify", "defend", "debug", "screen", "prove", "decide", "algo"];
export const SKILLS = ["dev-workflow", ...COMMANDS, "role-a", "role-a2", "role-b", "role-c", "role-d"];

// scaffold/node-v2 부품: base는 늘 깔고, 나머지는 --with로 고른다(README가 요구할 때만 — $s1의 '뼈대 추천' 줄 참고)
export const PARTS = {
  base: ["server.js", "src/time.js", "public/index.html", ".env.example", "HOW_TO_RUN.md", "tests/feat_helpers.js", "tests/smoke.test.js", "tests/feat_time.test.js"],
  auth: ["src/auth.js", "tests/feat_auth.test.js"],
  store: ["src/store.js", "tests/feat_store.test.js"],
  lock: ["src/lock.js", "tests/feat_lock.test.js"],
  schema: ["src/validate_schema.js", "tests/feat_schema.test.js"],
  docker: ["Dockerfile", ".dockerignore", "scripts/verify_container.sh"],
};

/** 입력: 작업 폴더 / 출력: PLAN.md '뼈대 부품:' 줄의 부품 배열("없음"이면 []) / 깨지는 조건: PLAN.md나 그 줄이 없거나 비면 Error — $plan이 먼저 채운다 */
export function partsFromPlan(target) {
  const f = path.join(target, "PLAN.md");
  const m = fs.existsSync(f) ? fs.readFileSync(f, "utf8").match(/^[-*\s]*뼈대 부품\s*[:：][ \t]*([^\n]*)$/m) : null;
  const v = m ? m[1].replace(/[`(（].*$/, "").trim() : "";
  if (!v) throw new Error("--with plan: PLAN.md에 '뼈대 부품:' 줄이 비어 있다 — 창 1에 `$plan`을 먼저 돌리거나 PLAN에 '뼈대 부품: 없음'을 적는다");
  return /^(없음|바닥만|none)$/i.test(v) ? [] : v.split(/[\s,·+]+/).filter(Boolean);
}

/** 입력: argv 배열 / 출력: {mode, scaffold, with, target} / 깨지는 조건: 모르는 값이면 Error */
export function parseArgs(argv) {
  const o = { mode: "dev", scaffold: "", with: [], target: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === "--mode") { o.mode = v; i++; }
    else if (k === "--scaffold") { o.scaffold = v; i++; }
    else if (k === "--target") { o.target = v; i++; }
    else if (k === "--with") { o.with = String(v ?? "").split(",").map(x => x.trim()).filter(Boolean); i++; }
    else throw new Error(`모르는 인자: ${k}`);
  }
  if (!["dev", "docs"].includes(o.mode)) throw new Error(`--mode는 dev|docs: ${o.mode}`);
  if (o.scaffold && !["node", "node-v2", "python"].includes(o.scaffold)) throw new Error(`--scaffold는 node|node-v2|python: ${o.scaffold}`);
  o.target = path.resolve(o.target);
  if (o.with.length === 1 && o.with[0] === "plan") o.with = partsFromPlan(o.target);
  if (o.with.includes("all")) o.with = Object.keys(PARTS).filter(p => p !== "base");
  const bad = o.with.filter(p => !PARTS[p] || p === "base");
  if (bad.length) throw new Error(`--with는 ${Object.keys(PARTS).filter(p => p !== "base").join("|")}|all: ${bad.join(",")}`);
  if (o.with.length && o.scaffold !== "node-v2") throw new Error("--with는 --scaffold node-v2와 함께 쓴다");
  o.target = path.resolve(o.target);
  return o;
}

/** 입력: 모드·스캐폴드·부품 목록 / 출력: [원본(하네스 기준), 대상(작업 폴더 기준)] 목록 / 깨지는 조건: 없음 */
export function plan(mode, scaffold, parts = []) {
  const t = (d, f) => [`templates/${d}/${f}`, f];
  const list = mode === "dev"
    ? [["AGENTS.md", "AGENTS.md"], ...["PLAN.md", "LOG.md", "DECISIONS.md", "VERIFY.md", "README_RUN.md"].map(f => t("dev", f)),
       ...SKILLS.map(k => [`.agents/skills/${k}/SKILL.md`, `.agents/skills/${k}/SKILL.md`])]
    : [["AGENTS.nondev.md", "AGENTS.md"], t("dev", "LOG.md"),
       ...["INTERVIEW.md", "AGREEMENT.md", "SOURCE_MATRIX.md", "FINDINGS.md", "REPORT.md", "DECISIONS.md", "VERIFY.md", "HANDOFF.md"].map(f => t("docs", f)),
       ...["ops-workflow", "findings-doc"].map(s => [`.agents/skills/${s}/SKILL.md`, `.agents/skills/${s}/SKILL.md`])];
  list.push(["templates/changes_log.md", "out/changes_log.md"]);
  for (const d of ["tests", "out", "portal"]) list.push([null, `${d}/.gitkeep`]);
  list.push(["templates/gitignore", ".gitignore"]);
  for (const f of PLAYBOOK) list.push([`playbook/${f}`, `_playbook/${f}`]);
  if (scaffold === "node") list.push(["scaffold/node/server.js", "server.js"], ["scaffold/node/tests/smoke.test.js", "tests/smoke.test.js"]);
  if (scaffold === "node-v2") for (const p of ["base", ...parts]) for (const f of PARTS[p]) list.push([`scaffold/node-v2/${f}`, f]);
  if (scaffold === "python") list.push(["scaffold/python/server.py", "server.py"], ["scaffold/python/test_smoke.py", "tests/test_smoke.py"]);
  return list;
}

// 제출물에 들어가는 .agents/skills/·AGENTS.md가 응시자가 미리 만든 것임을 README_RUN.md 머리에 밝힌다(양식에도 같은 줄이 있다)
export const ORIGIN_LINE = "> .agents/skills/와 AGENTS.md는 응시자가 미리 만든 작업 틀(출처: LOG 차용 표, MIT)";

/** 입력: 작업 폴더 / 출력: 넣었으면 true — README_RUN.md가 있을 때만, 이미 있으면 다시 넣지 않는다(제목 줄 바로 아래) / 깨지는 조건: 없음 */
export function stampOrigin(target) {
  const f = path.join(target, "README_RUN.md");
  if (!fs.existsSync(f)) return false;
  const s = fs.readFileSync(f, "utf8");
  if (s.includes(ORIGIN_LINE.slice(2))) return false;
  const nl = s.indexOf("\n");
  fs.writeFileSync(f, /^# /.test(s) && nl >= 0 ? `${s.slice(0, nl + 1)}${ORIGIN_LINE}\n${s.slice(nl + 1)}` : `${ORIGIN_LINE}\n${s}`);
  return true;
}

/** 입력: 폴더 / 출력: 그 아래 파일의 상대 경로 목록(/ 구분, 정렬) / 깨지는 조건: 폴더가 없으면 Error */
export function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join("/")]).sort();
}

/** 입력: python --version 출력 / 출력: 3.10 미만이면 경고 한 줄, 아니면 "" / 깨지는 조건: 없음 */
export function pyWarn(ver) {
  const m = /Python (\d+)\.(\d+)/.exec(ver || "");
  return m && (+m[1] < 3 || (+m[1] === 3 && +m[2] < 10)) ? "경고: python 3.10 미만 — datetime.fromisoformat이 Z 접미사를 거부한다. 시각은 node로 파싱하거나 replace('Z','+00:00')" : "";
}

/** 입력: 작업 폴더 / 출력: 환경 5줄(+경고) — node·python3·docker·playwright 모듈 유무·시간대. 아무것도 설치하지 않는다 / 깨지는 조건: 없음(못 찾으면 "없음") */
export function envReport(target) {
  const ver = cmds => { for (const c of cmds) { try { return execFileSync(c[0], c.slice(1), { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5000 }).trim().split(/\r?\n/)[0]; } catch { /* 다음 후보 */ } } return ""; };
  const py = ver([["python3", "--version"], ["python", "--version"]]), dk = ver([["docker", "--version"]]);
  let pw = "없음";
  for (const base of [path.join(target, "_.js"), fileURLToPath(import.meta.url)]) { try { createRequire(base).resolve("playwright"); pw = "있음"; break; } catch { /* 없음 */ } }
  const d = new Date("2026-01-01T00:00:00Z"), off = -d.getTimezoneOffset(), p = n => String(n).padStart(2, "0");
  const zone = `UTC${off < 0 ? "-" : "+"}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
  const local = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  const lines = [`node ${process.version}`, `python ${py || "없음"}`, `docker ${dk || "없음"}`, `playwright 모듈 ${pw}(설치하지 않았다)`,
    `시간대 ${Intl.DateTimeFormat().resolvedOptions().timeZone} (${zone}) — 2026-01-01T00:00Z가 로컬 ${local}`];
  const w = pyWarn(py);
  return w ? [...lines, w] : lines;
}

function git(args, cwd) {
  try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
}

/** 입력: 하네스 폴더 / 출력: "harness <URL> <commit> MIT" / 깨지는 조건: git 없으면 unknown으로 채움 */
export function provenance(dir = HARNESS) {
  const url = (git(["remote", "get-url", "origin"], dir) || "unknown").replace(/\/\/[^@/]+@/, "//");
  const commit = git(["rev-parse", "--short", "HEAD"], dir) || "unknown";
  return `harness ${url} ${commit} MIT`;
}

function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 입력: parseArgs 결과 / 출력: {created, kept, replaced, prov, before} — replaced = 빈 껍데기를 뼈대 파일로 바꾼 것 / 깨지는 조건: 대상이 하네스 폴더 안이면 Error */
export function run(o, harness = HARNESS) {
  const rel = path.relative(harness, o.target);
  if (!rel || (!rel.startsWith("..") && !path.isAbsolute(rel))) throw new Error(`작업 폴더에서 실행해라(지금 대상이 하네스 폴더다): ${o.target}`);
  fs.mkdirSync(o.target, { recursive: true });
  const before = fs.readdirSync(o.target).filter(f => f !== ".git");
  const prov = provenance(harness);
  const row = `| S0 | 터미널: git clone + bootstrap (내가 실행) | bootstrap 스크립트: ${prov} — 양식·AGENTS 복사 (--mode ${o.mode}${o.scaffold ? " --scaffold " + o.scaffold : ""}) | 생성 목록 확인 | ${stamp()} |`;
  const url = prov.split(" ")[1], commit = prov.split(" ")[2];
  const borrow = `| 작업 틀(AGENTS 규칙·빈 문서 양식·점검 스크립트) | ${url} (커밋 ${commit}) | MIT | 규칙·양식을 작업 폴더에 복사, 스크립트는 하네스 폴더에서 호출만 | 없음 |`;
  const created = [], kept = [], replaced = [];
  for (const [src, dst] of plan(o.mode, o.scaffold, o.with)) {
    const to = path.join(o.target, dst);
    if (fs.existsSync(to)) {
      // v2.5: readme_to_requirements의 빈 껍데기만 뼈대 파일로 바꾼다(S1 껍데기 → S3 뼈대 순서). 과제 README·data/·사람이 쓴 파일은 절대 덮지 않는다
      const swap = isShell(readIfFile(to)) && !!src && src.startsWith("scaffold/") && path.basename(dst) !== "README.md" && !dst.startsWith("data/");
      if (swap) { fs.copyFileSync(path.join(harness, src), to); replaced.push(dst); } else kept.push(dst);
      continue;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (src === null) fs.writeFileSync(to, "");
    else if (dst === "LOG.md") fs.writeFileSync(to, fs.readFileSync(path.join(harness, src), "utf8").replace("{{HARNESS_ROW}}", row).replace("{{HARNESS_BORROW}}", borrow));
    else fs.copyFileSync(path.join(harness, src), to);
    created.push(dst);
  }
  const gi = path.join(o.target, ".gitignore");
  if (fs.existsSync(gi) && !/^_playbook\/\s*$/m.test(fs.readFileSync(gi, "utf8"))) fs.appendFileSync(gi, "\n_playbook/\n");
  if (kept.includes("LOG.md")) fs.appendFileSync(path.join(o.target, "LOG.md"), `\n${row}\n`);
  if (stampOrigin(o.target) && kept.includes("README_RUN.md")) kept.push("(README_RUN.md 머리에 작업 틀 출처 한 줄을 넣었다)");
  if (o.scaffold && (created.length || replaced.length)) {
    const log = path.join(o.target, "LOG.md");
    const mine = plan(o.mode, o.scaffold, o.with).filter(([s]) => s && s.startsWith(`scaffold/${o.scaffold}/`)).map(([, d]) => d).filter(d => created.includes(d) || replaced.includes(d));
    if (fs.existsSync(log) && mine.length) fs.appendFileSync(log, `\n| 서버 뼈대(scaffold/${o.scaffold}${o.scaffold === "node-v2" ? " 부품 " + ["base", ...o.with].join("+") : ""}, 과제 로직 없음) | ${prov.split(" ")[1]} (커밋 ${prov.split(" ")[2]}) | MIT | 파일 ${mine.length}개 복사: ${mine.join(", ")} | (바꾼 파일을 여기에) |\n`);
  }
  if (!fs.existsSync(path.join(o.target, ".git"))) {
    if (git(["init"], o.target) === "" && !fs.existsSync(path.join(o.target, ".git"))) kept.push("(git init 실패 — 직접 git init)");
    else created.push(".git (git init)");
  }
  return { created, kept, replaced, prov, before };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const o = parseArgs(process.argv.slice(2));
    const r = run(o);
    console.log(`[bootstrap] 대상 ${o.target} · 모드 ${o.mode}${o.scaffold ? " · 스캐폴드 " + o.scaffold : ""}${o.scaffold === "node-v2" ? " · 부품 " + ["base", ...o.with].join("+") : ""}`);
    console.log(`[bootstrap] ${r.prov}`);
    console.log(`원래 있던 것 ${r.before.length}개(손대지 않음): ${r.before.join(", ") || "-"}`);
    console.log(`생성 ${r.created.length}개:`); r.created.forEach(f => console.log("  + " + f));
    console.log(`껍데기 교체 ${r.replaced.length}개: ${r.replaced.join(", ") || "-"}`);
    console.log(`기존 유지 ${r.kept.length}개(덮어쓰지 않음):`); r.kept.forEach(f => console.log("  = " + f));
    const env = envReport(o.target);
    fs.mkdirSync(path.join(o.target, "out"), { recursive: true });
    fs.writeFileSync(path.join(o.target, "out/env.txt"), env.join("\n") + "\n"); // env.txt만은 매번 새로 쓴다(환경 기록)
    console.log("환경(out/env.txt — LOG '도구 설정'에 붙인다):"); env.forEach(l => console.log("  " + l));
    console.log("다음: 파일 목록에서 _playbook/RUN.md 열기 → 탭 이름 붙이기 → codex → /status → $s0");
  } catch (e) {
    console.error(`[bootstrap] 실패: ${e.message}`);
    process.exit(2);
  }
}
