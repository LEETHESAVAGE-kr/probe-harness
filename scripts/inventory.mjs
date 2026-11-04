#!/usr/bin/env node
// inventory.mjs — S1 데이터 확인: 파일마다 행 수·빈칸·완전 중복·id만 다른 중복·표기 흔들림·코드값·날짜 범위 → out/inventory.md (해석 없음)
// 사용: node /tmp/harness/scripts/inventory.mjs data/*.csv [--by 키열] [--out out/inventory.md]
//   --by: 키(설비·지점·고객 등)별로 숫자 열의 개수·빈칸·최소·최대·평균을 따로 보여 준다(한 키만 다른 수준이면 보인다)
//   CSV가 하나도 없으면(인자에도 data/ 아래에도) data/의 .json .jsonl .txt .md .tsv를 파일마다 한 행으로 센다(v2.9, CSV가 있으면 이 경로를 타지 않는다)
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { readTable, readText, toNum, mdTable, ensureDir, now, isMain } from "./lib.mjs";

const DATE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})([ T]\d{1,2}:\d{2}(:\d{2})?)?$/;
const norm = v => String(v).trim().toLowerCase().replace(/[\s_\-]+/g, "");

/** 입력: 열 이름·값 배열 / 출력: 열 요약 객체 / 깨지는 조건: 없음(빈 열은 n_empty=전체) */
export function profileColumn(name, values) {
  const filled = values.filter(v => String(v).trim() !== "");
  const nums = filled.map(toNum).filter(n => n !== null);
  const dates = filled.filter(v => DATE.test(String(v).trim())).map(v => String(v).trim()).sort();
  const counts = new Map(); filled.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  const groups = new Map(); [...counts.keys()].forEach(v => { const k = norm(v); groups.set(k, [...(groups.get(k) || []), v]); });
  const wobble = [...groups.values()].filter(g => g.length > 1);
  const pref = new Map();
  filled.forEach(v => { const m = String(v).trim().match(/^([A-Za-z]+)[-_]?\d/); if (m) pref.set(m[1], (pref.get(m[1]) || 0) + 1); });
  return {
    name, n_empty: values.length - filled.length, n_distinct: counts.size,
    numeric: filled.length > 0 && nums.length === filled.length,
    min: nums.length ? Math.min(...nums) : null, max: nums.length ? Math.max(...nums) : null,
    sum: nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) * 1e6) / 1e6 : null,
    n_numeric: nums.length,
    edge_repeat: nums.length > 4 ? [Math.min(...nums), Math.max(...nums)].filter((v, i, a) => a.indexOf(v) === i).map(v => [v, nums.filter(n => n === v).length]).filter(([, n]) => n >= 2) : [],
    date_range: dates.length ? [dates[0], dates[dates.length - 1], dates.length] : null,
    codes: counts.size <= 12 && counts.size < filled.length ? [...counts.entries()].sort((a, b) => b[1] - a[1]) : null,
    prefixes: pref.size > 0 && pref.size <= 12 ? [...pref.entries()].sort((a, b) => b[1] - a[1]) : null,
    wobble,
  };
}

/** 입력: readTable 결과 / 출력: {rows, cols, exact_dup, exact_dup_lines, id_dup:{열:개수}} / 깨지는 조건: 없음 */
export function profileTable(t) {
  const seen = new Map(); let exact = 0; const lines = [];
  t.raw.forEach((r, i) => { const k = JSON.stringify(r.map(v => v.trim())); if (seen.has(k)) { exact++; if (lines.length < 10) lines.push(`${seen.get(k)}=${i + 2}`); } else seen.set(k, i + 2); });
  const id_dup = {};
  t.header.forEach((h, j) => {
    const vals = t.raw.map(r => r[j]);
    if (!/id$|번호$|no$/i.test(h) || new Set(vals).size !== vals.length) return;
    const s = new Set(); let d = 0;
    t.raw.forEach(r => { const k = JSON.stringify(r.filter((_, x) => x !== j).map(v => v.trim())); if (s.has(k)) d++; else s.add(k); });
    if (d) id_dup[h] = d;
  });
  return { rows: t.raw.length, cols: t.header.length, exact_dup: exact, exact_dup_lines: lines, id_dup,
    columns: t.header.map((h, j) => profileColumn(h, t.raw.map(r => r[j] ?? ""))) };
}

/** 입력: readTable 결과·키 열 / 출력: 마크다운 표(키×숫자 열: 개수·빈칸·최소~최대·평균) 또는 "" / 깨지는 조건: 키 열이 없으면 "" */
export function byKey(t, key) {
  if (!key || !t.header.includes(key)) return "";
  const groups = new Map(); t.rows.forEach(r => groups.set(r[key], [...(groups.get(r[key]) || []), r]));
  const numCols = t.header.filter(h => h !== key && t.rows.some(r => toNum(r[h]) !== null) && t.rows.every(r => String(r[h]).trim() === "" || toNum(r[h]) !== null));
  const rows = [];
  for (const [k, rs] of [...groups.entries()].sort()) for (const h of numCols) {
    const v = rs.map(r => toNum(r[h])).filter(n => n !== null);
    rows.push([k, h, rs.length, rs.length - v.length, v.length ? `${Math.min(...v)}~${Math.max(...v)}` : "", v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 1000) / 1000 : ""]);
  }
  return mdTable([key, "열", "행", "빈칸", "최소~최대", "평균"], rows);
}

/** 입력: 파일 경로 배열·키 열(선택) / 출력: inventory 마크다운 문자열 / 깨지는 조건: 읽을 수 없는 파일은 '읽기 실패' 행으로 남김 */
export function inventory(files, key = "") {
  const out = [`# inventory — 데이터 확인 (해석 없음) · ${now()}`, "", `명령: node inventory.mjs ${files.join(" ")}`, ""];
  const summary = [];
  for (const f of files) {
    let t;
    try { t = readTable(f); } catch (e) { summary.push([f, "읽기 실패: " + e.message, "", "", "", ""]); continue; }
    const p = profileTable(t);
    const idd = Object.entries(p.id_dup).map(([k, v]) => `${k} 빼고 같은 행 ${v}`).join(", ") || "0";
    summary.push([f, p.rows, p.cols, p.exact_dup, idd, t.encoding]);
    out.push(`## ${f}`, "", `행 ${p.rows} · 열 ${p.cols} · 완전 중복 ${p.exact_dup}${p.exact_dup_lines.length ? " (줄 " + p.exact_dup_lines.join(", ") + ")" : ""} · id만 다른 중복 ${idd}`, "");
    out.push(mdTable(["열", "빈칸", "고유값", "숫자(최소~최대·합계)", "최소·최대값 반복(값×횟수)", "날짜 범위(개수)", "코드값(개수)", "접두어", "표기 흔들림"],
      p.columns.map(c => [c.name, c.n_empty, c.n_distinct,
        c.numeric ? `${c.min}~${c.max} · ${c.sum}` : (c.n_numeric ? `일부 숫자 ${c.n_numeric}` : ""),
        c.edge_repeat.map(([v, n]) => `${v}×${n}`).join(" "),
        c.date_range ? `${c.date_range[0]}~${c.date_range[1]} (${c.date_range[2]})` : "",
        c.codes ? c.codes.map(([v, n]) => `${v}(${n})`).join(" ") : "",
        c.prefixes ? c.prefixes.map(([v, n]) => `${v}(${n})`).join(" ") : "",
        c.wobble.length ? c.wobble.map(g => g.join("/")).join("; ") : ""])), "");
    const bk = byKey(t, key); if (bk) out.push(`### ${key}별 숫자 열`, "", bk, "");
  }
  out.splice(4, 0, mdTable(["파일", "행", "열", "완전 중복", "id만 다른 중복", "인코딩"], summary), "");
  return out.join("\n") + "\n";
}

const TEXT_EXT = /\.(json|jsonl|txt|md|tsv)$/i, BIG = 100 * 1024 * 1024, HEAD = 10 * 1024 * 1024;
const walk = d => { try { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); } catch { return []; } };
const lens = a => a.length ? [Math.round(a.reduce((x, y) => x + y, 0) / a.length), Math.max(...a)] : [0, 0];
const dupes = a => a.length - new Set(a).size;
const isEmpty = v => v === null || v === undefined || v === "";

/** 입력: 파일 경로 / 출력: inventory 폴백 표의 한 행 [파일, 형식, 건수, 필드, 빈칸, 완전 중복, 본문 평균 길이, 최장] / 깨지는 조건: 읽을 수 없으면 '읽기 실패' 행, 100MB 초과는 앞 10MB만("(일부)") */
export function textProfile(file) {
  let text, part = "";
  try {
    const size = fs.statSync(file).size;
    if (size > BIG) { const fd = fs.openSync(file, "r"), b = Buffer.alloc(HEAD); fs.readSync(fd, b, 0, HEAD, 0); fs.closeSync(fd); text = b.toString("utf8"); part = " (일부)"; }
    else text = readText(file).text;
  } catch (e) { return [file, "읽기 실패: " + e.message, "", "", "", "", "", ""]; }
  const ext = path.extname(file).slice(1).toLowerCase(), kind = ext + part, nl = text.split(/\r?\n/);
  if (ext === "json") {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        const strs = data.map(o => JSON.stringify(o)), [avg, max] = lens(strs.map(x => x.length));
        const keys = [...new Set(data.flatMap(o => o && typeof o === "object" ? Object.keys(o) : []))];
        return [file, kind, `객체 ${data.length}`, keys.join(", "), data.reduce((n, o) => n + (o && typeof o === "object" ? Object.values(o).filter(isEmpty).length : 0), 0), dupes(strs), avg, max];
      }
      const keys = Object.keys(data), [avg, max] = lens(Object.values(data).map(v => JSON.stringify(v ?? "").length));
      return [file, kind, `키 ${keys.length}`, keys.join(", "), Object.values(data).filter(isEmpty).length, 0, avg, max];
    } catch { /* 앞부분만 읽었거나 깨진 JSON: 아래 줄 기준 */ }
  }
  const full = nl.filter(l => l.trim()), [avg, max] = lens(full.map(l => l.length));
  let field = (full[0] || "").slice(0, 60);
  if (ext === "jsonl") { try { field = Object.keys(JSON.parse(full[0])).join(", "); } catch { /* 첫 줄 그대로 */ } }
  return [file, ext === "json" ? `${kind} 파싱 실패 — 줄 기준` : kind, `행 ${full.length}`, field, nl.length - full.length - (nl.at(-1) === "" ? 1 : 0), dupes(full), avg, max];
}

/** 입력: 데이터 폴더 / 출력: 폴백 inventory 마크다운 또는 ""(CSV가 있거나 텍스트 파일이 없으면) / 깨지는 조건: 없음 */
export function textInventory(dataDir = "data") {
  const all = walk(dataDir).sort();
  if (all.some(f => /\.csv$/i.test(f))) return "";
  const files = all.filter(f => TEXT_EXT.test(f)).map(f => f.split(path.sep).join("/"));
  if (!files.length) return "";
  return [`# inventory — 데이터 확인 (해석 없음) · ${now()}`, "", `CSV 없음 — ${dataDir}/ 텍스트 폴백 ${files.length}개`, "",
    mdTable(["파일", "형식", "건수(행/객체)", "필드(상위 키 또는 첫 줄)", "빈칸", "완전 중복", "본문 평균 길이", "최장"], files.map(textProfile)), ""].join("\n");
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2); let outFile = "out/inventory.md", key = "";
  const bi = args.indexOf("--by"); if (bi >= 0) { key = args[bi + 1]; args.splice(bi, 2); }
  const oi = args.indexOf("--out"); if (oi >= 0) { outFile = args[oi + 1]; args.splice(oi, 2); }
  if (!args.some(a => /\.csv$/i.test(a))) {
    const md = textInventory();
    if (md) { ensureDir(outFile); fs.writeFileSync(outFile, md); console.log(md); console.log(`→ ${outFile}`); process.exit(0); }
  }
  if (!args.length) { console.error("사용: node inventory.mjs <파일...> [--by 키열] [--out out/inventory.md]"); process.exit(2); }
  const md = inventory(args, key); ensureDir(outFile); fs.writeFileSync(outFile, md);
  console.log(md.split("\n").slice(0, 6 + args.length).join("\n"));
  console.log(`→ ${outFile}`);
}
