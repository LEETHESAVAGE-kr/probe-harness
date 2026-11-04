#!/usr/bin/env node
// readme_to_requirements.mjs — README(+링크한 데이터·스키마 md)에서 요구·규칙·필수 파일·제외 범위를 뽑아 REQUIREMENTS.md 표를 만들고, 없는 필수 파일은 껍데기로 만든다
// 사용: (작업 폴더에서) node /tmp/harness/scripts/readme_to_requirements.mjs [--dir 폴더]   README.md는 읽기만 한다(절대 쓰지 않음)
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, readText } from "./lib.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MARK = "아직 비어 있음";
const RULE = /\d|야 합니다|야 한다|금지|않습니다|않는다|말 것|마세요|마십시오|없어야/;
const OUT_SCOPE = /다루지 않|범위 밖|하지 않는 것|제외 범위|비목표|out of scope/i;
// 규칙 절: 제목에 규칙·조건·제약이 든 절의 불릿은 숫자·의무형과 무관하게 전부 규칙 행(v2.3)
const RULE_SEC = /규칙|조건|제약/;
// 지목: README가 숫자를 빼고 담당자에게 넘긴 문장 → 'Q'(지목) 행. $ask가 이 행부터 묻는다(v2.3)
const ASK = /담당자(?:에게|께|와|한테)\s*(?:\S+\s*)?(?:확인|질문|문의|물어|여쭤|상의)|담당자가\s*(?:\S+\s*)?(?:알|정하|정해|답)/;
const FILE = /\.(md|example|json|ya?ml)$|^Dockerfile$/;
// 이미 있는 파일 중 과제가 준 것으로 보는 것: *_SCHEMA.md와 data/ 아래. 나머지(스캐폴드가 깐 Dockerfile 등)는 상태 칸을 비워 둔다
const isGiven = name => /_SCHEMA\.md$/.test(name) || /^data\//.test(name);
// 뼈대 추천: README 줄의 단어로 node-v2 부품을 고른다(근거 줄과 함께). 판단은 사람이 PLAN에서 한다
const PART_HINTS = [["auth", /로그인|역할|권한|계정|login/i], ["store", /\bDB\b|데이터베이스|재시작|영속|저장해|저장하고|저장합니다/i],
  ["lock", /재계산|재생성|동시|적용/], ["schema", /_SCHEMA\.md|스키마/i], ["docker", /Dockerfile|컨테이너|docker/i]];
const LANG = /(Python|파이썬|Django|Flask|FastAPI|Java(?!Script)|자바(?!스크립트)|Spring|Kotlin|Golang|Go 언어|C#|\.NET|Ruby|PHP|Rust)/i;
const LANG_CTX = /언어|스택|으로 (구현|작성|만들)|사용해야|사용합니다|기반/;
/** 입력: scanLines 결과 / 출력: {lang: {name, src, text}|null, parts: [{part, src, text}]} — 제외 범위·코드 펜스는 보지 않는다 / 깨지는 조건: 없음 */
export function recommend(lines) {
  const parts = [], live = lines.filter(L => !L.fence && !L.heading && !L.outScope && L.text.trim());
  for (const [part, re] of PART_HINTS) { const L = live.find(x => re.test(x.text)); if (L) parts.push({ part, src: `README.md:${L.i}`, text: clean(L.text).slice(0, 60) }); }
  const L = live.find(x => LANG.test(x.text) && LANG_CTX.test(x.text));
  return { lang: L ? { name: L.text.match(LANG)[1], src: `README.md:${L.i}`, text: clean(L.text).slice(0, 60) } : null, parts };
}
/** 입력: recommend 결과 / 출력: 사람이 읽는 줄 배열(첫 줄 = 한 줄 요약, 둘째 줄 = 붙여 넣을 명령) / 깨지는 조건: 없음 */
export function recommendLines(r) {
  if (r.lang) return [`뼈대 추천: node 뼈대 쓰지 않음 — README가 ${r.lang.name}을(를) 정했다(${r.lang.src} "${r.lang.text}")`, "명령: _playbook/PROMPTS.md의 traps 블록(= refs/BOXES.md traps 상자)을 그 언어로"];
  const names = r.parts.map(p => p.part);
  return [`뼈대 추천: 바닥${names.length ? " + " + names.join(" + ") : "만"}`, `명령: node /tmp/harness/bootstrap.mjs --scaffold node-v2${names.length ? " --with " + names.join(",") : ""}`,
    ...r.parts.map(p => `- ${p.part}: ${p.src} "${p.text}"`)];
}
const clean = s => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

/** 입력: md 문자열 / 출력: 줄마다 {i, text, fence, outScope, ruleSec, heading} (코드 펜스·제외 절·규칙 절 표시) / 깨지는 조건: 닫히지 않은 펜스는 끝까지 펜스 */
export function scanLines(md) {
  const out = []; let fence = false, scopeLvl = 0, ruleLvl = 0, boldRule = false;
  md.split(/\r?\n/).forEach((text, i) => {
    const isFence = /^\s*(```|~~~)/.test(text);
    const h = !fence && !isFence ? text.match(/^(#{1,6})\s+(.*)/) : null;
    // 굵은 제목 줄(**운영 규칙**)도 규칙 절의 제목으로 본다 — 다음 제목·굵은 제목·일반 문단에서 끝난다
    const bold = !fence && !isFence && !h ? text.match(/^\s*\*\*([^*]+)\*\*\s*:?\s*$/) : null;
    if (h) {
      if (scopeLvl && h[1].length <= scopeLvl) scopeLvl = 0; if (OUT_SCOPE.test(h[2])) scopeLvl = h[1].length;
      if (ruleLvl && h[1].length <= ruleLvl) ruleLvl = 0; if (!OUT_SCOPE.test(h[2]) && RULE_SEC.test(h[2])) ruleLvl = h[1].length;
    }
    if (h || bold) boldRule = !!bold && !OUT_SCOPE.test(bold[1]) && RULE_SEC.test(bold[1]);
    else if (boldRule && text.trim() && !/^\s*(?:[-*+]|\d+[.)])\s+/.test(text) && !/^\s{2,}\S/.test(text)) boldRule = false;
    out.push({ i: i + 1, text, fence: fence || isFence, outScope: !!scopeLvl && !h, ruleSec: (!!ruleLvl || boldRule) && !h && !bold, heading: !!h });
    if (isFence) fence = !fence;
  });
  return out;
}

/** 입력: 줄 문자열 / 출력: 그 줄의 백틱 필수 파일 이름 배열(나온 순서, README.md 제외) / 깨지는 조건: 없음 */
export const fileTicks = text => [...text.matchAll(/`([^`\s]+)`/g)].map(m => m[1].replace(/^\.\//, "")).filter(n => FILE.test(path.basename(n)) && n !== "README.md");

/** 입력: README 줄 목록·언급 줄 번호·파일 이름(선택) / 출력: 그 뒤 6줄 안(다음 제목 전) 첫 코드 펜스의 본문 또는 null / 깨지는 조건: 펜스가 안 닫히면 null
 *  이름을 주면 펜스는 바로 위에서 가장 가까이 언급된 파일의 것만 된다(v2.4 D-69): 언급 줄에서 이 파일 뒤에 다른 파일이 나오거나, 펜스 전 줄에 다른 파일이 나오면 null */
export function templateAfter(lines, at, name) {
  if (name !== undefined) { const t = fileTicks(lines[at - 1].text); if (t.length && t[t.length - 1] !== name) return null; }
  for (let j = at; j < Math.min(lines.length, at + 6); j++) {
    if (lines[j].heading) return null;
    if (name !== undefined && !/^\s*(```|~~~)/.test(lines[j].text) && fileTicks(lines[j].text).some(n => n !== name)) return null;
    if (/^\s*(```|~~~)/.test(lines[j].text)) {
      const body = [];
      for (let k = j + 1; k < lines.length; k++) { if (/^\s*(```|~~~)/.test(lines[k].text)) return body.join("\n") + "\n"; body.push(lines[k].text); }
      return null;
    }
  }
  return null;
}

// v2.7: "다루지 않는 범위: a, b, c." 처럼 제목·굵은 글씨·문장 뒤 콜론에 한 줄로 이어진 제외 목록
const SCOPE_LABEL = /다루지 않는 범위|다루지 않습니다|제외 범위|범위 밖/;
/** 입력: 한 줄 / 출력: 제외 항목 배열(한 줄 목록이 아니면 []) — 쉼표가 있으면 쉼표만 항목 경계(항목 안 가운뎃점·슬래시는 그대로, 예: "퇴거/방 교체 신청"),
 *  쉼표가 없을 때만 가운뎃점·슬래시로 나눈다. '등'이 든 목록·항목은 가운뎃점·슬래시로 쪼개지 않는다 / 깨지는 조건: 콜론 앞 라벨이 40자를 넘으면 목록으로 보지 않는다 */
export function scopeList(text) {
  const t = String(text).replace(/^\s*(?:#{1,6}\s+|[-*+]\s+)/, "");
  const m = t.match(/^(.*?)[:：]\s*(.+)$/);
  if (!m) return [];
  const label = m[1].replace(/\*\*/g, "").trim();
  if (!label || label.length > 40 || !SCOPE_LABEL.test(label)) return [];
  const body = m[2].replace(/\*\*/g, "").replace(/[.。]\s*$/, "");
  const parts = /[,，]/.test(body) ? body.split(/\s*[,，]\s*/) : /(^|\s)등(\s|$)/.test(body) ? [body] : body.split(/\s*[·・/／]\s*/);
  return parts.map(p => clean(p).replace(/[.。]$/, "")).filter(Boolean);
}

/** 입력: 작업 폴더 / 출력: {reqs, rules, asks, files, outScope, docs, warnings} / 깨지는 조건: README.md가 없으면 Error */
export function extract(dir) {
  const readmePath = path.join(dir, "README.md");
  if (!fs.existsSync(readmePath)) throw new Error(`README.md가 없다: ${dir}`);
  const md = readText(readmePath).text, lines = scanLines(md);
  const reqs = [], rules = [], asks = [], outScope = [], files = new Map(), warnings = [];
  for (const L of lines) {
    if (L.fence) continue;
    if (!L.outScope) {
      const inline = scopeList(L.text);
      if (inline.length) { for (const text of inline) outScope.push({ text, src: `README.md:${L.i}` }); continue; }
    }
    if (L.heading) continue;
    const num = L.text.match(/^\s*(\d+)[.)]\s+(.*)/), bul = L.text.match(/^\s*[-*+]\s+(.*)/);
    const ask = !L.outScope && ASK.test(L.text);
    if (ask) asks.push({ text: clean(num ? num[2] : bul ? bul[1] : L.text), src: `README.md:${L.i}` });
    if (L.outScope) { if (num || bul) outScope.push({ text: clean(num ? num[2] : bul[1]), src: `README.md:${L.i}` }); }
    else if (num) reqs.push({ text: clean(`${num[1]}. ${num[2]}`), src: `README.md:${L.i}` });
    else if (bul && !ask && (L.ruleSec || RULE.test(bul[1]))) rules.push({ text: clean(bul[1]), src: `README.md:${L.i}` });
    for (const m of L.text.matchAll(/`([^`\s]+)`/g)) {
      const name = m[1].replace(/^\.\//, "");
      if (!FILE.test(path.basename(name)) || name === "README.md" || /[*<>{}]/.test(name) || name.includes("..") || path.isAbsolute(name)) continue;
      const f = files.get(name) || { name, src: `README.md:${L.i}`, line: clean(L.text.replace(/^\s*[-*+]\s+/, "")), template: null };
      f.template ??= templateAfter(lines, L.i, name);
      files.set(name, f);
    }
  }
  // README가 링크한 md + data/README.md + *_SCHEMA.md(루트·data/)에서 규칙을 더 뽑는다
  const linked = new Set([...md.matchAll(/\]\(([^)#\s]+\.md)\)/g)].map(m => m[1].replace(/^\.\//, "")));
  for (const d of [".", "data"]) for (const f of (fs.existsSync(path.join(dir, d)) ? fs.readdirSync(path.join(dir, d)) : []))
    if (/_SCHEMA\.md$/.test(f) || (d === "data" && f === "README.md")) linked.add(path.posix.join(d === "." ? "" : d, f));
  const docs = [{ name: "README.md", n: reqs.length + rules.length + asks.length }];
  for (const rel of [...linked].filter(f => f !== "README.md")) {
    if (!fs.existsSync(path.join(dir, rel))) { warnings.push(`README가 링크한 ${rel}이(가) 없다`); continue; }
    let n = 0;
    for (const L of scanLines(readText(path.join(dir, rel)).text)) {
      if (L.fence) continue;
      const inl = L.outScope ? [] : scopeList(L.text);
      if (inl.length) { for (const text of inl) outScope.push({ text, src: `${rel}:${L.i}` }); n += inl.length; continue; }
      if (L.heading) continue;
      const m = L.text.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)/);
      if (!L.outScope && ASK.test(L.text)) { asks.push({ text: clean(m ? m[1] : L.text), src: `${rel}:${L.i}` }); n++; continue; }
      if (m && (L.ruleSec || RULE.test(m[1]))) { (L.outScope ? outScope : rules).push({ text: clean(m[1]), src: `${rel}:${L.i}` }); n++; }
    }
    docs.push({ name: rel, n });
  }
  if (!reqs.length) warnings.push("번호 목록 요구가 0개다 — 규칙만 뽑았다. README 문단을 사람이 번호 매겨 REQUIREMENTS에 '요구' 행으로 직접 적는다");
  const fileList = [...files.values()].map(f => ({ ...f, exists: fs.existsSync(path.join(dir, f.name)), given: fs.existsSync(path.join(dir, f.name)) && isGiven(f.name), ask: !!f.template && /\(답변\)|^#+\s*Q\d/m.test(f.template) }));
  return { reqs, rules, asks, files: fileList, outScope, docs, warnings, scaffold: recommend(lines) };
}

/** 입력: extract 결과 / 출력: REQUIREMENTS.md 문자열(양식 templates/dev/REQUIREMENTS.md에 행을 끼움) / 깨지는 조건: 양식에 표 구분줄이 2개 미만이면 Error */
export function render(ex, tpl = fs.readFileSync(path.join(HARNESS, "templates/dev/REQUIREMENTS.md"), "utf8")) {
  const esc = s => String(s).replace(/\|/g, "\\|");
  const main = [
    ...ex.reqs.map((r, k) => `| R${k + 1} | 요구 | ${esc(r.text)} — ${r.src} |  |  |  |  |`),
    ...ex.rules.map((r, k) => `| K${k + 1} | 규칙 | ${esc(r.text)} — ${r.src} |  |  |  |  |`),
    ...(ex.asks || []).map((a, k) => `| Q${k + 1} | 지목 | ${esc(a.text)} — ${a.src} | — (담당자 답으로 관련 R·K 행의 기준을 정한다 · 상태 칸에 답 시각) |  |  |  |`),
    ...ex.files.map((f, k) => `| F${k + 1} | ${f.ask ? "산출물·질문형" : "산출물"} | ${esc(f.line)} — ${f.src} | ${f.given ? "— (제공 문서)" : f.exists ? "만들 것 (README 필수 파일 · 이미 있음 — 내용 확인)" : "만들 것 (README 필수 파일)"} | ${f.name} |  | ${f.given ? "제공됨" : ""} |`)];
  const scope = ex.outScope.map((o, k) => `| X${k + 1} | ${esc(o.text)} — ${o.src} |`);
  const L = tpl.replace(/\r\n/g, "\n").split("\n"), seps = L.map((l, i) => (/^\|---/.test(l) ? i : -1)).filter(i => i >= 0);
  if (seps.length < 2) throw new Error("REQUIREMENTS 양식에 표가 2개 있어야 한다");
  L.splice(seps[1] + 1, 0, ...scope); L.splice(seps[0] + 1, 0, ...main);
  const rec = ex.scaffold ? `\n## 뼈대 추천 (README 단어로 고른 것 — 무엇을 깔지는 PLAN에서 내가 정한다)\n${recommendLines(ex.scaffold).map(l => (l.startsWith("- ") ? l : `- ${l}`)).join("\n")}\n` : "";
  return L.join("\n").trimEnd() + "\n" + ex.docs.map(d => `- ${d.name} (뽑은 행 ${d.n})`).join("\n") + "\n" + rec;
}

/** 입력: 필수 파일 {name, src, template} / 출력: 껍데기 본문(README 양식이 있으면 그 양식) / 깨지는 조건: 없음 */
export function shellFor(f) {
  if (f.template) return f.template;
  const note = `${MARK} — README 요구 파일(${f.src}). 이 줄을 지우고 채운다.`;
  if (f.name.endsWith(".md")) return `# ${path.basename(f.name, ".md")}\n\n> ${note}\n`;
  if (f.name.endsWith(".json")) return `${JSON.stringify({ _todo: note })}\n`;
  return `# ${note}\n`;
}

/** 입력: 작업 폴더 / 출력: {ex, created, kept, reqFile, warnings} — REQUIREMENTS·껍데기를 쓴다 / 깨지는 조건: README.md 없으면 Error */
export function run(dir = process.cwd()) {
  const ex = extract(dir), created = [], kept = [], warnings = [...ex.warnings];
  const target = path.join(dir, "REQUIREMENTS.md");
  let reqFile = "REQUIREMENTS.md";
  if (fs.existsSync(target)) { reqFile = "out/REQUIREMENTS.new.md"; warnings.push("기존 REQUIREMENTS.md는 덮어쓰지 않았다 — out/REQUIREMENTS.new.md와 비교해 빠진 행만 옮긴다"); }
  fs.mkdirSync(path.dirname(path.join(dir, reqFile)), { recursive: true });
  fs.writeFileSync(path.join(dir, reqFile), render(ex));
  for (const f of ex.files) {
    const to = path.join(dir, f.name);
    if (f.exists) { kept.push(f.name); continue; }
    if (path.basename(f.name) === "README.md") { warnings.push(`${f.name}은 README라 만들지 않았다`); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, shellFor(f), { flag: "wx" });
    created.push(f.name);
  }
  return { ex, created, kept, reqFile, warnings };
}

if (isMain(import.meta.url)) {
  const i = process.argv.indexOf("--dir");
  try {
    const r = run(i > 0 ? path.resolve(process.argv[i + 1]) : process.cwd()), e = r.ex;
    console.log(`[readme_to_requirements] ${r.reqFile}: 요구 ${e.reqs.length} · 규칙 ${e.rules.length} · 산출물 ${e.files.length} = ${e.reqs.length + e.rules.length + e.files.length}행 · 지목 ${e.asks.length} · 제외 ${e.outScope.length}`);
    console.log(`읽은 문서: ${e.docs.map(d => `${d.name}(${d.n})`).join(", ")}`);
    for (const l of recommendLines(e.scaffold)) console.log(l);
    console.log(`껍데기 생성 ${r.created.length}: ${r.created.join(", ") || "-"} · 이미 있음 ${r.kept.length}: ${r.kept.join(", ") || "-"}`);
    for (const w of r.warnings) console.log(`경고: ${w}`);
    console.log("다음: REQUIREMENTS.md의 '만들 것/안 만들 것' 칸만 사람이 정한다. README.md는 바꾸지 않았다.");
  } catch (err) { console.error(`[readme_to_requirements] 실패: ${err.message}`); process.exit(2); }
}
