const STORAGE_KEY = "korupcia_kliker_save";
const DISCLAIMER_KEY = "korupcia_kliker_disclaimer_seen";

export interface SavedGameState {
  money: number;
  totalEarned: number;
  ministers: Record<string, number>;
  investigationProgress: number;
  unlockedKauzy: string[];
  prestigeLevel: number;
  prestigeMultiplier: number;
  lastSaveTime: number;
  comboClicks: number;
}

export const saveGame = (state: SavedGameState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSaveTime: Date.now() }));
  } catch {
    // storage full or unavailable
  }
};

export const loadGame = (): SavedGameState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGameState;
  } catch {
    return null;
  }
};

export const clearSave = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const hasSeenDisclaimer = (): boolean => {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "true";
  } catch {
    return false;
  }
};

export const markDisclaimerSeen = (): void => {
  try {
    localStorage.setItem(DISCLAIMER_KEY, "true");
  } catch {
    // ignore
  }
};

export const getOfflineEarnings = (perSecond: number): { seconds: number; earned: number } | null => {
  const saved = loadGame();
  if (!saved || !saved.lastSaveTime || perSecond <= 0) return null;
  const seconds = Math.floor((Date.now() - saved.lastSaveTime) / 1000);
  if (seconds < 30) return null;
  const cappedSeconds = Math.min(seconds, 3600);
  return { seconds: cappedSeconds, earned: Math.floor(perSecond * cappedSeconds) };
};
