import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useData } from "@/hooks/useData";
import { PoliticianCard } from "@/components/PoliticianCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { Politician } from "@/types";

export const VladaPage = () => {
  const { t } = useTranslation();
  const { data: politicians, loading, error, retry } = useData<Politician[]>("politicians.json");

  if (loading) return <LoadingSkeleton count={8} />;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-kauza">{t("common.error")}</p>
        <button onClick={retry} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const govMembers = (politicians || []).filter((p) => p.institution === "vlada");

  const premier = govMembers.find(
    (p) =>
      p.position.toLowerCase().includes("predseda vlády") &&
      !p.position.toLowerCase().includes("podpredsed"),
  );
  const ministers = govMembers.filter((p) => p !== premier);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold">{t("vlada.title")}</h1>

      {premier && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md"
        >
          <PoliticianCard politician={premier} />
        </motion.div>
      )}

      {premier && (
        <div className="flex justify-center">
          <div className="h-8 w-px bg-border-custom .light:bg-border-light" />
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("vlada.members")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ministers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <PoliticianCard politician={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
