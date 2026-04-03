import { useTranslation } from "react-i18next";
import { useData } from "@/hooks/useData";
import type { ChangelogEntry } from "@/types";
import { formatDate } from "@/utils/format";
import {
  Plus,
  Link2,
  AlertTriangle,
  ArrowRight,
  Minus,
} from "lucide-react";

const typeIcons: Record<string, typeof Plus> = {
  new_politician: Plus,
  new_company_link: Link2,
  new_kauza_link: AlertTriangle,
  position_change: ArrowRight,
  removed_politician: Minus,
};

const severityColors: Record<string, string> = {
  high: "border-l-kauza",
  medium: "border-l-zakazka",
  low: "border-l-border-custom",
};

export const ChangelogFeed = () => {
  const { t } = useTranslation();
  const { data: changelog } = useData<ChangelogEntry[]>("changelog.json");

  if (!changelog || changelog.length === 0) {
    return (
      <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
        <h3 className="mb-3 text-sm font-semibold">{t("dashboard.whatsNew")}</h3>
        <p className="text-sm text-text-secondary">{t("common.noData")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-custom bg-card p-4 .light:border-border-light .light:bg-card-light">
      <h3 className="mb-3 text-sm font-semibold">{t("dashboard.whatsNew")}</h3>
      <div className="flex flex-col gap-2">
        {changelog.slice(0, 10).map((entry, i) => {
          const Icon = typeIcons[entry.type] || Plus;
          return (
            <div
              key={`${entry.date}-${i}`}
              className={`flex items-start gap-2 border-l-2 pl-3 text-sm ${severityColors[entry.severity] || "border-l-border-custom"}`}
            >
              <Icon size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{entry.detail}</p>
                <p className="text-xs text-text-secondary">
                  {formatDate(entry.date)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
