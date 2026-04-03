import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useData } from "@/hooks/useData";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ChangelogFeed } from "@/components/ChangelogFeed";
import type { Politician, KauzyData, ProcurementRecord, Company, Metadata } from "@/types";

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  to,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
  to: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-4 rounded-xl border border-border-custom bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg .light:border-border-light .light:bg-card-light"
  >
    <div className={`rounded-lg p-2.5 ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  </Link>
);

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { data: politicians, loading: loadingP } = useData<Politician[]>("politicians.json");
  const { data: companies } = useData<Company[]>("companies.json");
  const { data: kauzyData } = useData<KauzyData>("kauzy.json");
  const { data: procurement } = useData<ProcurementRecord[]>("procurement.json");
  const { data: metadata } = useData<Metadata>("metadata.json");

  if (loadingP) return <LoadingSkeleton count={4} />;

  const govMembers = (politicians || []).filter((p) => p.institution === "vlada");
  const kauzyCount = kauzyData?.kauzy?.length || 0;
  const flaggedContracts = (procurement || []).filter((r) => r.flagged).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          {metadata?.last_updated && (
            <p className="text-sm text-text-secondary">
              {t("dashboard.lastUpdated")}: {metadata.last_updated}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t("dashboard.stats.politicians")}
          value={politicians?.length || 0}
          color="bg-politician/20 text-politician"
          to="/vlada"
        />
        <StatCard
          icon={Building2}
          label={t("dashboard.stats.companies")}
          value={companies?.length || 0}
          color="bg-company/20 text-company"
          to="/zakazky"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("dashboard.stats.kauzy")}
          value={kauzyCount}
          color="bg-kauza/20 text-kauza"
          to="/kauzy"
        />
        <StatCard
          icon={FileText}
          label={t("dashboard.stats.contracts")}
          value={flaggedContracts}
          color="bg-zakazka/20 text-zakazka"
          to="/zakazky"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Government Structure Preview */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {t("dashboard.governmentTree")}
              </h3>
              <Link
                to="/vlada"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t("nav.vlada")} <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {govMembers.slice(0, 8).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/politik/${p.id}`}
                    className="flex flex-col items-center gap-2 rounded-lg p-2 text-center transition-colors hover:bg-white/5"
                  >
                    {p.photo ? (
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="h-12 w-12 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium leading-tight">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-text-secondary leading-tight">
                        {p.position}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Changelog Feed */}
        <ChangelogFeed />
      </div>

      {/* Kauzy and Top Contracts */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        {/* Kauzy Widget */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle size={16} className="text-kauza" />
              {t("dashboard.latestKauzy")}
            </h3>
            <Link
              to="/kauzy"
              className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("nav.kauzy")} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(kauzyData?.kauzy || [])
              .filter((k) => k.actors && k.actors.length > 0)
              .slice(0, 8)
              .map((k) => (
                <Link
                  key={k.id}
                  to="/kauzy"
                  className="flex items-start gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-white/5"
                >
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-kauza"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">
                      {k.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {k.actors
                        .slice(0, 3)
                        .map((a) => a.name)
                        .join(", ")}
                      {k.actors.length > 3 && ` +${k.actors.length - 3}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-kauza/20 px-1.5 py-0.5 text-[10px] font-medium text-kauza">
                    {k.actors.length}
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {/* Top Risk Contracts Widget */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={16} className="text-zakazka" />
              {t("dashboard.topContracts") || "Najrizikovejšie zákazky"}
            </h3>
            <Link
              to="/zakazky"
              className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("nav.zakazky")} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(procurement || [])
              .filter((r) => r.flagged && r.riskScore)
              .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
              .slice(0, 6)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {r.contractorName}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.linkedPoliticians?.slice(0, 2).map((p) => (
                        <Link
                          key={p.id}
                          to={`/politik/${p.id}`}
                          className="rounded bg-politician/20 px-1 py-0.5 text-[10px] font-medium text-politician hover:bg-politician/30"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold text-zakazka">
                      {r.amount
                        ? `${(r.amount / 1000).toFixed(0)}k €`
                        : ""}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        (r.riskScore || 0) > 60
                          ? "bg-red-500/20 text-red-400"
                          : (r.riskScore || 0) > 40
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {Math.round(r.riskScore || 0)}
                    </span>
                  </div>
                  {r.detailUrl && (
                    <a
                      href={r.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-text-secondary hover:text-primary"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
