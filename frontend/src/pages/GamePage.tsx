import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "@/hooks/useData";
import { gameSounds } from "@/utils/gameSounds";
import { hasSeenDisclaimer, markDisclaimerSeen } from "@/utils/gameStorage";
import { GameCanvas } from "@/components/game/GameCanvas";
import { DisclaimerScreen } from "@/components/game/DisclaimerScreen";
import type { Politician } from "@/types";

type Phase = "disclaimer" | "select" | "playing";

export const GamePage = () => {
  const { data: politicians } = useData<Politician[]>("politicians.json");
  const [phase, setPhase] = useState<Phase>(hasSeenDisclaimer() ? "select" : "disclaimer");
  const [selected, setSelected] = useState<Politician | null>(null);

  const handleDisclaimer = useCallback(() => {
    markDisclaimerSeen();
    gameSounds.init();
    setPhase("select");
  }, []);

  const handleSelect = useCallback((p: Politician) => {
    setSelected(p);
    gameSounds.init();
    setPhase("playing");
  }, []);

  const handleBack = useCallback(() => {
    setPhase("select");
    setSelected(null);
  }, []);

  const vladaMembers = (politicians ?? []).filter((p) => p.institution === "vlada");

  if (phase === "disclaimer") {
    return <DisclaimerScreen onAccept={handleDisclaimer} />;
  }

  if (phase === "playing" && selected) {
    return (
      <div className="h-[calc(100vh-3.5rem)] w-full">
        <GameCanvas
          photoUrl={`/data/photos/${selected.id}.jpg`}
          ministerName={selected.name}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center bg-[#0a0a0a] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-center"
      >
        <h1
          className="mb-1 text-4xl font-black tracking-tight md:text-5xl"
          style={{
            background: "linear-gradient(135deg, #ffd700, #ffaa00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          KORUPCIA KLIKER
        </h1>
        <p className="text-sm italic text-white/30">Vyber si ministra a začni kradnúť</p>
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
