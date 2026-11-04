#!/usr/bin/env node
// fetch_portal.mjs — 업무자료 주소의 원문을 portal/에 저장하고 행 수(·합계)를 out/portal_check.md에 남긴다. 화면 대조 칸은 사람이 채운다.
// 사용: node /tmp/harness/scripts/fetch_portal.mjs <URL> --name orders [--sum 금액]
// HTML이면 <table>마다 portal/<name>_t<n>.csv도 만든다. 외부로 보내는 것은 없다(GET만).
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { parseCsv, toNum, ensureDir, now, isMain } from "./lib.mjs";

const strip = s => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

/** 입력: HTML 문자열 / 출력: 표 배열(각 표 = 행 배열, 첫 행이 머리) / 깨지는 조건: 칸 병합(colspan)은 펼치지 않는다 */
export function htmlTables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m =>
    [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(r => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => strip(c[1])))
      .filter(r => r.length));
}

/** 입력: 행 배열(첫 행 머리)·합계 열 / 출력: {rows, sum|null} / 깨지는 조건: 합계 열이 없으면 sum=null */
export function countRows(table, sumCol = "") {
  if (!table.length) return { rows: 0, sum: null };
  const j = sumCol ? table[0].indexOf(sumCol) : -1;
  const body = table.slice(1);
  const sum = j < 0 ? null : Math.round(body.reduce((a, r) => a + (toNum(r[j]) ?? 0), 0) * 1e6) / 1e6;
  return { rows: body.length, sum };
}

const toCsv = t => t.map(r => r.map(v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n") + "\n";

/** 입력: 본문·content-type·이름·합계 열·portal 폴더 / 출력: [{file, rows, sum}] / 깨지는 조건: JSON 파싱 실패면 텍스트로 저장 */
export function saveBody(body, ctype, name, sumCol = "", dir = "portal") {
  fs.mkdirSync(dir, { recursive: true });
  const res = [];
  const ext = /json/.test(ctype) ? "json" : /csv/.test(ctype) ? "csv" : /html/.test(ctype) || /<table|<html/i.test(body) ? "html" : "txt";
  const raw = path.join(dir, `${name}.${ext}`);
  fs.writeFileSync(raw, body);
  if (ext === "json") {
    try {
      const d = JSON.parse(body); const arr = Array.isArray(d) ? d : Object.values(d).find(Array.isArray) || [];
      const sum = sumCol ? Math.round(arr.reduce((a, o) => a + (toNum(o?.[sumCol]) ?? 0), 0) * 1e6) / 1e6 : null;
      res.push({ file: raw, rows: arr.length, sum });
    } catch { res.push({ file: raw, rows: "JSON 아님", sum: null }); }
  } else if (ext === "csv") res.push({ file: raw, ...countRows(parseCsv(body), sumCol) });
  else if (ext === "html") {
    const tabs = htmlTables(body);
    if (!tabs.length) res.push({ file: raw, rows: "표 없음", sum: null });
    tabs.forEach((t, i) => { const f = path.join(dir, `${name}_t${i + 1}.csv`); fs.writeFileSync(f, toCsv(t)); res.push({ file: f, ...countRows(t, sumCol) }); });
  } else res.push({ file: raw, rows: body.split(/\r?\n/).filter(Boolean).length + " 줄", sum: null });
  return res;
}

export function appendCheck(file, url, results, sumCol) {
  ensureDir(file);
  if (!fs.existsSync(file)) fs.writeFileSync(file, "# portal_check — 업무자료 주소에서 가져온 값과 화면 대조\n\n| 시각 | 주소 | 저장 파일 | 행 수(스크립트) | 합계(열) | 화면에서 본 값(내가) | 일치 |\n|---|---|---|---|---|---|---|\n");
  for (const r of results) fs.appendFileSync(file, `| ${now()} | ${url} | ${r.file} | ${r.rows} | ${r.sum ?? "-"}${sumCol ? ` (${sumCol})` : ""} |  |  |\n`);
}

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2); const url = a[0];
  const get = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : ""; };
  if (!url || !/^https?:\/\//.test(url)) { console.error("사용: node fetch_portal.mjs <http(s) URL> --name 이름 [--sum 열]"); process.exit(2); }
  const name = get("--name") || "page", sumCol = get("--sum");
  try {
    const r = await fetch(url);
    const body = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const res = saveBody(body, r.headers.get("content-type") || "", name, sumCol);
    appendCheck("out/portal_check.md", url, res, sumCol);
    res.forEach(x => console.log(`${x.file}: 행 ${x.rows}${x.sum !== null ? ` · 합계 ${x.sum}` : ""}`));
    console.log("→ out/portal_check.md (화면에서 본 값·일치 칸은 내가 채운다)");
  } catch (e) { console.error(`[fetch_portal] 실패: ${e.message} — 미검증으로 LOG에 적고 화면 복사로 옮긴다`); process.exit(2); }
}
