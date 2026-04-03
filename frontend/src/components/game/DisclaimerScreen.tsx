import { motion } from "framer-motion";

interface DisclaimerScreenProps {
  onAccept: () => void;
}

export const DisclaimerScreen = ({ onAccept }: DisclaimerScreenProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4"
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="w-full max-w-md text-center"
    >
      <motion.h1
        className="mb-3 text-5xl font-black tracking-tight md:text-6xl"
        style={{
          background: "linear-gradient(135deg, #ffd700, #ffaa00, #ffd700)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "none",
          filter: "drop-shadow(0 0 30px rgba(255,215,0,0.3))",
        }}
      >
        KORUPCIA
        <br />
        KLIKER
      </motion.h1>

      <p className="mb-6 text-sm italic text-white/40">
        Satirická paródia na slovenskú realitu
      </p>

      <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5 text-left text-xs leading-relaxed text-white/40">
        <p className="mb-2">
          Všetky údaje pochádzajú z verejne dostupných registrov.
          Akákoľvek podoba so skutočnými politikmi je... no, asi nie náhoda.
        </p>
        <p className="mb-2">
          Platí prezumpcia neviny. Táto hra je satirická paródia
          a nepredstavuje obvinenie z protiprávneho konania.
        </p>
        <p>
          Akékoľvek príjmy v hre sú fiktívne. Teda... aspoň tie v hre.
        </p>
      </div>

      <motion.button
        onClick={onAccept}
        className="rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 px-10 py-4 text-lg font-black uppercase tracking-wider text-black shadow-2xl shadow-yellow-500/30 transition-all hover:from-yellow-500 hover:to-yellow-400"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Začať kradnúť
      </motion.button>

      <p className="mt-4 text-[10px] text-white/20">
        Stlačením tlačidla potvrdzujete, že máte zmysel pre humor.
      </p>
    </motion.div>
  </motion.div>
);
