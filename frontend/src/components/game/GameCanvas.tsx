import { useEffect, useRef, useCallback, useState } from "react";
import { gameSounds, playVoice, preloadVoices, startMusic, stopMusic } from "@/utils/gameSounds";
import {
  T, LEVELS, ENEMY_STATS, COMBO_MULTIPLIERS, COMBO_TIMEOUT, COMBO_COLORS,
  POWERUP_TYPES, parseTile, saveHighScore, calcStars,
  type LevelDef, type EnemyType, type PowerUpType, type TileType,
} from "@/utils/gameLevels";

const PS = 26;
const PICKUP_R = 22;
const CATCH_R = 18;
const INVULN_MS = 2000;
const SKILL_COOLDOWN = 12;
const FREEZE_DUR = 5;
const IMMUNITY_DUR = 5;
const MAGNET_R = 120;
const POWERUP_SPAWN_MIN = 15;
const POWERUP_SPAWN_MAX = 25;
const SHAKE_DECAY = 8;
const PARTICLE_LIFE = 0.8;

const STEAL_QUOTES = [
  "Pre vlasť!", "Nic sa nestalo!", "Kto by to nevzal?",
  "Pre dobro národa!", "Verejný záujem!", "Nikto sa nedozvie!",
  "To je len odmena!", "Slúžim ľuďom!", "Zaslúžená odmena!",
  "Investícia!", "Štátny záujem!", "Toto je normálne!",
];

const VOICE_QUOTES = [
  "Nič sa nestalo, ideme ďalej!", "Všetko je pod kontrolou!",
  "Rozpočet je vyrovnaný. Proste je.", "Ja som tu pre ľudí. Pre seba tiež.",
  "Zákon je na našej strane!", "Kradneme pre vlasť!",
  "Toto nie je korupcia, toto je politika!", "My nekradneme. My prerozdeľujeme!",
  "Ľudia nám veria. A to je ich chyba.", "Opozícia klame! My len trochu kradneme.",
  "Na dôchodok si treba nasporiť. Ja už mám.",
  "Pracujeme pre národ. Národ platí.", "Obedy zadarmo? Nie, tie sú len pre nás.",
  "Slovensko si zaslúži lepšiu budúcnosť. My si zaslúžime vilu.",
];

const CAUGHT_QUOTES = [
  "Toto je politicky motivované!", "Ja som nevinný! Prezumpcia neviny!",
  "To boli falošné dôkazy!", "Znova tá opozícia!", "Médiá za všetko môžu!",
];

const SKILL_QUOTES: Record<string, string[]> = {
  bribe: ["Berieme?", "Tu máte niečo pod stôl.", "Diskrétne.", "Toto je len dar."],
  freeze: ["Stáť! Tlačová konferencia!", "Nič sa nestalo!", "Všetci zamrznite!"],
  immunity: ["Mám imunitu!", "Som nedotknuteľný!", "Podľa ústavy som chránený!"],
  scatter: ["NAKA zrušená!", "Všetci domov!", "Reorganizácia!"],
};

interface SkillDef { id: string; name: string; icon: string; cost: number; color: string }
const SKILLS: SkillDef[] = [
  { id: "bribe", name: "Podplatiť", icon: "💰", cost: 2000, color: "#fbbf24" },
  { id: "freeze", name: "Tlačovka", icon: "🎤", cost: 1000, color: "#60a5fa" },
  { id: "immunity", name: "Imunita", icon: "🛡️", cost: 3000, color: "#34d399" },
  { id: "scatter", name: "Zrušiť NAKA", icon: "📋", cost: 5000, color: "#f472b6" },
];

// ─── runtime types ──────────────────────────────────────────
interface Item { x: number; y: number; type: string; value: number; alive: boolean; respawnAt: number }
interface EnemyState {
  x: number; y: number; type: EnemyType;
  waypoints: { x: number; y: number }[]; wpIdx: number;
  chasing: boolean; alertCooldown: number;
}
interface FloatText { text: string; x: number; y: number; color: string; born: number; duration: number; size?: number }
interface Particle { x: number; y: number; vx: number; vy: number; color: string; born: number; size: number }
interface PowerUpState { x: number; y: number; type: PowerUpType; alive: boolean }
interface ActivePowerUp { type: PowerUpType; endsAt: number }

interface GameCanvasProps {
  photoUrl: string | null;
  ministerName: string;
  levelId: number;
  onBack: () => void;
  onComplete: (score: number, stars: number, time: number) => void;
}

// ─── component ──────────────────────────────────────────────
export const GameCanvas = ({ photoUrl, ministerName, levelId, onBack, onComplete }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const levelRef = useRef<LevelDef>(LEVELS[0]);

  const playerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, facing: 0 });
  const enemiesRef = useRef<EnemyState[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const floatsRef = useRef<FloatText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUpState[]>([]);
  const activePowerUpsRef = useRef<ActivePowerUp[]>([]);

  const scoreRef = useRef(0);
  const wantedRef = useRef(0);
  const invulnRef = useRef(0);
  const timeRef = useRef(0);
  const catchesRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });
  const bobRef = useRef(0);

  const comboRef = useRef({ count: 0, lastPickup: 0 });
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const nextPowerUpRef = useRef(POWERUP_SPAWN_MIN + Math.random() * 10);

  const pausedRef = useRef(false);
  const completedRef = useRef(false);
  const skillCooldownRef = useRef(0);
  const skillIndexRef = useRef(0);
  const freezeTimerRef = useRef(0);
  const immunityTimerRef = useRef(0);
  const voiceTimerRef = useRef(8 + Math.random() * 5);
  const skillFlashRef = useRef({ active: false, text: "", color: "", born: 0 });
  const displayScoreRef = useRef(0);

  const [, forceRender] = useState(0);

  // load photo
  useEffect(() => {
    if (!photoUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; imgLoadedRef.current = true; };
    img.src = photoUrl;
  }, [photoUrl]);

  // initialize level
  useEffect(() => {
    const lvl = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
    levelRef.current = lvl;
    preloadVoices();
    startMusic();

    itemsRef.current = lvl.items.map((d) => ({ ...d, alive: true, respawnAt: 0 }));
    enemiesRef.current = lvl.enemies.map((d) => ({
      x: d.waypoints[0].x, y: d.waypoints[0].y,
      type: d.type, waypoints: d.waypoints, wpIdx: 0, chasing: false, alertCooldown: 0,
    }));
    playerRef.current = { x: lvl.spawnX, y: lvl.spawnY, vx: 0, vy: 0, facing: 0 };
    scoreRef.current = 0; wantedRef.current = 0; invulnRef.current = 0;
    timeRef.current = 0; catchesRef.current = 0; displayScoreRef.current = 0;
    comboRef.current = { count: 0, lastPickup: 0 };
    powerUpsRef.current = []; activePowerUpsRef.current = [];
    floatsRef.current = []; particlesRef.current = [];
    completedRef.current = false; pausedRef.current = false;
    nextPowerUpRef.current = POWERUP_SPAWN_MIN + Math.random() * 10;

    return () => { stopMusic(); };
  }, [levelId]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ─── helpers ──────────────────────────────────────────────
  const getLevelMap = () => levelRef.current.map;
  const getLevelRows = () => getLevelMap().length;
  const getLevelCols = () => getLevelMap()[0].length;

  const tileAt = (col: number, row: number): TileType => {
    const map = getLevelMap();
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return "wall";
    return parseTile(map[row][col]);
  };

  const isSolid = (col: number, row: number) => {
    const t = tileAt(col, row);
    return t === "wall" || t === "table";
  };

  const collidesWithSolid = (x: number, y: number, size: number) => {
    const half = size / 2;
    return [[x - half, y - half], [x + half, y - half], [x - half, y + half], [x + half, y + half]]
      .some(([cx, cy]) => isSolid(Math.floor(cx / T), Math.floor(cy / T)));
  };

  const addFloat = (text: string, x: number, y: number, color: string, duration = 1.2, size?: number) => {
    floatsRef.current.push({ text, x, y, color, born: timeRef.current, duration, size });
  };

  const addParticles = (x: number, y: number, color: string, count: number, spread = 60) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * spread;
      particlesRef.current.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, born: timeRef.current, size: 2 + Math.random() * 3,
      });
    }
  };

  const shake = (intensity: number) => {
    shakeRef.current.intensity = Math.max(shakeRef.current.intensity, intensity);
  };

  const hasPowerUp = (type: PowerUpType) =>
    activePowerUpsRef.current.some((p) => p.type === type && p.endsAt > timeRef.current);

  const getSpeedMultiplier = () => hasPowerUp("speed") ? 1.6 : 1;
  const getScoreMultiplier = () => {
    const combo = COMBO_MULTIPLIERS[Math.min(comboRef.current.count, COMBO_MULTIPLIERS.length - 1)];
    return combo * (hasPowerUp("double") ? 2 : 1);
  };

  const isFloorTile = (col: number, row: number) => {
    const t = tileAt(col, row);
    return t === "floor" || t === "door";
  };

  const randomFloorPos = () => {
    const map = getLevelMap();
    const rows = map.length;
    const cols = map[0].length;
    for (let attempt = 0; attempt < 200; attempt++) {
      const col = 1 + Math.floor(Math.random() * (cols - 2));
      const row = 1 + Math.floor(Math.random() * (rows - 2));
      if (isFloorTile(col, row)) return { x: col * T + T / 2, y: row * T + T / 2 };
    }
    return { x: 14 * T, y: 10 * T };
  };

  // ─── skill activation ─────────────────────────────────────
  const activateSkill = useCallback(() => {
    if (pausedRef.current || completedRef.current) return;
    if (skillCooldownRef.current > 0) return;
    const skill = SKILLS[skillIndexRef.current % SKILLS.length];
    if (scoreRef.current < skill.cost) {
      addFloat("Málo peňazí!", playerRef.current.x, playerRef.current.y - 30, "#ef4444", 1);
      return;
    }

    scoreRef.current -= skill.cost;
    skillCooldownRef.current = SKILL_COOLDOWN;
    skillFlashRef.current = { active: true, text: `${skill.icon} ${skill.name}!`, color: skill.color, born: timeRef.current };

    const quotes = SKILL_QUOTES[skill.id] ?? [skill.name];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    playVoice(0.8);
    addFloat(quote, playerRef.current.x, playerRef.current.y - 40, skill.color, 2);
    addFloat(`-${skill.cost} €`, playerRef.current.x + 20, playerRef.current.y - 15, "#ef4444", 1);
    addParticles(playerRef.current.x, playerRef.current.y, skill.color, 15);

    if (skill.id === "bribe") {
      gameSounds.bribe();
      for (const e of enemiesRef.current) { e.chasing = false; e.alertCooldown = 5; }
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
        e.x = e.waypoints[0].x; e.y = e.waypoints[0].y;
        e.wpIdx = 0; e.chasing = false; e.alertCooldown = 6;
      }
      wantedRef.current = Math.max(0, wantedRef.current - 3);
    }
    skillIndexRef.current = (skillIndexRef.current + 1) % SKILLS.length;
  }, []);

  // ─── keyboard ─────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Escape") pausedRef.current = !pausedRef.current;
      if (e.code === "Space" && !e.repeat) { e.preventDefault(); activateSkill(); }
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

  // ─── touch ────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (x > rect.width * 0.7 && y > rect.height * 0.6) { activateSkill(); return; }
    if (x < rect.width * 0.5) {
      joystickRef.current = { active: true, cx: x, cy: y, dx: 0, dy: 0 };
    }
  }, [activateSkill]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !touch) return;
    const dx = touch.clientX - rect.left - joystickRef.current.cx;
    const dy = touch.clientY - rect.top - joystickRef.current.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const clamp = Math.min(dist, 50) / 50;
      joystickRef.current.dx = (dx / dist) * clamp;
      joystickRef.current.dy = (dy / dist) * clamp;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    joystickRef.current = { active: false, cx: 0, cy: 0, dx: 0, dy: 0 };
  }, []);

  // ─── game loop ────────────────────────────────────────────
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      frameRef.current = requestAnimationFrame(loop);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (pausedRef.current || completedRef.current) { renderFrame(); return; }

      timeRef.current += dt;
      if (skillCooldownRef.current > 0) skillCooldownRef.current = Math.max(0, skillCooldownRef.current - dt);
      if (freezeTimerRef.current > 0) freezeTimerRef.current = Math.max(0, freezeTimerRef.current - dt);
      if (immunityTimerRef.current > 0) {
        immunityTimerRef.current = Math.max(0, immunityTimerRef.current - dt);
        invulnRef.current = Math.max(invulnRef.current, immunityTimerRef.current);
      }

      // animate display score toward real score
      const diff = scoreRef.current - displayScoreRef.current;
      if (Math.abs(diff) > 1) {
        displayScoreRef.current += diff * Math.min(dt * 8, 1);
      } else {
        displayScoreRef.current = scoreRef.current;
      }

      // expire power-ups
      activePowerUpsRef.current = activePowerUpsRef.current.filter((p) => {
        if (p.endsAt <= timeRef.current) { gameSounds.powerupEnd(); return false; }
        return true;
      });

      // decay shake
      if (shakeRef.current.intensity > 0) {
        shakeRef.current.intensity = Math.max(0, shakeRef.current.intensity - dt * SHAKE_DECAY);
        shakeRef.current.x = (Math.random() - 0.5) * shakeRef.current.intensity * 10;
        shakeRef.current.y = (Math.random() - 0.5) * shakeRef.current.intensity * 10;
      }

      // decay combo
      if (comboRef.current.count > 0 && (performance.now() - comboRef.current.lastPickup) > COMBO_TIMEOUT) {
        comboRef.current.count = 0;
      }

      // time limit warning
      const lvl = levelRef.current;
      const remaining = lvl.timeLimit - timeRef.current;
      if (remaining > 0 && remaining < 10 && Math.floor(remaining) !== Math.floor(remaining + dt)) {
        gameSounds.tick();
      }

      // check level complete
      if (scoreRef.current >= lvl.target && !completedRef.current) {
        completedRef.current = true;
        gameSounds.levelComplete();
        stopMusic();
        const stars = calcStars(scoreRef.current, lvl.target, wantedRef.current, catchesRef.current);
        saveHighScore(lvl.id, scoreRef.current, stars, timeRef.current);
        addParticles(playerRef.current.x, playerRef.current.y, "#ffd700", 40, 100);
        setTimeout(() => onComplete(scoreRef.current, stars, timeRef.current), 2000);
        forceRender((n) => n + 1);
      }

      // check time up
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        stopMusic();
        gameSounds.caught();
        const stars = 0;
        setTimeout(() => onComplete(scoreRef.current, stars, timeRef.current), 2000);
        forceRender((n) => n + 1);
      }

      updateVoice(dt);
      updatePlayer(dt);
      updateEnemies(dt);
      updateItems();
      updatePowerUps();
      updateParticles(dt);
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
      const spd = 160 * getSpeedMultiplier();

      let dx = 0, dy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
      if (joy.active) { dx += joy.dx; dy += joy.dy; }

      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        dx /= mag; dy /= mag;
        p.facing = Math.atan2(dy, dx);
        bobRef.current += dt * 12;
      }

      const newX = p.x + dx * spd * dt;
      const newY = p.y + dy * spd * dt;
      if (!collidesWithSolid(newX, p.y, PS)) p.x = newX;
      if (!collidesWithSolid(p.x, newY, PS)) p.y = newY;

      const mapW = getLevelCols() * T;
      const mapH = getLevelRows() * T;
      p.x = Math.max(PS / 2, Math.min(mapW - PS / 2, p.x));
      p.y = Math.max(PS / 2, Math.min(mapH - PS / 2, p.y));

      if (mag > 0.3) gameSounds.step();
      if (invulnRef.current > 0) invulnRef.current -= dt;

      // speed trail particles
      if (hasPowerUp("speed") && mag > 0.3 && Math.random() < 0.4) {
        particlesRef.current.push({
          x: p.x - dx * 12, y: p.y - dy * 12,
          vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
          color: "#3b82f6", born: timeRef.current, size: 2 + Math.random() * 2,
        });
      }
    };

    const updateEnemies = (dt: number) => {
      const p = playerRef.current;
      const enemies = enemiesRef.current;
      const wanted = wantedRef.current;
      const speedMul = 1 + wanted * 0.08;
      const frozen = freezeTimerRef.current > 0;
      const invisible = hasPowerUp("invisible");

      for (const e of enemies) {
        if (e.alertCooldown > 0) { e.alertCooldown -= dt; e.chasing = false; }
        if (frozen) { e.chasing = false; continue; }

        const stats = ENEMY_STATS[e.type];
        const dxP = p.x - e.x;
        const dyP = p.y - e.y;
        const distP = Math.sqrt(dxP * dxP + dyP * dyP);
        const detectRange = stats.detectRange + wanted * 15;

        if (distP < detectRange && invulnRef.current <= 0 && e.alertCooldown <= 0 && !invisible) {
          if (!e.chasing) { e.chasing = true; gameSounds.alert(); }

          const spd = stats.chaseSpeed * speedMul * dt;
          if (distP > 0) {
            const nx = e.x + (dxP / distP) * spd;
            const ny = e.y + (dyP / distP) * spd;
            if (!collidesWithSolid(nx, e.y, 20)) e.x = nx;
            if (!collidesWithSolid(e.x, ny, 20)) e.y = ny;
          }

          // journalist only raises wanted, doesn't catch
          if (e.type === "journalist") {
            if (distP < stats.detectRange * 0.5) {
              wantedRef.current = Math.min(10, wantedRef.current + dt * 0.5);
              if (Math.random() < dt * 0.2) addFloat("📸", e.x, e.y - 25, "#a855f7", 0.8);
            }
            continue;
          }

          if (distP < CATCH_R && invulnRef.current <= 0) {
            const penalty = Math.floor(scoreRef.current * 0.15);
            scoreRef.current = Math.max(0, scoreRef.current - penalty);
            invulnRef.current = INVULN_MS / 1000;
            catchesRef.current++;
            comboRef.current.count = 0;
            shake(1);
            addFloat(`-${penalty} €`, p.x, p.y - 20, "#ef4444");
            addParticles(p.x, p.y, "#ef4444", 12);
            gameSounds.caught();
            playVoice(0.9);
            addFloat(`"${CAUGHT_QUOTES[Math.floor(Math.random() * CAUGHT_QUOTES.length)]}"`, p.x, p.y - 45, "#fca5a5", 2);
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
            const spd = stats.speed * speedMul * dt;
            const nx = e.x + (dxW / distW) * spd;
            const ny = e.y + (dyW / distW) * spd;
            if (!collidesWithSolid(nx, e.y, 20)) e.x = nx;
            if (!collidesWithSolid(e.x, ny, 20)) e.y = ny;
          }
        }
      }
    };

    const updateItems = () => {
      const p = playerRef.current;
      const items = itemsRef.current;
      const now = timeRef.current;
      const hasMagnet = hasPowerUp("magnet");

      for (const item of items) {
        if (!item.alive && item.respawnAt > 0 && now >= item.respawnAt) item.alive = true;
        if (!item.alive) continue;

        const dx = p.x - item.x;
        const dy = p.y - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // magnet attraction
        if (hasMagnet && dist < MAGNET_R && dist > PICKUP_R) {
          const pull = 200 / Math.max(dist, 1);
          item.x += (dx / dist) * pull * 0.016;
          item.y += (dy / dist) * pull * 0.016;
        }

        if (dist < PICKUP_R) {
          item.alive = false;
          item.respawnAt = now + (item.type === "gold" ? 15 : item.type === "bag" ? 8 : item.type === "doc" ? 10 : 4);

          // combo
          const nowMs = performance.now();
          if (nowMs - comboRef.current.lastPickup < COMBO_TIMEOUT) {
            comboRef.current.count = Math.min(comboRef.current.count + 1, COMBO_MULTIPLIERS.length - 1);
          } else {
            comboRef.current.count = 0;
          }
          comboRef.current.lastPickup = nowMs;

          const multiplier = getScoreMultiplier();
          const finalValue = Math.floor(item.value * multiplier);
          scoreRef.current += finalValue;
          wantedRef.current = Math.min(10, wantedRef.current + (item.value / 2500));

          const comboIdx = comboRef.current.count;
          const comboColor = COMBO_COLORS[Math.min(comboIdx, COMBO_COLORS.length - 1)];
          const fontSize = 13 + comboIdx * 2;
          addFloat(`+${finalValue} €`, item.x, item.y - 10, comboColor, 1.2, fontSize);

          if (comboIdx > 0) {
            addFloat(`x${COMBO_MULTIPLIERS[comboIdx]}`, item.x + 25, item.y, comboColor, 1, 10 + comboIdx);
            gameSounds.combo(comboIdx);
            if (comboIdx >= 3) addParticles(item.x, item.y, comboColor, 8);
          }

          if (Math.random() < 0.3) {
            addFloat(STEAL_QUOTES[Math.floor(Math.random() * STEAL_QUOTES.length)], p.x, p.y - 30, "#ffffff", 1.8);
          }

          addParticles(item.x, item.y, "#ffd700", 5);
          if (item.type === "gold") gameSounds.gold();
          else if (item.type === "bag" || item.type === "doc") gameSounds.money();
          else gameSounds.coin();
        }
      }
    };

    const updatePowerUps = () => {
      const now = timeRef.current;
      const p = playerRef.current;

      // spawn
      if (now >= nextPowerUpRef.current && powerUpsRef.current.filter((pu) => pu.alive).length < 2) {
        const pos = randomFloorPos();
        const typeDef = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerUpsRef.current.push({ x: pos.x, y: pos.y, type: typeDef.type, alive: true });
        nextPowerUpRef.current = now + POWERUP_SPAWN_MIN + Math.random() * (POWERUP_SPAWN_MAX - POWERUP_SPAWN_MIN);
      }

      // pickup
      for (const pu of powerUpsRef.current) {
        if (!pu.alive) continue;
        const dx = p.x - pu.x;
        const dy = p.y - pu.y;
        if (Math.sqrt(dx * dx + dy * dy) < PICKUP_R + 5) {
          pu.alive = false;
          const typeDef = POWERUP_TYPES.find((t) => t.type === pu.type)!;
          activePowerUpsRef.current.push({ type: pu.type, endsAt: now + typeDef.duration });
          gameSounds.powerup();
          addFloat(`${typeDef.icon} ${typeDef.label}!`, pu.x, pu.y - 20, typeDef.color, 2, 16);
          addParticles(pu.x, pu.y, typeDef.color, 15);
        }
      }
      powerUpsRef.current = powerUpsRef.current.filter((pu) => pu.alive);
    };

    const updateParticles = (dt: number) => {
      const now = timeRef.current;
      for (const part of particlesRef.current) {
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.vx *= 0.96; part.vy *= 0.96;
      }
      particlesRef.current = particlesRef.current.filter((p) => now - p.born < PARTICLE_LIFE);
    };

    const updateFloats = () => {
      floatsRef.current = floatsRef.current.filter((f) => timeRef.current - f.born < f.duration);
    };

    // ─── render ─────────────────────────────────────────────
    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx2 = canvas.getContext("2d");
      if (!ctx2) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;

      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, cw, ch);

      const lvl = levelRef.current;
      const mapW = getLevelCols() * T;
      const mapH = getLevelRows() * T;
      const p = playerRef.current;
      const shk = shakeRef.current;

      const camX = Math.max(0, Math.min(mapW - cw, p.x - cw / 2)) + shk.x;
      const camY = Math.max(0, Math.min(mapH - ch, p.y - ch / 2)) + shk.y;

      ctx2.save();
      ctx2.translate(-camX, -camY);

      // tiles
      const cols = getLevelCols();
      const rows = getLevelRows();
      const startCol = Math.max(0, Math.floor(camX / T));
      const endCol = Math.min(cols, Math.ceil((camX + cw) / T));
      const startRow = Math.max(0, Math.floor(camY / T));
      const endRow = Math.min(rows, Math.ceil((camY + ch) / T));

      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          const tile = tileAt(c, r);
          const x = c * T;
          const y = r * T;
          if (tile === "wall") {
            ctx2.fillStyle = lvl.wallColor;
            ctx2.fillRect(x, y, T, T);
            ctx2.fillStyle = lvl.wallAccent;
            ctx2.fillRect(x + 1, y + 1, T - 2, T - 2);
          } else if (tile === "door") {
            ctx2.fillStyle = "#1a1a1a";
            ctx2.fillRect(x, y, T, T);
            ctx2.fillStyle = "#5a3a1a";
            ctx2.fillRect(x + T * 0.15, y + T * 0.1, T * 0.7, T * 0.8);
          } else if (tile === "table") {
            ctx2.fillStyle = lvl.floorColor;
            ctx2.fillRect(x, y, T, T);
            ctx2.fillStyle = "#4a3520";
            ctx2.fillRect(x + 4, y + 4, T - 8, T - 8);
            ctx2.fillStyle = "#5a4530";
            ctx2.fillRect(x + 6, y + 6, T - 12, T - 12);
          } else {
            ctx2.fillStyle = lvl.floorColor;
            ctx2.fillRect(x, y, T, T);
            ctx2.strokeStyle = `${lvl.floorColor}33`;
            ctx2.strokeRect(x, y, T, T);
          }
        }
      }

      // room labels
      ctx2.font = "10px sans-serif";
      ctx2.fillStyle = "rgba(255,255,255,0.06)";
      ctx2.textAlign = "center";
      for (const label of lvl.rooms) ctx2.fillText(label.name, label.x, label.y);

      // power-ups
      for (const pu of powerUpsRef.current) {
        if (!pu.alive) continue;
        const typeDef = POWERUP_TYPES.find((t) => t.type === pu.type)!;
        const pulse = 1 + Math.sin(timeRef.current * 4) * 0.15;
        ctx2.shadowColor = typeDef.color;
        ctx2.shadowBlur = 15;
        ctx2.beginPath();
        ctx2.arc(pu.x, pu.y, 12 * pulse, 0, Math.PI * 2);
        ctx2.fillStyle = typeDef.color + "40";
        ctx2.fill();
        ctx2.strokeStyle = typeDef.color;
        ctx2.lineWidth = 2;
        ctx2.stroke();
        ctx2.shadowBlur = 0;
        ctx2.font = `${14 * pulse}px sans-serif`;
        ctx2.textAlign = "center";
        ctx2.fillText(typeDef.icon, pu.x, pu.y + 5);
      }

      // items
      for (const item of itemsRef.current) {
        if (!item.alive) continue;
        const ix = item.x;
        const iy = item.y;
        const pulse = 1 + Math.sin(timeRef.current * 3 + ix) * 0.1;

        if (item.type === "coin") {
          ctx2.beginPath();
          ctx2.arc(ix, iy, 6 * pulse, 0, Math.PI * 2);
          ctx2.fillStyle = "#ffd700";
          ctx2.fill();
          ctx2.fillStyle = "#b8860b";
          ctx2.font = "bold 8px sans-serif";
          ctx2.textAlign = "center";
          ctx2.fillText("€", ix, iy + 3);
        } else if (item.type === "bag") {
          ctx2.fillStyle = "#8b6914";
          ctx2.beginPath();
          ctx2.arc(ix, iy, 9 * pulse, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.fillStyle = "#ffd700";
          ctx2.font = "bold 10px sans-serif";
          ctx2.textAlign = "center";
          ctx2.fillText("€", ix, iy + 4);
        } else if (item.type === "gold") {
          ctx2.fillStyle = "#ffd700";
          ctx2.shadowColor = "rgba(255,215,0,0.5)";
          ctx2.shadowBlur = 10;
          const s = 8 * pulse;
          ctx2.fillRect(ix - s, iy - s * 0.6, s * 2, s * 1.2);
          ctx2.shadowBlur = 0;
          ctx2.fillStyle = "#b8860b";
          ctx2.font = "bold 8px sans-serif";
          ctx2.textAlign = "center";
          ctx2.fillText("Au", ix, iy + 3);
        } else {
          ctx2.fillStyle = "#e8e8e0";
          const s = 7 * pulse;
          ctx2.fillRect(ix - s * 0.7, iy - s, s * 1.4, s * 2);
          ctx2.fillStyle = "#666";
          ctx2.font = "7px sans-serif";
          ctx2.textAlign = "center";
          ctx2.fillText("DOC", ix, iy + 2);
        }
      }

      // particles
      const now = timeRef.current;
      for (const part of particlesRef.current) {
        const age = now - part.born;
        const alpha = Math.max(0, 1 - age / PARTICLE_LIFE);
        ctx2.globalAlpha = alpha;
        ctx2.fillStyle = part.color;
        ctx2.beginPath();
        ctx2.arc(part.x, part.y, part.size * (1 - age / PARTICLE_LIFE * 0.5), 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.globalAlpha = 1;

      // magnet visual
      if (hasPowerUp("magnet")) {
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, MAGNET_R, 0, Math.PI * 2);
        ctx2.strokeStyle = `rgba(139,92,246,${0.1 + Math.sin(now * 3) * 0.05})`;
        ctx2.lineWidth = 1;
        ctx2.stroke();
      }

      // enemies
      const frozen = freezeTimerRef.current > 0;
      for (const e of enemiesRef.current) {
        const stats = ENEMY_STATS[e.type];
        const confused = e.alertCooldown > 0;

        if (e.chasing) {
          ctx2.beginPath();
          ctx2.arc(e.x, e.y, stats.detectRange, 0, Math.PI * 2);
          ctx2.strokeStyle = "rgba(220,38,38,0.12)";
          ctx2.lineWidth = 1;
          ctx2.stroke();
        }

        ctx2.globalAlpha = frozen ? 0.5 : 1;
        ctx2.fillStyle = frozen ? "#4b5563" : confused ? "#d97706" : e.chasing ? stats.chaseColor : stats.color;
        ctx2.fillRect(e.x - 10, e.y - 10, 20, 24);

        ctx2.beginPath();
        ctx2.arc(e.x, e.y - 14, 10, 0, Math.PI * 2);
        ctx2.fillStyle = frozen ? "#6b7280" : confused ? "#f59e0b" : e.chasing ? stats.chaseColor : stats.color;
        ctx2.fill();

        ctx2.fillStyle = frozen ? "#9ca3af" : confused ? "#fbbf24" : e.chasing ? "#fca5a5" : "#93c5fd";
        ctx2.font = "bold 9px sans-serif";
        ctx2.textAlign = "center";
        ctx2.fillText(frozen ? "❄️" : confused ? "💫" : e.chasing ? "!" : stats.label, e.x, e.y - 28);
        ctx2.globalAlpha = 1;
      }

      // player
      const px = p.x;
      const py = p.y;
      const isInvuln = invulnRef.current > 0;
      const isInvisible = hasPowerUp("invisible");
      const bobY = Math.sin(bobRef.current) * 2;

      ctx2.globalAlpha = isInvisible ? 0.3 : 1;

      if (isInvuln && !isInvisible && Math.floor(now * 8) % 2 === 0) {
        // blink
      } else {
        ctx2.fillStyle = "#1a1a2e";
        const bx = px - 11;
        const by = py - 4 + bobY;
        ctx2.beginPath();
        ctx2.roundRect(bx, by, 22, 22, 4);
        ctx2.fill();
        ctx2.fillStyle = "#8b0000";
        ctx2.fillRect(bx + 9, by + 2, 4, 14);

        ctx2.save();
        ctx2.beginPath();
        ctx2.arc(px, py - 12 + bobY, 13, 0, Math.PI * 2);
        ctx2.clip();
        if (imgLoadedRef.current && imgRef.current) {
          ctx2.drawImage(imgRef.current, px - 13, py - 25 + bobY, 26, 26);
        } else {
          ctx2.fillStyle = "#fbbf24";
          ctx2.fill();
          ctx2.fillStyle = "#000";
          ctx2.font = "bold 10px sans-serif";
          ctx2.textAlign = "center";
          ctx2.fillText(ministerName.charAt(0), px, py - 9 + bobY);
        }
        ctx2.restore();

        ctx2.beginPath();
        ctx2.arc(px, py - 12 + bobY, 13, 0, Math.PI * 2);
        const hasImmunity = immunityTimerRef.current > 0;
        ctx2.strokeStyle = hasImmunity ? "#34d399" : isInvuln ? "#ef4444" : "#ffd700";
        ctx2.lineWidth = hasImmunity ? 3 : 2;
        ctx2.stroke();

        if (hasImmunity) {
          ctx2.beginPath();
          ctx2.arc(px, py - 2 + bobY, 22, 0, Math.PI * 2);
          ctx2.strokeStyle = `rgba(52,211,153,${0.2 + Math.sin(now * 6) * 0.15})`;
          ctx2.lineWidth = 2;
          ctx2.stroke();
        }

        ctx2.fillStyle = "rgba(0,0,0,0.6)";
        const nameW = ctx2.measureText(ministerName).width + 8;
        ctx2.fillRect(px - nameW / 2, py + 18 + bobY, nameW, 14);
        ctx2.fillStyle = "#ffd700";
        ctx2.font = "bold 9px sans-serif";
        ctx2.textAlign = "center";
        ctx2.fillText(ministerName, px, py + 28 + bobY);
      }
      ctx2.globalAlpha = 1;

      // floating text
      for (const f of floatsRef.current) {
        const age = now - f.born;
        const alpha = Math.max(0, 1 - age / f.duration);
        const rise = age * 30;
        ctx2.globalAlpha = alpha;
        ctx2.fillStyle = f.color;
        ctx2.font = f.size ? `bold ${f.size}px sans-serif` : (f.color === "#ffffff" ? "italic 11px sans-serif" : "bold 13px sans-serif");
        ctx2.textAlign = "center";
        ctx2.fillText(f.text, f.x, f.y - rise);
      }
      ctx2.globalAlpha = 1;

      ctx2.restore(); // end camera

      // ─── screen effects ───────────────────────────────────
      // vignette when wanted high
      const wanted = wantedRef.current;
      if (wanted > 3) {
        const intensity = Math.min((wanted - 3) / 7, 1) * 0.4;
        const grad = ctx2.createRadialGradient(cw / 2, ch / 2, cw * 0.3, cw / 2, ch / 2, cw * 0.7);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(220,38,38,${intensity})`);
        ctx2.fillStyle = grad;
        ctx2.fillRect(0, 0, cw, ch);
      }

      // combo glow
      const comboCount = comboRef.current.count;
      if (comboCount >= 3) {
        const glowIntensity = Math.min((comboCount - 2) / 5, 1) * 0.15;
        const grad2 = ctx2.createRadialGradient(cw / 2, ch / 2, cw * 0.4, cw / 2, ch / 2, cw * 0.7);
        grad2.addColorStop(0, "rgba(0,0,0,0)");
        grad2.addColorStop(1, `rgba(255,215,0,${glowIntensity})`);
        ctx2.fillStyle = grad2;
        ctx2.fillRect(0, 0, cw, ch);
      }

      // ─── HUD ──────────────────────────────────────────────
      // top bar
      ctx2.fillStyle = "rgba(0,0,0,0.8)";
      ctx2.fillRect(0, 0, cw, 56);
      ctx2.fillStyle = "rgba(255,255,255,0.05)";
      ctx2.fillRect(0, 55, cw, 1);

      // score
      ctx2.fillStyle = "#ffd700";
      ctx2.font = "bold 24px sans-serif";
      ctx2.textAlign = "left";
      ctx2.fillText(`${Math.floor(displayScoreRef.current).toLocaleString("sk-SK")} €`, 12, 28);

      // level target progress
      const targetPct = Math.min(scoreRef.current / lvl.target, 1);
      ctx2.fillStyle = "#222";
      ctx2.fillRect(12, 36, 150, 8);
      const progGrad = ctx2.createLinearGradient(12, 0, 162, 0);
      progGrad.addColorStop(0, "#fbbf24");
      progGrad.addColorStop(1, targetPct >= 1 ? "#22c55e" : "#f59e0b");
      ctx2.fillStyle = progGrad;
      ctx2.fillRect(12, 36, 150 * targetPct, 8);
      ctx2.fillStyle = "rgba(255,255,255,0.4)";
      ctx2.font = "9px sans-serif";
      ctx2.textAlign = "left";
      ctx2.fillText(`Cieľ: ${lvl.target.toLocaleString("sk-SK")} €`, 12, 54);

      // combo indicator
      if (comboCount > 0) {
        const cc = COMBO_COLORS[Math.min(comboCount, COMBO_COLORS.length - 1)];
        ctx2.fillStyle = cc;
        ctx2.font = `bold ${16 + comboCount * 2}px sans-serif`;
        ctx2.textAlign = "center";
        ctx2.fillText(`x${COMBO_MULTIPLIERS[Math.min(comboCount, COMBO_MULTIPLIERS.length - 1)]}`, cw / 2, 28);
        ctx2.fillStyle = "rgba(255,255,255,0.3)";
        ctx2.font = "9px sans-serif";
        ctx2.fillText("COMBO", cw / 2, 42);
      }

      // wanted bar (right)
      ctx2.fillStyle = wanted > 5 ? "#ef4444" : wanted > 2 ? "#f59e0b" : "#22c55e";
      ctx2.font = "bold 11px sans-serif";
      ctx2.textAlign = "right";
      ctx2.fillText("PÁTRANÝ", cw - 12, 18);
      ctx2.fillStyle = "#222";
      ctx2.fillRect(cw - 148, 24, 136, 8);
      ctx2.fillStyle = wanted > 5 ? "#dc2626" : wanted > 2 ? "#f59e0b" : "#22c55e";
      ctx2.fillRect(cw - 148, 24, Math.min(136, (wanted / 10) * 136), 8);

      // timer
      const remaining = Math.max(0, lvl.timeLimit - timeRef.current);
      ctx2.fillStyle = remaining < 15 ? "#ef4444" : remaining < 30 ? "#f59e0b" : "rgba(255,255,255,0.5)";
      ctx2.font = remaining < 15 ? "bold 13px sans-serif" : "12px sans-serif";
      ctx2.textAlign = "right";
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      ctx2.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, cw - 12, 48);

      // active power-ups indicator
      const activePU = activePowerUpsRef.current;
      if (activePU.length > 0) {
        let puX = cw / 2 - activePU.length * 25;
        for (const apu of activePU) {
          const typeDef = POWERUP_TYPES.find((t) => t.type === apu.type)!;
          const timeLeft = Math.max(0, apu.endsAt - timeRef.current);
          const pct = timeLeft / typeDef.duration;

          ctx2.fillStyle = "rgba(0,0,0,0.6)";
          ctx2.beginPath();
          ctx2.roundRect(puX, 3, 46, 50, 6);
          ctx2.fill();

          ctx2.font = "18px sans-serif";
          ctx2.textAlign = "center";
          ctx2.fillText(typeDef.icon, puX + 23, 24);

          ctx2.fillStyle = "#333";
          ctx2.fillRect(puX + 6, 32, 34, 4);
          ctx2.fillStyle = typeDef.color;
          ctx2.fillRect(puX + 6, 32, 34 * pct, 4);

          ctx2.fillStyle = "rgba(255,255,255,0.4)";
          ctx2.font = "8px sans-serif";
          ctx2.fillText(`${Math.ceil(timeLeft)}s`, puX + 23, 48);

          puX += 50;
        }
      }

      // catches counter
      if (catchesRef.current > 0) {
        ctx2.fillStyle = "rgba(239,68,68,0.5)";
        ctx2.font = "10px sans-serif";
        ctx2.textAlign = "right";
        ctx2.fillText(`Chytený: ${catchesRef.current}x`, cw - 12, 54);
      }

      // ─── skill HUD ────────────────────────────────────────
      const currentSkill = SKILLS[skillIndexRef.current % SKILLS.length];
      const cdLeft = skillCooldownRef.current;
      const cdPct = cdLeft / SKILL_COOLDOWN;
      const skillReady = cdLeft <= 0 && scoreRef.current >= currentSkill.cost;
      const skillW = 220;
      const skillX = (cw - skillW) / 2;
      const skillY = ch - 60;

      ctx2.fillStyle = "rgba(0,0,0,0.75)";
      ctx2.beginPath();
      ctx2.roundRect(skillX, skillY, skillW, 48, 10);
      ctx2.fill();
      if (skillReady) {
        ctx2.strokeStyle = `${currentSkill.color}60`;
        ctx2.lineWidth = 1;
        ctx2.stroke();
      }

      ctx2.fillStyle = "#222";
      ctx2.fillRect(skillX + 44, skillY + 32, skillW - 54, 6);
      if (cdLeft > 0) {
        ctx2.fillStyle = "#555";
        ctx2.fillRect(skillX + 44, skillY + 32, (skillW - 54) * (1 - cdPct), 6);
      } else {
        ctx2.fillStyle = currentSkill.color;
        ctx2.fillRect(skillX + 44, skillY + 32, skillW - 54, 6);
      }

      ctx2.font = "18px sans-serif";
      ctx2.textAlign = "left";
      ctx2.fillText(currentSkill.icon, skillX + 10, skillY + 26);
      ctx2.font = skillReady ? "bold 12px sans-serif" : "12px sans-serif";
      ctx2.fillStyle = skillReady ? currentSkill.color : "rgba(255,255,255,0.3)";
      ctx2.fillText(currentSkill.name, skillX + 34, skillY + 18);

      ctx2.font = "9px sans-serif";
      ctx2.fillStyle = "rgba(255,255,255,0.3)";
      ctx2.textAlign = "left";
      ctx2.fillText(cdLeft > 0 ? `${Math.ceil(cdLeft)}s` : `${currentSkill.cost} €`, skillX + 34, skillY + 28);

      // all 4 skill selectors
      for (let i = 0; i < 4; i++) {
        const sk = SKILLS[i];
        const isActive = i === skillIndexRef.current % SKILLS.length;
        const sx = skillX + skillW + 6 + i * 28;
        const sy = skillY + 10;
        ctx2.fillStyle = isActive ? `${sk.color}30` : "rgba(255,255,255,0.05)";
        ctx2.beginPath();
        ctx2.roundRect(sx, sy, 24, 28, 4);
        ctx2.fill();
        if (isActive) {
          ctx2.strokeStyle = sk.color;
          ctx2.lineWidth = 1;
          ctx2.stroke();
        }
        ctx2.font = "12px sans-serif";
        ctx2.textAlign = "center";
        ctx2.fillText(sk.icon, sx + 12, sy + 16);
        ctx2.fillStyle = "rgba(255,255,255,0.2)";
        ctx2.font = "8px sans-serif";
        ctx2.fillText(`${i + 1}`, sx + 12, sy + 26);
      }

      ctx2.font = "bold 9px sans-serif";
      ctx2.textAlign = "right";
      ctx2.fillStyle = skillReady ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)";
      ctx2.fillText("SPACE", skillX + skillW - 8, skillY + 18);

      // skill flash
      const sf = skillFlashRef.current;
      if (sf.active) {
        const sfAge = now - sf.born;
        if (sfAge < 1.5) {
          ctx2.globalAlpha = Math.max(0, 1 - sfAge / 1.5);
          ctx2.fillStyle = sf.color;
          ctx2.font = `bold ${20 + sfAge * 10}px sans-serif`;
          ctx2.textAlign = "center";
          ctx2.fillText(sf.text, cw / 2, ch / 2 - 30);
          ctx2.globalAlpha = 1;
        } else {
          skillFlashRef.current.active = false;
        }
      }

      // ─── minimap ──────────────────────────────────────────
      const mmW = 100;
      const mmH = Math.floor(mmW * (rows / cols));
      const mmX = cw - mmW - 8;
      const mmY = ch - mmH - 68;
      const mmScale = mmW / (cols * T);

      ctx2.fillStyle = "rgba(0,0,0,0.7)";
      ctx2.beginPath();
      ctx2.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 4);
      ctx2.fill();

      // draw minimap walls
      const mmTileW = mmW / cols;
      const mmTileH = mmH / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = tileAt(c, r);
          if (tile === "wall") {
            ctx2.fillStyle = "rgba(255,255,255,0.15)";
            ctx2.fillRect(mmX + c * mmTileW, mmY + r * mmTileH, mmTileW, mmTileH);
          }
        }
      }

      // items on minimap
      for (const item of itemsRef.current) {
        if (!item.alive) continue;
        ctx2.fillStyle = "rgba(255,215,0,0.4)";
        ctx2.fillRect(mmX + item.x * mmScale - 1, mmY + item.y * mmScale - 1, 2, 2);
      }

      // enemies on minimap
      for (const e of enemiesRef.current) {
        ctx2.fillStyle = e.chasing ? "#ef4444" : "#3b82f6";
        ctx2.fillRect(mmX + e.x * mmScale - 2, mmY + e.y * mmScale - 2, 4, 4);
      }

      // player on minimap
      ctx2.fillStyle = "#ffd700";
      ctx2.beginPath();
      ctx2.arc(mmX + p.x * mmScale, mmY + p.y * mmScale, 3, 0, Math.PI * 2);
      ctx2.fill();

      // ─── controls hint ────────────────────────────────────
      ctx2.fillStyle = "rgba(255,255,255,0.12)";
      ctx2.font = "10px sans-serif";
      ctx2.textAlign = "center";
      ctx2.fillText("WASD = pohyb  |  SPACE = skill  |  1-4 = zmeniť skill  |  ESC = pauza", cw / 2, ch - 6);

      // mobile skill button
      if ("ontouchstart" in window) {
        const btnX = cw - 70;
        const btnY = ch - 120;
        ctx2.beginPath();
        ctx2.arc(btnX, btnY, 32, 0, Math.PI * 2);
        ctx2.fillStyle = skillReady ? "rgba(255,215,0,0.2)" : "rgba(100,100,100,0.15)";
        ctx2.fill();
        ctx2.strokeStyle = skillReady ? "rgba(255,215,0,0.5)" : "rgba(100,100,100,0.2)";
        ctx2.lineWidth = 2;
        ctx2.stroke();
        ctx2.font = "22px sans-serif";
        ctx2.textAlign = "center";
        ctx2.fillText(currentSkill.icon, btnX, btnY + 7);
      }

      // joystick
      const joy = joystickRef.current;
      if (joy.active) {
        ctx2.beginPath();
        ctx2.arc(joy.cx, joy.cy, 50, 0, Math.PI * 2);
        ctx2.fillStyle = "rgba(255,255,255,0.05)";
        ctx2.fill();
        ctx2.strokeStyle = "rgba(255,255,255,0.15)";
        ctx2.lineWidth = 2;
        ctx2.stroke();
        ctx2.beginPath();
        ctx2.arc(joy.cx + joy.dx * 40, joy.cy + joy.dy * 40, 18, 0, Math.PI * 2);
        ctx2.fillStyle = "rgba(255,215,0,0.3)";
        ctx2.fill();
      }

      // ─── paused overlay ───────────────────────────────────
      if (pausedRef.current) {
        ctx2.fillStyle = "rgba(0,0,0,0.8)";
        ctx2.fillRect(0, 0, cw, ch);
        ctx2.fillStyle = "#ffd700";
        ctx2.font = "bold 40px sans-serif";
        ctx2.textAlign = "center";
        ctx2.fillText("PAUZA", cw / 2, ch / 2 - 30);
        ctx2.fillStyle = "rgba(255,255,255,0.5)";
        ctx2.font = "14px sans-serif";
        ctx2.fillText("ESC pre pokračovanie", cw / 2, ch / 2 + 10);
        ctx2.fillStyle = "rgba(255,255,255,0.3)";
        ctx2.font = "12px sans-serif";
        ctx2.fillText(`Level ${lvl.id}: ${lvl.name}`, cw / 2, ch / 2 + 40);
      }

      // ─── level complete overlay ───────────────────────────
      if (completedRef.current) {
        ctx2.fillStyle = "rgba(0,0,0,0.85)";
        ctx2.fillRect(0, 0, cw, ch);

        const success = scoreRef.current >= lvl.target;
        const stars = success ? calcStars(scoreRef.current, lvl.target, wantedRef.current, catchesRef.current) : 0;

        ctx2.fillStyle = success ? "#ffd700" : "#ef4444";
        ctx2.font = "bold 36px sans-serif";
        ctx2.textAlign = "center";
        ctx2.fillText(success ? "LEVEL HOTOVÝ!" : "ČAS VYPRŠAL!", cw / 2, ch / 2 - 60);

        if (success) {
          ctx2.font = "40px sans-serif";
          const starStr = "⭐".repeat(stars) + "☆".repeat(3 - stars);
          ctx2.fillText(starStr, cw / 2, ch / 2 - 15);
        }

        ctx2.fillStyle = "#ffd700";
        ctx2.font = "bold 22px sans-serif";
        ctx2.fillText(`${scoreRef.current.toLocaleString("sk-SK")} €`, cw / 2, ch / 2 + 25);

        ctx2.fillStyle = "rgba(255,255,255,0.5)";
        ctx2.font = "13px sans-serif";
        ctx2.fillText(`Chytený: ${catchesRef.current}x  |  Čas: ${Math.floor(timeRef.current)}s`, cw / 2, ch / 2 + 55);
      }
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [ministerName, levelId, onComplete]);

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
        className="absolute left-3 top-14 z-10 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
      >
        ← Späť
      </button>
    </div>
  );
};
