// prove_lower_bound.mjs — 이론 하한: 2 × max(출발점에서 각 물건까지 거리)
import { load, lowerBound, save } from "./route.mjs";
const { picks, aisle_gap: g } = load(), lb = lowerBound(picks, g);
save("lower_bound", "이론 하한", "2 × 가장 먼 물건까지 거리", { "이동 거리(칸)": lb, "방문 수": picks.length }, lb, "node scripts/prove_lower_bound.mjs");
