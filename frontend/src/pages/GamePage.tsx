import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "@/hooks/useData";
import { gameSounds } from "@/utils/gameSounds";
import { preloadVoices } from "@/utils/gameSounds";
import { hasSeenDisclaimer, markDisclaimerSeen } from "@/utils/gameStorage";
import { GameCanvas } from "@/components/game/GameCanvas";
import { DisclaimerScreen } from "@/components/game/DisclaimerScreen";
import { LEVELS, getHighScores } from "@/utils/gameLevels";
import type { Politician } from "@/types";

type Phase = "disclaimer" | "select" | "levels" | "playing" | "result";

interface ResultData { score: number; stars: number; time: number; levelId: number }

export const GamePage = () => {
  const { data: politicians } = useData<Politician[]>("politicians.json");
  const [phase, setPhase] = useState<Phase>(hasSeenDisclaimer() ? "select" : "disclaimer");
  const [selected, setSelected] = useState<Politician | null>(null);
  const [levelId, setLevelId] = useState(1);
  const [result, setResult] = useState<ResultData | null>(null);
  const [, setHsRefresh] = useState(0);

  const highScores = getHighScores();

  const handleDisclaimer = useCallback(() => {
    markDisclaimerSeen();
    gameSounds.init();
    setPhase("select");
  }, []);

  const handleSelect = useCallback((p: Politician) => {
    setSelected(p);
    gameSounds.init();
    preloadVoices();
    setPhase("levels");
  }, []);

  const handleLevelSelect = useCallback((id: number) => {
    setLevelId(id);
    setPhase("playing");
  }, []);

  const handleBack = useCallback(() => {
    setPhase("levels");
  }, []);

  const handleBackToSelect = useCallback(() => {
    setSelected(null);
    setPhase("select");
  }, []);

  const handleComplete = useCallback((score: number, stars: number, time: number) => {
    setResult({ score, stars, time, levelId });
    setHsRefresh((n) => n + 1);
    setPhase("result");
  }, [levelId]);

  const vladaMembers = (politicians ?? []).filter((p) => p.institution === "vlada");

  if (phase === "disclaimer") return <DisclaimerScreen onAccept={handleDisclaimer} />;

  if (phase === "playing" && selected) {
    return (
      <div className="h-[calc(100vh-3.5rem)] w-full">
        <GameCanvas
          photoUrl={`/data/photos/${selected.id}.jpg`}
          ministerName={selected.name}
          levelId={levelId}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  if (phase === "result" && result) {
    const lvl = LEVELS.find((l) => l.id === result.levelId);
    const success = result.stars > 0;
    const nextLevel = LEVELS.find((l) => l.id === result.levelId + 1);
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-[#0a0a0a] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
        >
          <div className="mb-2 text-4xl">{success ? "🎉" : "💀"}</div>
          <h2
            className="mb-1 text-3xl font-black"
            style={{
              background: success ? "linear-gradient(135deg, #ffd700, #ffaa00)" : "linear-gradient(135deg, #ef4444, #dc2626)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}
          >
            {success ? "HOTOVO!" : "KONIEC!"}
          </h2>
          <p className="mb-4 text-sm text-white/40">
            {lvl?.name ?? ""} - {lvl?.subtitle ?? ""}
          </p>

          {success && (
            <div className="mb-4 text-4xl">
              {"⭐".repeat(result.stars)}{"☆".repeat(3 - result.stars)}
            </div>
          )}

          <div className="mb-1 text-2xl font-bold text-yellow-400">
            {result.score.toLocaleString("sk-SK")} €
          </div>
          <p className="mb-6 text-xs text-white/30">
            Čas: {Math.floor(result.time)}s
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setResult(null); setPhase("playing"); }}
              className="rounded-xl bg-yellow-600/20 px-6 py-3 text-sm font-bold text-yellow-400 transition-colors hover:bg-yellow-600/30"
            >
              Skúsiť znova
            </button>
            {success && nextLevel && (
              <button
                onClick={() => { setResult(null); handleLevelSelect(nextLevel.id); }}
                className="rounded-xl bg-green-600/20 px-6 py-3 text-sm font-bold text-green-400 transition-colors hover:bg-green-600/30"
              >
                Ďalší level: {nextLevel.name}
              </button>
            )}
            <button
              onClick={() => { setResult(null); setPhase("levels"); }}
              className="rounded-xl bg-white/5 px-6 py-3 text-sm text-white/50 transition-colors hover:bg-white/10"
            >
              Výber levelu
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "levels") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center bg-[#0a0a0a] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <button
            onClick={handleBackToSelect}
            className="mb-4 text-xs text-white/30 transition-colors hover:text-white/60"
          >
            ← Zmeniť ministra
          </button>
          <h1
            className="mb-1 text-3xl font-black tracking-tight md:text-4xl"
            style={{
              background: "linear-gradient(135deg, #ffd700, #ffaa00)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}
          >
            VYBER LEVEL
          </h1>
          <p className="text-sm text-white/30">Hráš ako: {selected?.name}</p>
        </motion.div>

        <div className="grid w-full max-w-2xl gap-4 md:grid-cols-3">
          {LEVELS.map((lvl, i) => {
            const hs = highScores[lvl.id];
            const prevCompleted = i === 0 || highScores[LEVELS[i - 1].id]?.stars > 0;
            const locked = !prevCompleted;

            return (
              <motion.button
                key={lvl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: locked ? 0.4 : 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => !locked && handleLevelSelect(lvl.id)}
                disabled={locked}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all ${
                  locked
                    ? "cursor-not-allowed border-white/5 bg-white/[0.01]"
                    : "border-white/10 bg-white/[0.03] hover:border-yellow-600/40 hover:bg-yellow-900/10 hover:shadow-[0_0_30px_rgba(255,215,0,0.08)] active:scale-95"
                }`}
              >
                {locked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                    <span className="text-3xl">🔒</span>
                  </div>
                )}

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl font-black text-yellow-400">
                  {lvl.id}
                </div>

                <div>
                  <div className="text-sm font-bold text-white/80 group-hover:text-yellow-300">
                    {lvl.name}
                  </div>
                  <div className="mt-1 text-[10px] text-white/25">
                    {lvl.subtitle}
                  </div>
                </div>

                <div className="text-xs text-white/30">
                  Cieľ: {lvl.target.toLocaleString("sk-SK")} € | {Math.floor(lvl.timeLimit / 60)}:{(lvl.timeLimit % 60).toString().padStart(2, "0")}
                </div>

                <div className="text-xs text-white/20">
                  {lvl.enemies.length} nepriateľov
                </div>

                {hs && (
                  <div className="mt-1 rounded-lg bg-white/5 px-3 py-1.5">
                    <div className="text-sm">
                      {"⭐".repeat(hs.stars)}{"☆".repeat(3 - hs.stars)}
                    </div>
                    <div className="text-[10px] text-yellow-400/60">
                      {hs.score.toLocaleString("sk-SK")} €
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Character select
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center bg-[#0a0a0a] px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2 text-center">
        <h1
          className="mb-1 text-4xl font-black tracking-tight md:text-5xl"
          style={{
            background: "linear-gradient(135deg, #ffd700, #ffaa00)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}
        >
          KORUPCIA
        </h1>
        <p className="text-lg font-bold text-white/20">Satirická akčná hra</p>
        <p className="mt-1 text-sm italic text-white/30">Vyber si ministra a začni kradnúť</p>
      </motion.div>

      <div className="mt-6 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <AnimatePresence>
          {vladaMembers.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleSelect(p)}
              className="group flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-yellow-600/40 hover:bg-yellow-900/10 hover:shadow-[0_0_20px_rgba(255,215,0,0.05)] active:scale-95"
            >
              <img
                src={`/data/photos/${p.id}.jpg`}
                alt={p.name}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 transition-all group-hover:ring-yellow-500/50"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="text-center">
                <div className="text-xs font-semibold text-white/80 group-hover:text-yellow-300">
                  {p.name}
                </div>
                <div className="mt-0.5 text-[10px] text-white/25 group-hover:text-white/40">
                  {p.position.length > 30 ? p.position.slice(0, 30) + "…" : p.position}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {vladaMembers.length === 0 && (
        <div className="mt-12 text-sm text-white/30">Načítavam politikov...</div>
      )}
    </div>
  );
};
