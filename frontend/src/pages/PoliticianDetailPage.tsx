import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  AlertTriangle,
  FileText,
  Heart,
  GraduationCap,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { useData } from "@/hooks/useData";
import { RiskBadge } from "@/components/RiskBadge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Politician, Company, KauzyData, ProcurementRecord } from "@/types";

export const PoliticianDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: politicians, loading } = useData<Politician[]>("politicians.json");
  const { data: companies } = useData<Company[]>("companies.json");
  const { data: kauzyData } = useData<KauzyData>("kauzy.json");
  const { data: procurement } = useData<ProcurementRecord[]>("procurement.json");

  const politician = useMemo(
    () => (politicians || []).find((p) => p.id === id),
    [politicians, id],
  );

  const linkedCompanies = useMemo(
    () =>
      (companies || []).filter((c) =>
        politician?.companies.includes(c.ico),
      ),
    [companies, politician],
  );

  const linkedKauzy = useMemo(() => {
    const slugs = politician?.kauzy || [];
    return (kauzyData?.kauzy || []).filter((k) => slugs.includes(k.id));
  }, [kauzyData, politician]);

  const linkedProcurement = useMemo(() => {
    const ids = politician?.procurement || [];
    return (procurement || []).filter((r) => ids.includes(r.id));
  }, [procurement, politician]);

  if (loading) return <LoadingSkeleton type="text" count={10} />;
  if (!politician) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-secondary">{t("common.noData")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {politician.photo ? (
          <img
            src={politician.photo}
            alt={politician.name}
            className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20 text-3xl font-bold text-primary">
            {politician.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {politician.titles && (
              <span className="font-normal text-text-secondary">
                {politician.titles}{" "}
              </span>
            )}
            {politician.name}
          </h1>
          <p className="text-text-secondary">{politician.position}</p>
          {politician.party && (
            <p className="text-sm text-primary">{politician.party}</p>
          )}
          {politician.birthDate && (
            <p className="text-sm text-text-secondary">
              {formatDate(politician.birthDate)}
            </p>
          )}
          {politician.spouse && (
            <p className="mt-1 flex items-center gap-1 text-sm text-pink-400">
              <Heart size={14} /> {t("politician.spouse")}:{" "}
              {politician.spouse.name}
            </p>
          )}
        </div>
      </div>

      {/* Education & Career */}
      <div className="grid gap-4 md:grid-cols-2">
        {politician.education.length > 0 && (
          <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <GraduationCap size={16} className="text-primary" />
              {t("politician.education")}
            </h3>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              {politician.education.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}
        {politician.career.length > 0 && (
          <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Briefcase size={16} className="text-primary" />
              {t("politician.career")}
            </h3>
            <ul className="space-y-1.5 text-sm text-text-secondary">
              {politician.career.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Companies */}
      {(linkedCompanies.length > 0 || politician.spouseCompanies.length > 0) && (
        <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Building2 size={16} className="text-company" />
            {t("politician.companies")}
          </h3>
          <div className="space-y-2">
            {linkedCompanies.map((c) => (
              <div
                key={c.ico}
                className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-text-secondary">IČO: {c.ico}</p>
                </div>
              </div>
            ))}
            {politician.spouseCompanies.map((sc) => (
              <div
                key={sc.ico}
                className="flex items-center justify-between rounded-lg bg-pink-500/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    <Heart size={12} className="mr-1 inline text-pink-400" />
                    {sc.companyName}
                  </p>
                  <p className="text-xs text-text-secondary">
                    IČO: {sc.ico} • {t("politician.spouse")}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    sc.confidence === "high"
                      ? "bg-risk-low/20 text-risk-low"
                      : sc.confidence === "medium"
                        ? "bg-risk-medium/20 text-risk-medium"
                        : "bg-risk-high/20 text-risk-high"
                  }`}
                >
                  {t(`politician.confidence.${sc.confidence}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kauzy */}
      {linkedKauzy.length > 0 && (
        <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={16} className="text-kauza" />
            {t("politician.kauzy")}
          </h3>
          <div className="space-y-2">
            {linkedKauzy.map((k) => (
              <a
                key={k.id}
                href={k.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm transition-colors hover:bg-white/10"
              >
                <span className="font-medium">{k.title}</span>
                <ExternalLink size={14} className="text-text-secondary" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Procurement */}
      {linkedProcurement.length > 0 && (
        <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FileText size={16} className="text-zakazka" />
            {t("politician.contracts")}
          </h3>
          <div className="space-y-2">
            {linkedProcurement.map((r) => (
              <a
                key={r.id}
                href={r.detailUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm transition-colors hover:bg-white/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.contractorName}</p>
                  <p className="text-xs text-text-secondary">
                    {r.subject?.slice(0, 80)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {r.buyerName} • {r.date}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-zakazka">
                    {formatCurrency(r.amount)}
                  </span>
                  <RiskBadge score={r.riskScore} />
                  {r.detailUrl && (
                    <ExternalLink size={14} className="text-text-secondary" />
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
