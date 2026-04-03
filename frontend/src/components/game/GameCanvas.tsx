import { useEffect, useRef, useCallback, useState } from "react";
import { gameSounds, playVoice, preloadVoices } from "@/utils/gameSounds";

// ─── constants ───────────────────────────────────────────────
const T = 40;                 // tile size px
const PS = 26;                // player render size
const SPEED = 160;            // player speed px/s
const ENEMY_SPEED = 80;       // patrol speed px/s
const ENEMY_CHASE = 130;      // chase speed px/s
const DETECT_R = 130;         // enemy detection radius
const CATCH_R = 18;           // enemy catch radius
const PICKUP_R = 20;          // item pickup radius
const INVULN_MS = 2000;       // invulnerability after caught
const SKILL_COOLDOWN = 12;    // seconds between skill uses
const FREEZE_DUR = 5;         // enemy freeze duration
const IMMUNITY_DUR = 5;       // immunity duration

const STEAL_QUOTES = [
  "Pre vlasť!", "Nic sa nestalo!", "Kto by to nevzal?",
  "Pre dobro národa!", "Verejný záujem!", "Nikto sa nedozvie!",
  "To je len odmena!", "Slúžim ľuďom!", "Zaslúžená odmena!",
  "Investícia do budúcnosti!", "Štátny záujem!", "Toto je normálne!",
];

// ─── voice quotes ────────────────────────────────────────────
const VOICE_QUOTES = [
  "Nič sa nestalo, ideme ďalej!",
  "Všetko je pod kontrolou!",
  "Rozpočet je vyrovnaný. Proste je.",
  "Ja som tu pre ľudí. Pre seba tiež.",
  "Toto je investícia do budúcnosti!",
  "Zákon je na našej strane!",
  "Kradneme pre vlasť!",
  "Toto nie je korupcia, toto je politika!",
  "Verejný záujem si vyžaduje obete!",
  "My nekradneme. My prerozdeľujeme!",
  "Ľudia nám veria. A to je ich chyba.",
  "Opozícia klame! My len trochu kradneme.",
  "Toto je štandardný proces!",
  "Každý minister to robí!",
  "Na dôchodok si treba nasporiť. Ja už mám.",
  "Slovensko si zaslúži lepšiu budúcnosť. My si zaslúžime vilu.",
  "Pracujeme pre národ. Národ platí.",
  "Obedy zadarmo? Nie, tie sú len pre nás.",
];

const CAUGHT_QUOTES = [
  "Toto je politicky motivované!",
  "Ja som nevinný! Prezumpcia neviny!",
  "To boli falošné dôkazy!",
  "Znova tá opozícia!",
  "Médiá za všetko môžu!",
];

const SKILL_QUOTES = [
  { skill: "bribe", quotes: ["Berieme?", "Tu máte niečo pod stôl.", "Nech sa páči, diskrétne.", "Toto je len dar."] },
  { skill: "freeze", quotes: ["Stáť! Tlačová konferencia!", "Nič sa nestalo, nič sa nedeje!", "Všetci zamrznite!"] },
  { skill: "immunity", quotes: ["Mám imunitu! Nemôžete ma chytiť!", "Som nedotknuteľný!", "Podľa ústavy som chránený!"] },
  { skill: "scatter", quotes: ["NAKA zrušená! Dekrét podpísaný!", "Všetci domov! Koniec vyšetrovania!", "Reorganizácia!"] },
];

// ─── skills ──────────────────────────────────────────────────
interface SkillDef {
  id: string;
  name: string;
  icon: string;
  cost: number;
  color: string;
}

const SKILLS: SkillDef[] = [
  { id: "bribe", name: "Podplatiť", icon: "💰", cost: 2000, color: "#fbbf24" },
  { id: "freeze", name: "Tlačovka", icon: "🎤", cost: 1000, color: "#60a5fa" },
  { id: "immunity", name: "Imunita", icon: "🛡️", cost: 3000, color: "#34d399" },
  { id: "scatter", name: "Zrušiť NAKA", icon: "📋", cost: 5000, color: "#f472b6" },
];

// ─── map ─────────────────────────────────────────────────────
// W=wall, .=floor, D=door, T=table/desk
const MAP_DEF = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "W......WW..........WW.......W",
  "W..T...WW....TT....WW...T..W",
  "W......DD..........DD......WW",
  "WWWWDWWWW..........WWWWDWWWWW",
  "W............................W",
  "W............................W",
  "W............................W",
  "W............................W",
  "WWWWDWWWW..........WWWWDWWWWW",
  "W......DD..........DD......WW",
  "W..T...WW..........WW..TT..W",
  "W......WW....T.....WW......WW",
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

const ROWS = MAP_DEF.length;
const COLS = MAP_DEF[0].length;
const MAP_W = COLS * T;
const MAP_H = ROWS * T;

type TileType = "wall" | "floor" | "door" | "table";
const parseTile = (c: string): TileType => {
  if (c === "W") return "wall";
  if (c === "D") return "door";
  if (c === "T") return "table";
  return "floor";
};

const tileAt = (col: number, row: number): TileType => {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return "wall";
  return parseTile(MAP_DEF[row][col]);
};

const isSolid = (col: number, row: number): boolean => {
  const t = tileAt(col, row);
  return t === "wall" || t === "table";
};

// ─── room labels ─────────────────────────────────────────────
const ROOM_LABELS = [
  { name: "Archív", x: 3 * T, y: 2 * T },
  { name: "Zasadačka", x: 12 * T, y: 2 * T },
  { name: "Kancelária premiéra", x: 22 * T, y: 2 * T },
  { name: "Kancelária", x: 3 * T, y: 11 * T },
  { name: "Pokladňa", x: 12 * T, y: 11 * T },
  { name: "Trezor", x: 23 * T, y: 11 * T },
  { name: "Konferenčná sála", x: 14 * T, y: 17 * T },
];

// ─── items ───────────────────────────────────────────────────
interface Item {
  x: number; y: number;
  type: "coin" | "bag" | "gold" | "doc";
  value: number;
  alive: boolean;
  respawnAt: number;
}

const ITEM_DEFS: Omit<Item, "alive" | "respawnAt">[] = [
  // Corridors - coins
  { x: 5 * T, y: 5.5 * T, type: "coin", value: 100 },
  { x: 10 * T, y: 6 * T, type: "coin", value: 100 },
  { x: 15 * T, y: 5.5 * T, type: "coin", value: 100 },
  { x: 20 * T, y: 6.5 * T, type: "coin", value: 100 },
  { x: 25 * T, y: 5.5 * T, type: "coin", value: 100 },
  { x: 8 * T, y: 7.5 * T, type: "coin", value: 100 },
  { x: 18 * T, y: 7.5 * T, type: "coin", value: 100 },
  { x: 12 * T, y: 8 * T, type: "coin", value: 100 },
  // Archive room - docs
  { x: 2.5 * T, y: 1.5 * T, type: "doc", value: 2000 },
  { x: 4.5 * T, y: 2.5 * T, type: "doc", value: 2000 },
  // Meeting room - bags
  { x: 12 * T, y: 1.5 * T, type: "bag", value: 1000 },
  { x: 15 * T, y: 2.5 * T, type: "bag", value: 1000 },
  // Premier office - gold
  { x: 23 * T, y: 1.5 * T, type: "gold", value: 5000 },
  { x: 26 * T, y: 2.5 * T, type: "gold", value: 5000 },
  { x: 24.5 * T, y: 3 * T, type: "bag", value: 1000 },
  // Left office - bags
  { x: 2.5 * T, y: 10.5 * T, type: "bag", value: 1000 },
  { x: 4.5 * T, y: 11.5 * T, type: "bag", value: 1000 },
  // Treasury - gold + bags
  { x: 12.5 * T, y: 11 * T, type: "gold", value: 5000 },
  { x: 14 * T, y: 12 * T, type: "bag", value: 1000 },
  // Right office
  { x: 23 * T, y: 10.5 * T, type: "gold", value: 5000 },
  { x: 25 * T, y: 11.5 * T, type: "bag", value: 1000 },
  // Conference hall - coins
  { x: 5 * T, y: 15 * T, type: "coin", value: 100 },
  { x: 10 * T, y: 16 * T, type: "coin", value: 100 },
  { x: 15 * T, y: 15 * T, type: "coin", value: 100 },
  { x: 20 * T, y: 16 * T, type: "coin", value: 100 },
  { x: 25 * T, y: 15 * T, type: "coin", value: 100 },
  { x: 8 * T, y: 19 * T, type: "bag", value: 1000 },
  { x: 22 * T, y: 19 * T, type: "bag", value: 1000 },
  { x: 14 * T, y: 20 * T, type: "doc", value: 2000 },
];

// ─── enemies ─────────────────────────────────────────────────
interface Waypoint { x: number; y: number }

interface EnemyDef {
  waypoints: Waypoint[];
}

const ENEMY_DEFS: EnemyDef[] = [
  { waypoints: [{ x: 6 * T, y: 5.5 * T }, { x: 6 * T, y: 8 * T }, { x: 14 * T, y: 8 * T }, { x: 14 * T, y: 5.5 * T }] },
  { waypoints: [{ x: 24 * T, y: 5.5 * T }, { x: 24 * T, y: 8 * T }, { x: 16 * T, y: 8 * T }, { x: 16 * T, y: 5.5 * T }] },
  { waypoints: [{ x: 5 * T, y: 15 * T }, { x: 25 * T, y: 15 * T }, { x: 25 * T, y: 20 * T }, { x: 5 * T, y: 20 * T }] },
];

// ─── floating text ───────────────────────────────────────────
interface FloatText {
  text: string; x: number; y: number;
  color: string; born: number; duration: number;
}

// ─── enemy runtime ───────────────────────────────────────────
interface EnemyState {
  x: number; y: number;
  waypoints: Waypoint[];
  wpIdx: number;
  chasing: boolean;
  alertCooldown: number;
}

// ─── props ───────────────────────────────────────────────────
interface GameCanvasProps {
  photoUrl: string | null;
  ministerName: string;
  onBack: () => void;
  onScore?: (score: number) => void;
}

// ─── component ───────────────────────────────────────────────
export const GameCanvas = ({ photoUrl, ministerName, onBack }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  // game state refs (avoid re-renders during gameplay)
  const playerRef = useRef({ x: 14 * T, y: 17 * T, vx: 0, vy: 0, facing: 0 });
  const enemiesRef = useRef<EnemyState[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const floatsRef = useRef<FloatText[]>([]);
  const scoreRef = useRef(0);
  const wantedRef = useRef(0);
  const invulnRef = useRef(0);
  const timeRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });
  const bobRef = useRef(0);

  const [, setScore] = useState(0);
  const pausedRef = useRef(false);
  const skillCooldownRef = useRef(0);
  const skillIndexRef = useRef(0);
  const freezeTimerRef = useRef(0);
  const immunityTimerRef = useRef(0);
  const voiceTimerRef = useRef(8 + Math.random() * 5);
  const skillFlashRef = useRef({ active: false, text: "", color: "", born: 0 });

  // load photo
  useEffect(() => {
    if (!photoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; imgLoadedRef.current = true; };
    img.src = photoUrl;
  }, [photoUrl]);

  // initialize game world
  useEffect(() => {
    preloadVoices();
    itemsRef.current = ITEM_DEFS.map((d) => ({ ...d, alive: true, respawnAt: 0 }));
    enemiesRef.current = ENEMY_DEFS.map((d) => ({
      x: d.waypoints[0].x, y: d.waypoints[0].y,
      waypoints: d.waypoints, wpIdx: 0, chasing: false, alertCooldown: 0,
    }));
    playerRef.current = { x: 14 * T, y: 17 * T, vx: 0, vy: 0, facing: 0 };
    scoreRef.current = 0;
    wantedRef.current = 0;
    invulnRef.current = 0;
    timeRef.current = 0;
  }, []);

  // canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // skill activation
  const activateSkill = useCallback(() => {
    if (pausedRef.current) return;
    if (skillCooldownRef.current > 0) return;
    const skill = SKILLS[skillIndexRef.current % SKILLS.length];
    if (scoreRef.current < skill.cost) {
      addFloat("Málo peňazí!", playerRef.current.x, playerRef.current.y - 30, "#ef4444", 1);
      return;
    }

    scoreRef.current -= skill.cost;
    setScore(scoreRef.current);
    skillCooldownRef.current = SKILL_COOLDOWN;
    skillFlashRef.current = { active: true, text: `${skill.icon} ${skill.name}!`, color: skill.color, born: timeRef.current };

    const quoteSet = SKILL_QUOTES.find((s) => s.skill === skill.id);
    const quote = quoteSet?.quotes[Math.floor(Math.random() * quoteSet.quotes.length)] ?? skill.name;
    playVoice(0.8);
    addFloat(quote, playerRef.current.x, playerRef.current.y - 40, skill.color, 2);
    addFloat(`-${skill.cost} €`, playerRef.current.x + 20, playerRef.current.y - 15, "#ef4444", 1);

    if (skill.id === "bribe") {
      gameSounds.bribe();
      for (const e of enemiesRef.current) {
        e.chasing = false;
        e.alertCooldown = 5;
      }
      wantedRef.current = Math.max(0, wantedRef.current - 2);
    } else if (skill.id === "freeze") {
      gameSounds.freeze();
      freezeTimerRef.current = FREEZE_DUR;
    } else if (skill.id === "immunity") {
      gameSounds.immunity();
      immunityTimerRef.current = IMMUNITY_DUR;
      invulnRef.current = IMMUNITY_DUR;
    } else if (skill.id === "scatter") {
      gameSounds.alert();
      for (const e of enemiesRef.current) {
        const wp0 = e.waypoints[0];
        e.x = wp0.x;
        e.y = wp0.y;
        e.wpIdx = 0;
        e.chasing = false;
        e.alertCooldown = 6;
      }
      wantedRef.current = Math.max(0, wantedRef.current - 3);
    }

    skillIndexRef.current = (skillIndexRef.current + 1) % SKILLS.length;
  }, []);

  // keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Escape") {
        pausedRef.current = !pausedRef.current;
      }
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        activateSkill();
      }
      if (e.code === "Digit1") skillIndexRef.current = 0;
      if (e.code === "Digit2") skillIndexRef.current = 1;
      if (e.code === "Digit3") skillIndexRef.current = 2;
      if (e.code === "Digit4") skillIndexRef.current = 3;
    };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.code); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [activateSkill]);

  // touch joystick
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (x > rect.width * 0.7 && y > rect.height * 0.6) {
      activateSkill();
      return;
    }
    if (x < rect.width * 0.5) {
      joystickRef.current = { active: true, cx: x, cy: y, dx: 0, dy: 0 };
    }
  }, [activateSkill]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const dx = x - joystickRef.current.cx;
    const dy = y - joystickRef.current.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 50;
    if (dist > 0) {
      const clamp = Math.min(dist, maxDist) / maxDist;
      joystickRef.current.dx = (dx / dist) * clamp;
      joystickRef.current.dy = (dy / dist) * clamp;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    joystickRef.current = { active: false, cx: 0, cy: 0, dx: 0, dy: 0 };
  }, []);

  // ─── helpers ───────────────────────────────────────────────
  const collidesWithSolid = (x: number, y: number, size: number): boolean => {
    const half = size / 2;
    const corners = [
      [x - half, y - half], [x + half, y - half],
      [x - half, y + half], [x + half, y + half],
    ];
    return corners.some(([cx, cy]) => isSolid(Math.floor(cx / T), Math.floor(cy / T)));
  };

  const addFloat = (text: string, x: number, y: number, color: string, duration = 1.2) => {
    floatsRef.current.push({ text, x, y, color, born: timeRef.current, duration });
  };

  // ─── game loop ─────────────────────────────────────────────
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      frameRef.current = requestAnimationFrame(loop);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (pausedRef.current) {
        renderFrame();
        return;
      }

      timeRef.current += dt;
      if (skillCooldownRef.current > 0) skillCooldownRef.current = Math.max(0, skillCooldownRef.current - dt);
      if (freezeTimerRef.current > 0) freezeTimerRef.current = Math.max(0, freezeTimerRef.current - dt);
      if (immunityTimerRef.current > 0) {
        immunityTimerRef.current = Math.max(0, immunityTimerRef.current - dt);
        invulnRef.current = Math.max(invulnRef.current, immunityTimerRef.current);
      }
      updateVoice(dt);
      updatePlayer(dt);
      updateEnemies(dt);
      updateItems(dt);
      updateFloats();
      renderFrame();
    };

    const updateVoice = (dt: number) => {
      voiceTimerRef.current -= dt;
      if (voiceTimerRef.current <= 0) {
        voiceTimerRef.current = 8 + Math.random() * 10;
        playVoice(0.6);
        const quote = VOICE_QUOTES[Math.floor(Math.random() * VOICE_QUOTES.length)];
        addFloat(`"${quote.length > 35 ? quote.slice(0, 35) + "..." : quote}"`, playerRef.current.x, playerRef.current.y - 40, "#ffffff", 2.5);
      }
    };

    const updatePlayer = (dt: number) => {
      const p = playerRef.current;
      const keys = keysRef.current;
      const joy = joystickRef.current;

      let dx = 0, dy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

      if (joy.active) {
        dx += joy.dx;
        dy += joy.dy;
      }

      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        dx /= mag; dy /= mag;
        p.facing = Math.atan2(dy, dx);
        bobRef.current += dt * 12;
      }

      const newX = p.x + dx * SPEED * dt;
      const newY = p.y + dy * SPEED * dt;

      if (!collidesWithSolid(newX, p.y, PS)) p.x = newX;
      if (!collidesWithSolid(p.x, newY, PS)) p.y = newY;

      p.x = Math.max(PS / 2, Math.min(MAP_W - PS / 2, p.x));
      p.y = Math.max(PS / 2, Math.min(MAP_H - PS / 2, p.y));

      if (mag > 0.3) gameSounds.step();
      if (invulnRef.current > 0) invulnRef.current -= dt;
    };

    const updateEnemies = (dt: number) => {
      const p = playerRef.current;
      const enemies = enemiesRef.current;
      const wanted = wantedRef.current;
      const speedMul = 1 + wanted * 0.1;
      const frozen = freezeTimerRef.current > 0;

      for (const e of enemies) {
        if (e.alertCooldown > 0) {
          e.alertCooldown -= dt;
          e.chasing = false;
        }

        if (frozen) {
          e.chasing = false;
          continue;
        }

        const dxP = p.x - e.x;
        const dyP = p.y - e.y;
        const distP = Math.sqrt(dxP * dxP + dyP * dyP);
        const detectRange = DETECT_R + wanted * 20;

        if (distP < detectRange && invulnRef.current <= 0 && e.alertCooldown <= 0) {
          if (!e.chasing) {
            e.chasing = true;
            gameSounds.alert();
          }
          const spd = ENEMY_CHASE * speedMul * dt;
          if (distP > 0) {
            const nx = e.x + (dxP / distP) * spd;
            const ny = e.y + (dyP / distP) * spd;
            if (!collidesWithSolid(nx, e.y, 20)) e.x = nx;
            if (!collidesWithSolid(e.x, ny, 20)) e.y = ny;
          }

          if (distP < CATCH_R && invulnRef.current <= 0) {
            const penalty = Math.floor(scoreRef.current * 0.15);
            scoreRef.current = Math.max(0, scoreRef.current - penalty);
            setScore(scoreRef.current);
            invulnRef.current = INVULN_MS / 1000;
            addFloat(`-${penalty} €`, p.x, p.y - 20, "#ef4444");
            gameSounds.caught();
            const caughtQ = CAUGHT_QUOTES[Math.floor(Math.random() * CAUGHT_QUOTES.length)];
            playVoice(0.9);
            addFloat(`"${caughtQ}"`, p.x, p.y - 45, "#fca5a5", 2);
            e.chasing = false;
          }
        } else {
          e.chasing = false;
          const wp = e.waypoints[e.wpIdx];
          const dxW = wp.x - e.x;
          const dyW = wp.y - e.y;
          const distW = Math.sqrt(dxW * dxW + dyW * dyW);
          if (distW < 4) {
            e.wpIdx = (e.wpIdx + 1) % e.waypoints.length;
          } else {
            const spd = ENEMY_SPEED * speedMul * dt;
            const nx = e.x + (dxW / distW) * spd;
            const ny = e.y + (dyW / distW) * spd;
            if (!collidesWithSolid(nx, e.y, 20)) e.x = nx;
            if (!collidesWithSolid(e.x, ny, 20)) e.y = ny;
          }
        }
      }
    };

    const updateItems = (_dt: number) => {
      const p = playerRef.current;
      const items = itemsRef.current;
      const now = timeRef.current;

      for (const item of items) {
        if (!item.alive && item.respawnAt > 0 && now >= item.respawnAt) {
          item.alive = true;
        }
        if (!item.alive) continue;

        const dx = p.x - item.x;
        const dy = p.y - item.y;
        if (Math.sqrt(dx * dx + dy * dy) < PICKUP_R) {
          item.alive = false;
          item.respawnAt = now + (item.type === "gold" ? 15 : item.type === "bag" ? 8 : item.type === "doc" ? 10 : 4);
          scoreRef.current += item.value;
          setScore(scoreRef.current);
          wantedRef.current = Math.min(10, wantedRef.current + (item.value / 2000));

          addFloat(`+${item.value} €`, item.x, item.y - 10, "#ffd700", 1);

          if (Math.random() < 0.35) {
            const q = STEAL_QUOTES[Math.floor(Math.random() * STEAL_QUOTES.length)];
            addFloat(q, p.x, p.y - 30, "#ffffff", 1.8);
          }

          if (item.type === "gold") gameSounds.gold();
          else if (item.type === "bag" || item.type === "doc") gameSounds.money();
          else gameSounds.coin();
        }
      }
    };

    const updateFloats = () => {
      const now = timeRef.current;
      floatsRef.current = floatsRef.current.filter((f) => now - f.born < f.duration);
    };

    // ─── render ──────────────────────────────────────────────
    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const p = playerRef.current;
      const camX = Math.max(0, Math.min(MAP_W - cw, p.x - cw / 2));
      const camY = Math.max(0, Math.min(MAP_H - ch, p.y - ch / 2));

      ctx.save();
      ctx.translate(-camX, -camY);

      // tiles
      const startCol = Math.max(0, Math.floor(camX / T));
      const endCol = Math.min(COLS, Math.ceil((camX + cw) / T));
      const startRow = Math.max(0, Math.floor(camY / T));
      const endRow = Math.min(ROWS, Math.ceil((camY + ch) / T));

      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          const tile = tileAt(c, r);
          const x = c * T;
          const y = r * T;
          if (tile === "wall") {
            ctx.fillStyle = "#1e1e2e";
            ctx.fillRect(x, y, T, T);
            ctx.fillStyle = "#2a2a3c";
            ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
          } else if (tile === "door") {
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(x, y, T, T);
            ctx.fillStyle = "#5a3a1a";
            ctx.fillRect(x + T * 0.15, y + T * 0.1, T * 0.7, T * 0.8);
          } else if (tile === "table") {
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(x, y, T, T);
            ctx.fillStyle = "#4a3520";
            ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
            ctx.fillStyle = "#5a4530";
            ctx.fillRect(x + 6, y + 6, T - 12, T - 12);
          } else {
            ctx.fillStyle = "#141418";
            ctx.fillRect(x, y, T, T);
            ctx.strokeStyle = "#1a1a20";
            ctx.strokeRect(x, y, T, T);
          }
        }
      }

      // room labels
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.textAlign = "center";
      for (const label of ROOM_LABELS) {
        ctx.fillText(label.name, label.x, label.y);
      }

      // items
      for (const item of itemsRef.current) {
        if (!item.alive) continue;
        const ix = item.x;
        const iy = item.y;
        const pulse = 1 + Math.sin(timeRef.current * 3 + ix) * 0.1;

        if (item.type === "coin") {
          ctx.beginPath();
          ctx.arc(ix, iy, 6 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = "#ffd700";
          ctx.fill();
          ctx.fillStyle = "#b8860b";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("€", ix, iy + 3);
        } else if (item.type === "bag") {
          ctx.fillStyle = "#8b6914";
          ctx.beginPath();
          ctx.arc(ix, iy, 9 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffd700";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("€", ix, iy + 4);
        } else if (item.type === "gold") {
          ctx.fillStyle = "#ffd700";
          ctx.shadowColor = "rgba(255,215,0,0.5)";
          ctx.shadowBlur = 10;
          const s = 8 * pulse;
          ctx.fillRect(ix - s, iy - s * 0.6, s * 2, s * 1.2);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#b8860b";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Au", ix, iy + 3);
        } else {
          ctx.fillStyle = "#e8e8e0";
          const s = 7 * pulse;
          ctx.fillRect(ix - s * 0.7, iy - s, s * 1.4, s * 2);
          ctx.fillStyle = "#666";
          ctx.font = "7px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("DOC", ix, iy + 2);
        }
      }

      // enemies
      const frozen = freezeTimerRef.current > 0;
      for (const e of enemiesRef.current) {
        const ex = e.x;
        const ey = e.y;
        const confused = e.alertCooldown > 0;

        if (e.chasing) {
          ctx.beginPath();
          ctx.arc(ex, ey, DETECT_R, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(220,38,38,0.15)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.globalAlpha = frozen ? 0.5 : 1;

        // body
        ctx.fillStyle = frozen ? "#4b5563" : confused ? "#d97706" : e.chasing ? "#dc2626" : "#1e3a5f";
        ctx.fillRect(ex - 10, ey - 10, 20, 24);

        // head
        ctx.beginPath();
        ctx.arc(ex, ey - 14, 10, 0, Math.PI * 2);
        ctx.fillStyle = frozen ? "#6b7280" : confused ? "#f59e0b" : e.chasing ? "#dc2626" : "#2563eb";
        ctx.fill();

        // label
        ctx.fillStyle = frozen ? "#9ca3af" : confused ? "#fbbf24" : e.chasing ? "#fca5a5" : "#93c5fd";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(frozen ? "❄️" : confused ? "💫" : e.chasing ? "!" : "NAKA", ex, ey - 28);
        ctx.globalAlpha = 1;
      }

      // player
      const px = p.x;
      const py = p.y;
      const isInvuln = invulnRef.current > 0;
      const bobY = Math.sin(bobRef.current) * 2;

      if (isInvuln && Math.floor(timeRef.current * 8) % 2 === 0) {
        // blink effect
      } else {
        // body (suit)
        ctx.fillStyle = "#1a1a2e";
        const bx = px - 11;
        const by = py - 4 + bobY;
        ctx.beginPath();
        ctx.roundRect(bx, by, 22, 22, 4);
        ctx.fill();
        ctx.fillStyle = "#8b0000";
        ctx.fillRect(bx + 9, by + 2, 4, 14);

        // head
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py - 12 + bobY, 13, 0, Math.PI * 2);
        ctx.clip();
        if (imgLoadedRef.current && imgRef.current) {
          ctx.drawImage(imgRef.current, px - 13, py - 25 + bobY, 26, 26);
        } else {
          ctx.fillStyle = "#fbbf24";
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(ministerName.charAt(0), px, py - 9 + bobY);
        }
        ctx.restore();

        // head border
        ctx.beginPath();
        ctx.arc(px, py - 12 + bobY, 13, 0, Math.PI * 2);
        const hasImmunity = immunityTimerRef.current > 0;
        ctx.strokeStyle = hasImmunity ? "#34d399" : isInvuln ? "#ef4444" : "#ffd700";
        ctx.lineWidth = hasImmunity ? 3 : 2;
        ctx.stroke();

        // immunity shield glow
        if (hasImmunity) {
          ctx.beginPath();
          ctx.arc(px, py - 2 + bobY, 22, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52,211,153,${0.2 + Math.sin(timeRef.current * 6) * 0.15})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // name tag
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        const nameW = ctx.measureText(ministerName).width + 8;
        ctx.fillRect(px - nameW / 2, py + 18 + bobY, nameW, 14);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(ministerName, px, py + 28 + bobY);
      }

      // floating text
      const now = timeRef.current;
      for (const f of floatsRef.current) {
        const age = now - f.born;
        const alpha = Math.max(0, 1 - age / f.duration);
        const rise = age * 30;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.font = f.color === "#ffffff" ? "italic 11px sans-serif" : "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y - rise);
        ctx.globalAlpha = 1;
      }

      ctx.restore(); // end camera

      // ─── HUD ───────────────────────────────────────────────
      // score
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, cw, 44);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${scoreRef.current.toLocaleString("sk-SK")} €`, 12, 30);

      // wanted level
      const wanted = wantedRef.current;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(cw - 160, 0, 160, 44);
      ctx.fillStyle = wanted > 5 ? "#ef4444" : wanted > 2 ? "#f59e0b" : "#22c55e";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("PÁTRANÝ", cw - 12, 16);
      const barW = 136;
      ctx.fillStyle = "#333";
      ctx.fillRect(cw - 148, 22, barW, 10);
      ctx.fillStyle = wanted > 5 ? "#dc2626" : wanted > 2 ? "#f59e0b" : "#22c55e";
      ctx.fillRect(cw - 148, 22, Math.min(barW, (wanted / 10) * barW), 10);

      // ─── skill HUD ─────────────────────────────────────────
      const currentSkill = SKILLS[skillIndexRef.current % SKILLS.length];
      const cdLeft = skillCooldownRef.current;
      const cdPct = cdLeft / SKILL_COOLDOWN;
      const skillReady = cdLeft <= 0 && scoreRef.current >= currentSkill.cost;
      const skillW = 200;
      const skillX = (cw - skillW) / 2;
      const skillY = ch - 52;

      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(skillX, skillY, skillW, 40, 8);
      ctx.fill();

      // cooldown bar background
      ctx.fillStyle = "#222";
      ctx.fillRect(skillX + 44, skillY + 26, skillW - 54, 6);
      // cooldown fill
      if (cdLeft > 0) {
        ctx.fillStyle = "#555";
        ctx.fillRect(skillX + 44, skillY + 26, (skillW - 54) * (1 - cdPct), 6);
      } else {
        ctx.fillStyle = currentSkill.color;
        ctx.fillRect(skillX + 44, skillY + 26, skillW - 54, 6);
      }

      // skill icon + name
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(currentSkill.icon, skillX + 8, skillY + 22);
      ctx.font = skillReady ? "bold 12px sans-serif" : "12px sans-serif";
      ctx.fillStyle = skillReady ? currentSkill.color : "rgba(255,255,255,0.3)";
      ctx.fillText(currentSkill.name, skillX + 30, skillY + 16);

      // cost / status
      ctx.font = "9px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "left";
      if (cdLeft > 0) {
        ctx.fillText(`${Math.ceil(cdLeft)}s`, skillX + 44, skillY + 22);
      } else {
        ctx.fillText(`${currentSkill.cost} €`, skillX + 44, skillY + 22);
      }

      // SPACE label
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = skillReady ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)";
      ctx.fillText("SPACE", skillX + skillW - 8, skillY + 16);
      ctx.font = "8px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillText("1-4 zmeniť", skillX + skillW - 8, skillY + 28);

      // skill activation flash
      const sf = skillFlashRef.current;
      if (sf.active) {
        const sfAge = timeRef.current - sf.born;
        if (sfAge < 1.5) {
          ctx.globalAlpha = Math.max(0, 1 - sfAge / 1.5);
          ctx.fillStyle = sf.color;
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(sf.text, cw / 2, ch / 2 - 30);
          ctx.globalAlpha = 1;
        } else {
          skillFlashRef.current.active = false;
        }
      }

      // controls hint
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WASD = pohyb  |  SPACE = skill  |  1-4 = zmeniť skill  |  ESC = pauza", cw / 2, ch - 8);

      // mobile skill button (bottom-right)
      const isMobile = "ontouchstart" in window;
      if (isMobile) {
        const btnX = cw - 70;
        const btnY = ch - 110;
        ctx.beginPath();
        ctx.arc(btnX, btnY, 30, 0, Math.PI * 2);
        ctx.fillStyle = skillReady ? "rgba(255,215,0,0.2)" : "rgba(100,100,100,0.15)";
        ctx.fill();
        ctx.strokeStyle = skillReady ? "rgba(255,215,0,0.5)" : "rgba(100,100,100,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(currentSkill.icon, btnX, btnY + 6);
        if (cdLeft > 0) {
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = "#999";
          ctx.fillText(`${Math.ceil(cdLeft)}s`, btnX, btnY + 24);
        }
      }

      // joystick visual
      const joy = joystickRef.current;
      if (joy.active) {
        ctx.beginPath();
        ctx.arc(joy.cx, joy.cy, 50, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(joy.cx + joy.dx * 40, joy.cy + joy.dy * 40, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,215,0,0.3)";
        ctx.fill();
      }

      // paused overlay
      if (pausedRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAUZA", cw / 2, ch / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "14px sans-serif";
        ctx.fillText("ESC pre pokračovanie", cw / 2, ch / 2 + 20);
      }
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [ministerName]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="block" />
      <button
        onClick={onBack}
        className="absolute left-3 top-12 z-10 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
      >
        ← Späť
      </button>
    </div>
  );
};
