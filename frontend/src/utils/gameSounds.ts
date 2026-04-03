let ctx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

const note = (
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.25,
  delay = 0,
) => {
  const c = getCtx();
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
};

const noise = (dur: number, vol = 0.04) => {
  const c = getCtx();
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * vol;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 800;
  src.connect(hp);
  hp.connect(g);
  g.connect(c.destination);
  src.start();
};

let lastStepTime = 0;

export const gameSounds = {
  init: () => { getCtx(); },

  coin: () => {
    note(1200, 0.08, "sine", 0.2);
    note(1600, 0.12, "sine", 0.15, 0.04);
  },

  money: () => {
    note(800, 0.08, "sine", 0.2);
    note(1200, 0.08, "sine", 0.18, 0.05);
    note(1600, 0.12, "sine", 0.15, 0.1);
  },

  gold: () => {
    [800, 1000, 1200, 1600].forEach((f, i) =>
      note(f, 0.2, "sine", 0.18, i * 0.06),
    );
  },

  step: () => {
    const now = performance.now();
    if (now - lastStepTime < 250) return;
    lastStepTime = now;
    noise(0.04, 0.03);
    note(100, 0.03, "sine", 0.04);
  },

  alert: () => {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, c.currentTime);
    osc.frequency.linearRampToValueAtTime(900, c.currentTime + 0.4);
    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.5);
  },

  caught: () => {
    note(400, 0.15, "sawtooth", 0.12);
    note(250, 0.25, "sawtooth", 0.1, 0.1);
    note(150, 0.3, "sawtooth", 0.08, 0.2);
  },

  siren: () => {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, c.currentTime);
    osc.frequency.linearRampToValueAtTime(900, c.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.6);
    gain.gain.setValueAtTime(0.08, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.7);
  },

  levelUp: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      note(f, 0.25, "sine", 0.2, i * 0.1),
    );
  },

  bribe: () => {
    note(300, 0.1, "sine", 0.15);
    note(600, 0.15, "sine", 0.2, 0.08);
    note(900, 0.2, "sine", 0.15, 0.16);
  },

  freeze: () => {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.5);
  },

  immunity: () => {
    [1000, 1200, 1400, 1000, 1400, 1600].forEach((f, i) =>
      note(f, 0.12, "triangle", 0.15, i * 0.05),
    );
  },

  skillReady: () => {
    note(880, 0.06, "sine", 0.1);
    note(1100, 0.08, "sine", 0.08, 0.05);
  },
};

// ─── real voice clips (Fico press conferences) ──────────────
const VOICE_COUNT = 20;
const voicePool: HTMLAudioElement[] = [];
let voicesPreloaded = false;
let lastVoiceIdx = -1;

export const preloadVoices = () => {
  if (voicesPreloaded) return;
  voicesPreloaded = true;
  for (let i = 1; i <= VOICE_COUNT; i++) {
    const a = new Audio(`/audio/voice${i}.mp3`);
    a.preload = "auto";
    a.volume = 0.7;
    voicePool.push(a);
  }
};

export const playVoice = (vol = 0.7) => {
  if (voicePool.length === 0) { preloadVoices(); return; }
  let idx = Math.floor(Math.random() * voicePool.length);
  if (idx === lastVoiceIdx) idx = (idx + 1) % voicePool.length;
  lastVoiceIdx = idx;
  const a = voicePool[idx];
  if (!a) return;
  a.volume = vol;
  a.currentTime = 0;
  a.play().catch(() => {});
};

export const stopVoice = () => {
  for (const a of voicePool) {
    if (!a.paused) { a.pause(); a.currentTime = 0; }
  }
};
