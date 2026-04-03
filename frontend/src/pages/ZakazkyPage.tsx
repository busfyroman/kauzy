import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useData } from "@/hooks/useData";
import { RiskBadge } from "@/components/RiskBadge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { formatCurrency } from "@/utils/format";
import type { ProcurementRecord } from "@/types";

type SortKey = "amount" | "date" | "riskScore";

const RiskBreakdown = ({ breakdown }: { breakdown?: Record<string, number> }) => {
  if (!breakdown) return null;
  const labels: Record<string, string> = {
    timing: "Načasovanie",
    contract_value: "Hodnota zmluvy",
    concentration: "Koncentrácia",
    directness: "Priamosť prepojenia",
    contract_count: "Počet zmlúv dodávateľa",
  };
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {Object.entries(breakdown).map(([key, val]) => (
        <div key={key} className="flex items-center justify-between gap-2">
          <span className="text-text-secondary">{labels[key] || key}</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${val}%`,
                  background:
                    val <= 30 ? "#22c55e" : val <= 60 ? "#eab308" : "#ef4444",
                }}
              />
            </div>
            <span className="w-7 text-right font-mono text-text-secondary">
              {Math.round(val)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ZakazkyPage = () => {
  const { t } = useTranslation();
  const { data: procurement, loading } =
    useData<ProcurementRecord[]>("procurement.json");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("riskScore");
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const flagged = useMemo(
    () => (procurement || []).filter((r) => r.flagged),
    [procurement],
  );

  const filtered = useMemo(() => {
    let result = flagged;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.subject?.toLowerCase().includes(q) ||
          r.contractorName?.toLowerCase().includes(q) ||
          r.buyerName?.toLowerCase().includes(q) ||
          r.contractorIco?.includes(q) ||
          r.linkedPoliticians?.some((p) => p.name.toLowerCase().includes(q)),
      );
    }
    return [...result].sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return sortDesc
        ? (bv as number) - (av as number)
        : (av as number) - (bv as number);
    });
  }, [flagged, search, sortBy, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  if (loading) return <LoadingSkeleton type="row" count={10} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("zakazky.title")}</h1>
        <span className="text-sm text-text-secondary">
          {t("zakazky.flagged")}: {flagged.length}
        </span>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full rounded-lg border border-border-custom bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary .light:border-border-light .light:bg-card-light"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-custom text-left text-xs text-text-secondary .light:border-border-light">
              <th className="p-3">{t("zakazky.contractor")}</th>
              <th className="hidden p-3 md:table-cell">
                {t("zakazky.buyer")}
              </th>
              <th className="p-3">
                <button
                  onClick={() => handleSort("amount")}
                  className="flex items-center gap-1 hover:text-text-primary"
                >
                  {t("zakazky.amount")} <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="p-3">
                <button
                  onClick={() => handleSort("riskScore")}
                  className="flex items-center gap-1 hover:text-text-primary"
                >
                  {t("zakazky.riskScore")} <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="hidden p-3 lg:table-cell">
                {t("dashboard.stats.politicians")}
              </th>
              <th className="p-3 text-center">CRZ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <tr
                  key={r.id}
                  className="group border-b border-border-custom/50 transition-colors hover:bg-white/5 .light:border-border-light/50"
                >
                  <td className="p-3">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : r.id)
                      }
                      className="flex items-start gap-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronUp size={14} className="mt-0.5 shrink-0 text-text-secondary" />
                      ) : (
                        <ChevronDown size={14} className="mt-0.5 shrink-0 text-text-secondary" />
                      )}
                      <div>
                        <p className="font-medium">{r.contractorName}</p>
                        <p className="text-[11px] text-text-secondary">
                          IČO: {r.contractorIco}
                        </p>
                        {isExpanded && (
                          <>
                            <p className="mt-1 text-xs text-text-secondary">
                              {r.subject}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              Dátum: {r.date}
                            </p>
                            <RiskBreakdown breakdown={r.riskBreakdown} />
                          </>
                        )}
                        {!isExpanded && (
                          <p className="text-xs text-text-secondary">
                            {r.subject?.slice(0, 60)}
                            {(r.subject?.length || 0) > 60 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="hidden p-3 text-text-secondary md:table-cell">
                    {r.buyerName}
                  </td>
                  <td className="p-3 font-semibold text-zakazka">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="p-3">
                    <RiskBadge score={r.riskScore} />
                  </td>
                  <td className="hidden p-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {r.linkedPoliticians?.map((p) => (
                        <Link
                          key={p.id}
                          to={`/politik/${p.id}`}
                          className="rounded bg-politician/20 px-1.5 py-0.5 text-[11px] font-medium text-politician hover:bg-politician/30"
                        >
                          {p.name}
                          {p.relation === "spouse" && " 💍"}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {r.detailUrl && (
                      <a
                        href={r.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs font-medium text-primary hover:bg-white/20 transition-colors"
                        title="Otvoriť na CRZ"
                      >
                        <ExternalLink size={12} />
                        <span className="hidden sm:inline">Zmluva</span>
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="py-10 text-center text-text-secondary">
            {t("search.noResults")}
          </p>
        )}
      </div>
    </div>
  );
};
