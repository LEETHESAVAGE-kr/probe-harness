// route.mjs — 모의 창고 피킹: 거리 규칙과 공용 함수(기준안·하한·우리 안 스크립트가 같이 쓴다)
// SPDX-License-Identifier: MIT
import fs from "node:fs";

export const load = () => JSON.parse(fs.readFileSync("data/picks.json", "utf8"));
/** 같은 통로면 칸 차이, 다른 통로면 앞 복도로 나왔다가(칸만큼) 통로 간격만큼 옆으로 가서 다시 들어간다 */
export const dist = (a, b, gap) => (a.aisle === b.aisle ? Math.abs(a.slot - b.slot) : a.slot + Math.abs(a.aisle - b.aisle) * gap + b.slot);
export const depot = { aisle: 0, slot: 0 };
export function tour(order, gap) {
  let d = 0, at = depot;
  for (const p of order) { d += dist(at, p, gap); at = p; }
  return d + dist(at, depot, gap);
}
/** 이론 하한: 가장 먼 물건까지 갔다 와야 한다 = 2 × max(출발점에서의 거리) */
export const lowerBound = (picks, gap) => 2 * Math.max(...picks.map(p => dist(depot, p, gap)));
export function save(kind, method, desc, metrics, lb, command) {
  fs.mkdirSync("out", { recursive: true });
  const vs = Math.round((Object.values(metrics)[0] / lb) * 1000) / 10;
  fs.writeFileSync(`out/prove_${kind}.json`, JSON.stringify({ method, desc, metrics, vs_lower_pct: vs, command }, null, 2));
}
