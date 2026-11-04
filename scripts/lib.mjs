// lib.mjs — 스크립트 공용: 표 파일 읽기(utf-8 → euc-kr 폴백, BOM 제거, , / 탭 / JSON 배열)·숫자 해석·md 표
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 입력: 파일 경로 / 출력: {text, encoding} / 깨지는 조건: 파일 없음이면 Error */
export function readText(file) {
  const buf = fs.readFileSync(file);
  let text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf), encoding = "utf-8";
  if (text.includes(String.fromCharCode(0xfffd))) {
    try { text = new TextDecoder("euc-kr").decode(buf); encoding = "euc-kr"; } catch { /* ICU 없음: utf-8 그대로 */ }
  }
  const bom = text.charCodeAt(0) === 0xfeff;
  return { text: bom ? text.slice(1) : text, encoding: bom ? encoding + "-bom" : encoding };
}

/** 입력: CSV 문자열·구분자 / 출력: 행 배열(각 행은 문자열 배열) / 깨지는 조건: 닫히지 않은 따옴표는 끝까지 한 칸 */
export function parseCsv(text, sep = ",") {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"' && cell === "") q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ""));
}

/** 입력: 파일 경로 / 출력: {header, rows(객체 배열), raw(문자열 배열들), encoding} / 깨지는 조건: 빈 파일이면 header=[] */
export function readTable(file) {
  const { text, encoding } = readText(file);
  if (path.extname(file).toLowerCase() === ".json") {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : Object.values(data).find(Array.isArray) || [];
    const header = [...new Set(arr.flatMap(o => Object.keys(o ?? {})))];
    const raw = arr.map(o => header.map(h => (o?.[h] == null ? "" : String(o[h]))));
    return { header, rows: raw.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]]))), raw, encoding };
  }
  const first = text.split(/\r?\n/, 1)[0] || "";
  const sep = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? "\t" : ",";
  const all = parseCsv(text, sep);
  if (!all.length) return { header: [], rows: [], raw: [], encoding };
  const header = all[0].map(h => h.trim());
  const raw = all.slice(1);
  return { header, rows: raw.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "")]))), raw, encoding };
}

/** 입력: 문자열 / 출력: 숫자 또는 null("1,040"·" 3.5 "도 숫자) / 깨지는 조건: 단위 붙은 값("3kg")은 null */
export function toNum(s) {
  const t = String(s ?? "").trim().replace(/,/g, "");
  if (t === "" || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return null;
  return Number(t);
}

/** 입력: 머리 배열·행 배열 / 출력: 마크다운 표 문자열 / 깨지는 조건: 칸의 | 는 \| 로 바꾼다 */
export function mdTable(head, rows) {
  const esc = v => String(v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [`| ${head.map(esc).join(" | ")} |`, `|${head.map(() => "---").join("|")}|`,
    ...rows.map(r => `| ${r.map(esc).join(" | ")} |`)].join("\n");
}

export function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
export function now() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function isMain(metaUrl) {
  return !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
