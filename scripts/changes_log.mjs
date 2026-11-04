#!/usr/bin/env node
// changes_log.mjs — 데이터를 빼거나 바꾸거나 합칠 때 전후 건수·합계 한 행을 out/changes_log.md에 쌓는다
// 사용: node /tmp/harness/scripts/changes_log.mjs --step S4 --why "빈 행 제외" --before data/a.csv --after out/a_clean.csv [--sum 금액] [--affects "아니오: 결론 1위 같음"]
//       파일 대신 숫자: --before-count 120 --after-count 117 [--before-sum 5400 --after-sum 5310]
//       칸 단위 처리(행은 남기고 값만 비움): --cells 열  → 건수 = 그 열의 채워진 칸 수
//       순서: 처리 전에 예상 숫자로 한 행(--affects "예상") → 처리 뒤 파일로 다시 돌려 실제 행을 쌓는다
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import { readTable, toNum, ensureDir, isMain } from "./lib.mjs";

const HEAD = "# changes_log — 데이터를 빼거나 바꾸거나 합친 기록 (처리 전에 한 행)\n\n| 단계 | 처리(무엇을 왜) | 전 건수 | 후 건수 | 전 합계 | 후 합계 | 차이 | 결론을 바꾸나 |\n|---|---|---|---|---|---|---|---|\n";

/** 입력: 파일 경로·합계 열(없으면 "") / 출력: {count, sum|null, bad} / 깨지는 조건: 합계 열이 없으면 Error */
export function measure(file, sumCol = "", cellsCol = "") {
  const t = readTable(file);
  if (cellsCol && !t.header.includes(cellsCol)) throw new Error(`${file}에 '${cellsCol}' 열이 없다(열: ${t.header.join(", ")})`);
  const count = cellsCol ? t.rows.filter(r => String(r[cellsCol]).trim() !== "").length : t.rows.length;
  if (!sumCol) return { count, sum: null, bad: 0 };
  if (!t.header.includes(sumCol)) throw new Error(`${file}에 '${sumCol}' 열이 없다(열: ${t.header.join(", ")})`);
  let sum = 0, bad = 0;
  for (const r of t.rows) { const n = toNum(r[sumCol]); if (n === null) bad++; else sum += n; }
  return { count, sum: Math.round(sum * 1e6) / 1e6, bad };
}

/** 입력: {step, why, bc, ac, bs, as, affects} / 출력: 마크다운 한 행 / 깨지는 조건: 건수가 숫자가 아니면 Error */
export function makeRow(o) {
  for (const k of ["bc", "ac"]) if (!Number.isFinite(o[k])) throw new Error(`${k} 건수가 숫자가 아니다: ${o[k]}`);
  const hasSum = Number.isFinite(o.bs) && Number.isFinite(o.as);
  const diff = `건수 ${o.ac - o.bc >= 0 ? "+" : ""}${o.ac - o.bc}` + (hasSum ? ` · 합계 ${Math.round((o.as - o.bs) * 1e6) / 1e6}` : "");
  const cell = v => String(v ?? "").replace(/\|/g, "\\|");
  return `| ${cell(o.step)} | ${cell(o.why)} | ${o.bc} | ${o.ac} | ${hasSum ? o.bs : "-"} | ${hasSum ? o.as : "-"} | ${diff} | ${cell(o.affects || "미판정 — 결론 숫자와 대조해 채운다")} |`;
}

/** 입력: 출력 파일·행 / 출력: 없음(머리가 없으면 만들고 행을 덧붙임) / 깨지는 조건: 쓰기 권한 없음 */
export function appendRow(file, row) {
  ensureDir(file);
  if (!fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes("| 단계 |")) fs.writeFileSync(file, HEAD);
  const cur = fs.readFileSync(file, "utf8");
  fs.appendFileSync(file, (cur.endsWith("\n") ? "" : "\n") + row + "\n");
}

export function parse(argv) {
  const o = { out: "out/changes_log.md" };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, ""), v = argv[i + 1];
    if (v === undefined) throw new Error(`값 없는 인자: ${argv[i]}`);
    o[k] = v;
  }
  if (!o.step || !o.why) throw new Error("--step 과 --why 는 필수");
  return o;
}

if (isMain(import.meta.url)) {
  try {
    const a = parse(process.argv.slice(2));
    let bc = toNum(a["before-count"]), ac = toNum(a["after-count"]), bs = toNum(a["before-sum"]), as = toNum(a["after-sum"]);
    const notes = [];
    if (a.before) { const m = measure(a.before, a.sum || "", a.cells || ""); bc = m.count; bs = m.sum; if (m.bad) notes.push(`전 ${a.sum} 숫자 아닌 칸 ${m.bad}`); }
    if (a.after) { const m = measure(a.after, a.sum || "", a.cells || ""); ac = m.count; as = m.sum; if (m.bad) notes.push(`후 ${a.sum} 숫자 아닌 칸 ${m.bad}`); }
    const why = a.why + (a.cells ? ` (건수 = ${a.cells} 채워진 칸)` : "") + (a.sum ? ` (합계 열 ${a.sum})` : "") + (notes.length ? ` [${notes.join(", ")}]` : "");
    const row = makeRow({ step: a.step, why, bc, ac, bs: bs ?? NaN, as: as ?? NaN, affects: a.affects });
    appendRow(a.out, row);
    console.log(row); console.log(`→ ${a.out}`);
  } catch (e) { console.error(`[changes_log] 실패: ${e.message}`); process.exit(2); }
}
