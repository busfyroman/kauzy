import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useData } from "@/hooks/useData";
import { PoliticianCard } from "@/components/PoliticianCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { Politician } from "@/types";

export const ParlamentPage = () => {
  const { t } = useTranslation();
  const { data: politicians, loading } = useData<Politician[]>("politicians.json");
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("");

  const mps = useMemo(
    () => (politicians || []).filter((p) => p.institution === "nrsr"),
    [politicians],
  );

  const parties = useMemo(
    () => [...new Set(mps.map((p) => p.party).filter(Boolean))].sort(),
    [mps],
  );

  const filtered = useMemo(() => {
    let result = mps;
    if (partyFilter) {
      result = result.filter((p) => p.party === partyFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.party?.toLowerCase().includes(q) ||
          p.region?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [mps, partyFilter, search]);

  if (loading) return <LoadingSkeleton count={12} />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold">{t("parlament.title")}</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("parlament.search")}
            className="w-full rounded-lg border border-border-custom bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary .light:border-border-light .light:bg-card-light"
          />
        </div>

        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className="rounded-lg border border-border-custom bg-card px-3 py-2 text-sm outline-none focus:border-primary .light:border-border-light .light:bg-card-light"
        >
          <option value="">{t("parlament.filterByParty")}</option>
          {parties.map((party) => (
            <option key={party} value={party}>
              {party}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-text-secondary">
        {t("parlament.members")}: {filtered.length}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.5) }}
          >
            <PoliticianCard politician={p} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
