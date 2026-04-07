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

  combo: (tier: number) => {
    const baseFreq = 600 + tier * 200;
    note(baseFreq, 0.08, "sine", 0.15);
    note(baseFreq * 1.25, 0.1, "sine", 0.12, 0.04);
    if (tier >= 4) note(baseFreq * 1.5, 0.12, "triangle", 0.1, 0.08);
  },

  powerup: () => {
    [600, 800, 1000, 1200, 1400].forEach((f, i) =>
      note(f, 0.15, "triangle", 0.12, i * 0.04),
    );
  },

  powerupEnd: () => {
    note(800, 0.1, "sawtooth", 0.08);
    note(400, 0.2, "sawtooth", 0.06, 0.08);
  },

  levelComplete: () => {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((f, i) => note(f, 0.3, "sine", 0.2, i * 0.12));
  },

  tick: () => {
    note(1800, 0.03, "sine", 0.06);
  },
};

// ─── background music ────────────────────────────────────────
let musicPlaying = false;
let musicGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;

const kick = () => {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.15);
  g.gain.setValueAtTime(0.25, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(g);
  if (musicGain) g.connect(musicGain); else g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.15);
};

const hihat = () => {
  const c = getCtx();
  const len = Math.floor(c.sampleRate * 0.05);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.06;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(0.06, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
  const hp = c.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 7000;
  src.connect(hp); hp.connect(g);
  if (musicGain) g.connect(musicGain); else g.connect(c.destination);
  src.start();
};

const bassNote = (freq: number) => {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  osc.connect(g);
  if (musicGain) g.connect(musicGain); else g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.3);
};

const bassPattern = [55, 55, 73, 55, 82, 55, 73, 55];
let beatIdx = 0;

export const startMusic = () => {
  if (musicPlaying) return;
  musicPlaying = true;
  const c = getCtx();
  musicGain = c.createGain();
  musicGain.gain.value = 0.5;
  musicGain.connect(c.destination);
  beatIdx = 0;

  const bpm = 110;
  const beatMs = (60 / bpm) * 1000 / 2;

  musicInterval = setInterval(() => {
    const step = beatIdx % 8;
    if (step === 0 || step === 4) kick();
    if (step === 2 || step === 6) hihat();
    if (step % 2 === 0) bassNote(bassPattern[step]);
    hihat();
    beatIdx++;
  }, beatMs);
};

export const stopMusic = () => {
  musicPlaying = false;
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  musicGain = null;
};

export const setMusicVolume = (v: number) => {
  if (musicGain) musicGain.gain.value = v;
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
