#!/usr/bin/env node
// prove_table.mjs — $prove 비교표: out/prove_*.json(기준안·하한·우리 안·현행)을 out/prove.md "## 비교표"에 옮기고, 표 숫자가 json과 같은지 대조한다(손으로 고친 숫자를 잡는다)
// 사용: (작업 폴더에서) node /tmp/harness/scripts/prove_table.mjs [--check]   --check는 대조만. 종료 코드: 0 일치 · 1 불일치·파일 없음
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, mdTable } from "./lib.mjs";

const ORDER = ["baseline", "lower_bound", "ours", "current"];
const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates/dev/PROVE.md");
const round = v => Math.round(Number(v) * 100) / 100;
const fmt = v => (typeof v === "number" ? String(round(v)) : String(v ?? ""));
const cells = l => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(x => x.trim().replace(/\\\|/g, "|"));

/** 입력: 작업 폴더 / 출력: [{kind, file, data}] — out/prove_<종류>.json을 기준안·하한·우리 안·현행 순으로 / 깨지는 조건: JSON이 깨졌으면 Error */
export function loadProve(dir) {
  const out = path.join(dir, "out"), files = fs.existsSync(out) ? fs.readdirSync(out).filter(f => /^prove_\w+\.json$/.test(f)) : [];
  const kind = f => f.replace(/^prove_|\.json$/g, ""), rank = f => (ORDER.indexOf(kind(f)) + 1 || 99);
  return files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map(f => ({ kind: kind(f), file: `out/${f}`, data: JSON.parse(fs.readFileSync(path.join(out, f), "utf8")) }));
}

/** 입력: loadProve 결과 / 출력: {head, rows} — 지표는 json metrics의 앞 두 개 / 깨지는 조건: 없음 */
export function tableRows(items) {
  const ms = [...new Set(items.flatMap(i => Object.keys(i.data.metrics || {})))].slice(0, 2);
  while (ms.length < 2) ms.push(`지표${ms.length + 1}`);
  const head = ["방식", "설명 1줄", ms[0], ms[1], "하한 대비 %", "실행 명령", "out 파일"];
  return { head, rows: items.map(({ file, data: d }) => [d.method || "", d.desc || "", fmt(d.metrics?.[ms[0]]), fmt(d.metrics?.[ms[1]]), fmt(d.vs_lower_pct), d.command ? `\`${d.command}\`` : "", file]) };
}

/** 입력: prove.md 본문·loadProve 결과 / 출력: "## 비교표" 아래 표를 json 값으로 바꾼 본문 / 깨지는 조건: "## 비교표" 절이 없으면 Error */
export function fill(md, items) {
  const L = md.replace(/\r\n/g, "\n").split("\n"), h = L.findIndex(l => /^## 비교표/.test(l));
  if (h < 0) throw new Error("\"## 비교표\" 절이 없다 — 양식 templates/dev/PROVE.md를 쓴다");
  let s = h + 1; while (s < L.length && !L[s].startsWith("|") && !/^## /.test(L[s])) s++;
  let e = s; while (e < L.length && L[e].startsWith("|")) e++;
  const { head, rows } = tableRows(items);
  L.splice(s, e - s, ...mdTable(head, rows).split("\n"));
  return L.join("\n");
}

/** 입력: prove.md 본문·작업 폴더 / 출력: {rows, mismatches: [문장]} — 지표·하한 대비 % 칸이 그 행 out 파일의 값(소수 둘째 자리 반올림)과 다르면 불일치 / 깨지는 조건: 없음 */
export function checkProve(md, dir) {
  const L = md.split(/\r?\n/), h = L.findIndex(l => /^## 비교표/.test(l)), mismatches = [];
  if (h < 0) return { rows: 0, mismatches: ["\"## 비교표\" 절이 없다"] };
  const t = []; for (let i = h + 1; i < L.length && !/^## /.test(L[i]); i++) if (L[i].startsWith("|")) t.push(cells(L[i]));
  const [head, , ...rows] = t;
  for (const r of rows) {
    const file = r[6] || "", p = path.join(dir, file);
    if (!file || !fs.existsSync(p)) { mismatches.push(`${r[0]}: out 파일 없음(${file || "빈 칸"})`); continue; }
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const [col, want] of [[2, d.metrics?.[head[2]]], [3, d.metrics?.[head[3]]], [4, d.vs_lower_pct]]) {
      if (want === undefined && !r[col]) continue;
      const got = Number(String(r[col]).replace(/,/g, ""));
      if (want === undefined || Number.isNaN(got) || got !== round(want)) mismatches.push(`${r[0]} ${head[col]}: 표 ${r[col] || "빈 칸"} ≠ ${file} ${want === undefined ? "값 없음" : round(want)}`);
    }
  }
  return { rows: rows.length, mismatches };
}

if (isMain(import.meta.url)) {
  const dir = process.cwd(), target = path.join(dir, "out/prove.md");
  let md = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : fs.readFileSync(TEMPLATE, "utf8");
  if (!process.argv.includes("--check")) {
    const items = loadProve(dir);
    if (!items.length) { console.log("out/prove_*.json이 없다 — 기준안·하한·우리 안 스크립트를 먼저 실행한다"); process.exit(1); }
    md = fill(md, items); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, md);
    console.log(`out/prove.md 비교표를 ${items.length}행으로 채웠다(${items.map(i => i.kind).join("·")})`);
  }
  const r = checkProve(md, dir);
  console.log(r.mismatches.length ? `대조: 불일치 ${r.mismatches.length}건\n${r.mismatches.map(m => "  - " + m).join("\n")}` : `대조: 일치 ${r.rows}행(표 숫자 = out/prove_*.json)`);
  process.exit(r.mismatches.length ? 1 : 0);
}
