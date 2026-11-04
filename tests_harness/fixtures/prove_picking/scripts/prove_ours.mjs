// prove_ours.mjs — 우리 안: 통로 번호 순, 통로 안에서는 안쪽 칸 순으로 집는다
import { load, tour, lowerBound, save } from "./route.mjs";
const { picks, aisle_gap: g } = load();
const order = [...picks].sort((a, b) => a.aisle - b.aisle || a.slot - b.slot);
save("ours", "우리 안", "통로 순·칸 순으로 묶어 집기", { "이동 거리(칸)": tour(order, g), "방문 수": picks.length }, lowerBound(picks, g), "node scripts/prove_ours.mjs");
