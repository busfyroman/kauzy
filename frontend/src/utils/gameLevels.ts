export const T = 40;

export type EnemyType = "naka" | "police" | "journalist";
export type ItemType = "coin" | "bag" | "gold" | "doc";
export type PowerUpType = "speed" | "magnet" | "invisible" | "double";

export interface LevelItemDef { x: number; y: number; type: ItemType; value: number }
export interface LevelEnemyDef { type: EnemyType; waypoints: { x: number; y: number }[] }
export interface RoomLabel { name: string; x: number; y: number }

export interface LevelDef {
  id: number;
  name: string;
  subtitle: string;
  map: string[];
  items: LevelItemDef[];
  enemies: LevelEnemyDef[];
  rooms: RoomLabel[];
  spawnX: number;
  spawnY: number;
  target: number;
  timeLimit: number;
  floorColor: string;
  wallColor: string;
  wallAccent: string;
}

const lvl1Map = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "W......WW..........WW.......W",
  "W..T...WW....TT....WW...T..W",
  "W......DD..........DD.......W",
  "WWWWDWWWW..........WWWWDWWWWW",
  "W............................W",
  "W............................W",
  "W............................W",
  "W............................W",
  "WWWWDWWWW..........WWWWDWWWWW",
  "W......DD..........DD.......W",
  "W..T...WW..........WW..TT..W",
  "W......WW....T.....WW.......W",
  "WWWWWWWWWWWWDDWWWWWWWWWWWWWWWW",
  "W............................W",
  "W............................W",
  "W...T.......T........T......W",
  "W............................W",
  "W...T.......T........T......W",
  "W............................W",
  "W............................W",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

const lvl2Map = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "W..T..WW..............WW.T..W",
  "W.....WW..............WW....W",
  "W.....DD..............DD....W",
  "WWWDWWWW...WTTTTW....WWWDWWWW",
  "W..........W....W..........WW",
  "W..........D....D..........W",
  "W..........W....W..........W",
  "WWWDWWWW...WWDDWW...WWWWDWWW",
  "W......D..............D.....W",
  "W..T...W..............W..T..W",
  "W......W..............W.....W",
  "WWWWWWWWWWWWDDWWWWWWWWWWWWWWWW",
  "W............................W",
  "W..WWWW....WWWWWW....WWWW..W",
  "W..W..D....D....D....D..W..W",
  "W..W..W....W.TT.W....W..W..W",
  "W..W..W....W....W....W..W..W",
  "W..WWWW....WWWWWW....WWWW..W",
  "W............................W",
  "W............................W",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

const lvl3Map = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "W.T..W....W......W....W..T.W",
  "W....D....D......D....D....W",
  "W....W....W......W....W....W",
  "WWDWWWWDWWWW....WWWWDWWWWDWWW",
  "W............................W",
  "W............................W",
  "WWDWWWWDWWWW....WWWWDWWWWDWWW",
  "W....W....W......W....W....W",
  "W.T..D.T..D......D.T..D.T..W",
  "W....W....W......W....W....W",
  "WWWWWWWWWWWWWDDWWWWWWWWWWWWWWW",
  "W............................W",
  "W....WWWWWWWWWWWWWWWWWW....W",
  "W....W......TTTT......W....W",
  "W....D................D....W",
  "W....W......TTTT......W....W",
  "W....WWWWWWWWDDWWWWWWWW....W",
  "W............................W",
  "W............................W",
  "W............................W",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Úrad vlády",
    subtitle: "Začiatky korupcie",
    map: lvl1Map,
    target: 15000,
    timeLimit: 120,
    spawnX: 14 * T, spawnY: 17 * T,
    floorColor: "#141418", wallColor: "#1e1e2e", wallAccent: "#2a2a3c",
    rooms: [
      { name: "Archív", x: 3 * T, y: 2 * T },
      { name: "Zasadačka", x: 12 * T, y: 2 * T },
      { name: "Kancelária premiéra", x: 23 * T, y: 2 * T },
      { name: "Kancelária", x: 3 * T, y: 11 * T },
      { name: "Pokladňa", x: 12 * T, y: 11 * T },
      { name: "Trezor", x: 23 * T, y: 11 * T },
      { name: "Konferenčná sála", x: 14 * T, y: 17 * T },
    ],
    items: [
      { x: 5 * T, y: 5.5 * T, type: "coin", value: 100 },
      { x: 10 * T, y: 6 * T, type: "coin", value: 100 },
      { x: 15 * T, y: 5.5 * T, type: "coin", value: 100 },
      { x: 20 * T, y: 6.5 * T, type: "coin", value: 100 },
      { x: 25 * T, y: 5.5 * T, type: "coin", value: 100 },
      { x: 8 * T, y: 7.5 * T, type: "coin", value: 100 },
      { x: 18 * T, y: 7.5 * T, type: "coin", value: 100 },
      { x: 12 * T, y: 8 * T, type: "coin", value: 100 },
      { x: 2.5 * T, y: 1.5 * T, type: "doc", value: 2000 },
      { x: 4.5 * T, y: 2.5 * T, type: "doc", value: 2000 },
      { x: 12 * T, y: 1.5 * T, type: "bag", value: 1000 },
      { x: 15 * T, y: 2.5 * T, type: "bag", value: 1000 },
      { x: 23 * T, y: 1.5 * T, type: "gold", value: 5000 },
      { x: 26 * T, y: 2.5 * T, type: "gold", value: 5000 },
      { x: 24.5 * T, y: 3 * T, type: "bag", value: 1000 },
      { x: 2.5 * T, y: 10.5 * T, type: "bag", value: 1000 },
      { x: 4.5 * T, y: 11.5 * T, type: "bag", value: 1000 },
      { x: 12.5 * T, y: 11 * T, type: "gold", value: 5000 },
      { x: 14 * T, y: 12 * T, type: "bag", value: 1000 },
      { x: 23 * T, y: 10.5 * T, type: "gold", value: 5000 },
      { x: 25 * T, y: 11.5 * T, type: "bag", value: 1000 },
      { x: 5 * T, y: 15 * T, type: "coin", value: 100 },
      { x: 10 * T, y: 16 * T, type: "coin", value: 100 },
      { x: 15 * T, y: 15 * T, type: "coin", value: 100 },
      { x: 20 * T, y: 16 * T, type: "coin", value: 100 },
      { x: 25 * T, y: 15 * T, type: "coin", value: 100 },
      { x: 8 * T, y: 19 * T, type: "bag", value: 1000 },
      { x: 22 * T, y: 19 * T, type: "bag", value: 1000 },
      { x: 14 * T, y: 20 * T, type: "doc", value: 2000 },
    ],
    enemies: [
      { type: "naka", waypoints: [{ x: 6 * T, y: 5.5 * T }, { x: 6 * T, y: 8 * T }, { x: 14 * T, y: 8 * T }, { x: 14 * T, y: 5.5 * T }] },
      { type: "naka", waypoints: [{ x: 24 * T, y: 5.5 * T }, { x: 24 * T, y: 8 * T }, { x: 16 * T, y: 8 * T }, { x: 16 * T, y: 5.5 * T }] },
    ],
  },
  {
    id: 2,
    name: "Parlament",
    subtitle: "Organizovaný zločin",
    map: lvl2Map,
    target: 40000,
    timeLimit: 150,
    spawnX: 14 * T, spawnY: 20 * T,
    floorColor: "#12141a", wallColor: "#1a2030", wallAccent: "#253045",
    rooms: [
      { name: "Kancelária ľavá", x: 3 * T, y: 2 * T },
      { name: "Kancelária pravá", x: 25 * T, y: 2 * T },
      { name: "Rokovacia sála", x: 14 * T, y: 6 * T },
      { name: "Výbor A", x: 4 * T, y: 16 * T },
      { name: "Výbor B", x: 14 * T, y: 16 * T },
      { name: "Výbor C", x: 24 * T, y: 16 * T },
      { name: "Archív", x: 4 * T, y: 10 * T },
      { name: "Trezor", x: 25 * T, y: 10 * T },
    ],
    items: [
      { x: 2.5 * T, y: 1.5 * T, type: "gold", value: 5000 },
      { x: 26 * T, y: 1.5 * T, type: "gold", value: 5000 },
      { x: 12 * T, y: 6 * T, type: "bag", value: 1500 },
      { x: 16 * T, y: 6 * T, type: "bag", value: 1500 },
      { x: 14 * T, y: 7 * T, type: "doc", value: 3000 },
      { x: 2.5 * T, y: 9.5 * T, type: "bag", value: 1500 },
      { x: 26 * T, y: 9.5 * T, type: "gold", value: 5000 },
      { x: 5 * T, y: 5 * T, type: "coin", value: 200 },
      { x: 24 * T, y: 5 * T, type: "coin", value: 200 },
      { x: 10 * T, y: 13.5 * T, type: "coin", value: 200 },
      { x: 20 * T, y: 13.5 * T, type: "coin", value: 200 },
      { x: 4 * T, y: 16 * T, type: "bag", value: 1500 },
      { x: 14 * T, y: 16.5 * T, type: "gold", value: 5000 },
      { x: 24 * T, y: 16 * T, type: "bag", value: 1500 },
      { x: 8 * T, y: 20 * T, type: "coin", value: 200 },
      { x: 14 * T, y: 19.5 * T, type: "coin", value: 200 },
      { x: 22 * T, y: 20 * T, type: "coin", value: 200 },
      { x: 3 * T, y: 17 * T, type: "doc", value: 3000 },
      { x: 25 * T, y: 17 * T, type: "doc", value: 3000 },
    ],
    enemies: [
      { type: "naka", waypoints: [{ x: 5 * T, y: 5 * T }, { x: 25 * T, y: 5 * T }, { x: 25 * T, y: 8 * T }, { x: 5 * T, y: 8 * T }] },
      { type: "naka", waypoints: [{ x: 5 * T, y: 13.5 * T }, { x: 25 * T, y: 13.5 * T }, { x: 25 * T, y: 20 * T }, { x: 5 * T, y: 20 * T }] },
      { type: "police", waypoints: [{ x: 14 * T, y: 5 * T }, { x: 14 * T, y: 8 * T }, { x: 14 * T, y: 13.5 * T }, { x: 14 * T, y: 20 * T }] },
    ],
  },
  {
    id: 3,
    name: "Brusel",
    subtitle: "Európska liga",
    map: lvl3Map,
    target: 80000,
    timeLimit: 180,
    spawnX: 14 * T, spawnY: 20 * T,
    floorColor: "#101418", wallColor: "#162030", wallAccent: "#1e3050",
    rooms: [
      { name: "Kancelária A", x: 3 * T, y: 2 * T },
      { name: "Kancelária B", x: 11 * T, y: 2 * T },
      { name: "Kancelária C", x: 19 * T, y: 2 * T },
      { name: "Kancelária D", x: 27 * T, y: 2 * T },
      { name: "Trezor A", x: 3 * T, y: 9 * T },
      { name: "Trezor B", x: 11 * T, y: 9 * T },
      { name: "Trezor C", x: 19 * T, y: 9 * T },
      { name: "Trezor D", x: 27 * T, y: 9 * T },
      { name: "Európsky parlament", x: 14 * T, y: 15 * T },
    ],
    items: [
      { x: 2.5 * T, y: 1.5 * T, type: "gold", value: 8000 },
      { x: 9.5 * T, y: 2 * T, type: "gold", value: 8000 },
      { x: 19.5 * T, y: 1.5 * T, type: "gold", value: 8000 },
      { x: 27 * T, y: 2 * T, type: "gold", value: 8000 },
      { x: 2.5 * T, y: 9 * T, type: "doc", value: 5000 },
      { x: 9.5 * T, y: 9.5 * T, type: "gold", value: 8000 },
      { x: 19.5 * T, y: 9 * T, type: "doc", value: 5000 },
      { x: 27 * T, y: 9.5 * T, type: "gold", value: 8000 },
      { x: 7 * T, y: 5.5 * T, type: "coin", value: 300 },
      { x: 14 * T, y: 5.5 * T, type: "bag", value: 2000 },
      { x: 22 * T, y: 5.5 * T, type: "coin", value: 300 },
      { x: 7 * T, y: 12.5 * T, type: "coin", value: 300 },
      { x: 22 * T, y: 12.5 * T, type: "coin", value: 300 },
      { x: 10 * T, y: 15 * T, type: "bag", value: 2000 },
      { x: 18 * T, y: 15 * T, type: "bag", value: 2000 },
      { x: 14 * T, y: 14.5 * T, type: "gold", value: 8000 },
      { x: 14 * T, y: 16.5 * T, type: "gold", value: 8000 },
      { x: 6 * T, y: 19 * T, type: "coin", value: 300 },
      { x: 14 * T, y: 19 * T, type: "bag", value: 2000 },
      { x: 22 * T, y: 19 * T, type: "coin", value: 300 },
    ],
    enemies: [
      { type: "naka", waypoints: [{ x: 5 * T, y: 5.5 * T }, { x: 25 * T, y: 5.5 * T }] },
      { type: "naka", waypoints: [{ x: 25 * T, y: 12.5 * T }, { x: 5 * T, y: 12.5 * T }] },
      { type: "police", waypoints: [{ x: 14 * T, y: 5.5 * T }, { x: 14 * T, y: 12.5 * T }, { x: 14 * T, y: 19 * T }] },
      { type: "journalist", waypoints: [{ x: 5 * T, y: 19 * T }, { x: 25 * T, y: 19 * T }, { x: 25 * T, y: 12.5 * T }, { x: 5 * T, y: 12.5 * T }] },
    ],
  },
];

export const ENEMY_STATS: Record<EnemyType, { speed: number; chaseSpeed: number; detectRange: number; color: string; chaseColor: string; label: string }> = {
  naka: { speed: 80, chaseSpeed: 130, detectRange: 130, color: "#1e3a5f", chaseColor: "#dc2626", label: "NAKA" },
  police: { speed: 100, chaseSpeed: 170, detectRange: 90, color: "#1e4a1e", chaseColor: "#ef4444", label: "PZ" },
  journalist: { speed: 60, chaseSpeed: 80, detectRange: 180, color: "#4a1e5f", chaseColor: "#a855f7", label: "PRESS" },
};

export const COMBO_MULTIPLIERS = [1, 1.5, 2, 3, 5, 8, 10];
export const COMBO_TIMEOUT = 2000;
export const COMBO_COLORS = ["#ffffff", "#fde68a", "#fbbf24", "#f59e0b", "#ef4444", "#dc2626", "#9333ea"];

export const POWERUP_TYPES: { type: PowerUpType; icon: string; label: string; color: string; duration: number }[] = [
  { type: "speed", icon: "⚡", label: "Rýchlosť", color: "#3b82f6", duration: 8 },
  { type: "magnet", icon: "🧲", label: "Magnet", color: "#8b5cf6", duration: 8 },
  { type: "invisible", icon: "👻", label: "Neviditeľný", color: "#6b7280", duration: 6 },
  { type: "double", icon: "✖️2", label: "Dvojnásobok", color: "#f59e0b", duration: 10 },
];

export type TileType = "wall" | "floor" | "door" | "table";

export const parseTile = (c: string): TileType => {
  if (c === "W") return "wall";
  if (c === "D") return "door";
  if (c === "T") return "table";
  return "floor";
};

export const getHighScores = (): Record<number, { score: number; stars: number; time: number }> => {
  try {
    return JSON.parse(localStorage.getItem("kk_highscores") ?? "{}");
  } catch { return {}; }
};

export const saveHighScore = (levelId: number, score: number, stars: number, time: number) => {
  const hs = getHighScores();
  const prev = hs[levelId];
  if (!prev || score > prev.score) {
    hs[levelId] = { score, stars, time };
    localStorage.setItem("kk_highscores", JSON.stringify(hs));
  }
};

export const calcStars = (score: number, target: number, wanted: number, catches: number): number => {
  if (score < target) return 0;
  let stars = 1;
  if (score >= target * 1.5 && catches <= 2) stars = 2;
  if (score >= target * 2 && catches === 0 && wanted < 5) stars = 3;
  return stars;
};
