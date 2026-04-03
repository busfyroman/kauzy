import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Search, AlertTriangle, Users, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useData } from "@/hooks/useData";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { KauzyData } from "@/types";

export const KauzyPage = () => {
  const { t } = useTranslation();
  const { data: kauzyData, loading } = useData<KauzyData>("kauzy.json");
  const [search, setSearch] = useState("");

  const kauzy = useMemo(() => {
    const list = kauzyData?.kauzy || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        k.description.toLowerCase().includes(q) ||
        k.actors.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [kauzyData, search]);

  if (loading) return <LoadingSkeleton count={8} type="row" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{t("kauzy.title")}</h1>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("kauzy.search")}
          className="w-full rounded-lg border border-border-custom bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary .light:border-border-light .light:bg-card-light"
        />
      </div>

      <div className="space-y-3">
        {kauzy.map((kauza, i) => (
          <motion.div
            key={kauza.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 text-kauza" />
                  <h3 className="text-sm font-semibold">{kauza.title}</h3>
                </div>
                {kauza.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                    {kauza.description}
                  </p>
                )}

                {kauza.actors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {kauza.actors.map((actor) => (
                      <span key={actor.slug}>
                        {actor.matchedPoliticianId ? (
                          <Link
                            to={`/politik/${actor.matchedPoliticianId}`}
                            className="inline-flex items-center gap-1 rounded bg-politician/20 px-1.5 py-0.5 text-[11px] font-medium text-politician hover:bg-politician/30"
                          >
                            <Users size={10} />
                            {actor.name}
                          </Link>
                        ) : (
                          <span className="inline-block rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-text-secondary">
                            {actor.name}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <a
                href={kauza.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded p-1 hover:bg-white/10"
              >
                <ExternalLink size={14} className="text-text-secondary" />
              </a>
            </div>
          </motion.div>
        ))}

        {kauzy.length === 0 && (
          <p className="py-10 text-center text-text-secondary">
            {t("search.noResults")}
          </p>
        )}
      </div>
    </div>
  );
};
