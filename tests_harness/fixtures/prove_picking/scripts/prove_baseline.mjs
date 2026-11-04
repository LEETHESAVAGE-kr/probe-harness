// prove_baseline.mjs — 가장 단순한 기준안: 주문에 적힌 순서대로 집는다
import { load, tour, lowerBound, save } from "./route.mjs";
const { picks, aisle_gap: g } = load();
save("baseline", "기준안", "주문 순서대로 집기", { "이동 거리(칸)": tour(picks, g), "방문 수": picks.length }, lowerBound(picks, g), "node scripts/prove_baseline.mjs");
