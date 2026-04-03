import { Link } from "react-router-dom";
import { Building2, AlertTriangle, FileText, Heart } from "lucide-react";
import type { Politician } from "@/types";

interface PoliticianCardProps {
  politician: Politician;
}

export const PoliticianCard = ({ politician }: PoliticianCardProps) => {

  return (
    <Link
      to={`/politik/${politician.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border-custom bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 .light:border-border-light .light:bg-card-light"
    >
      <div className="flex items-start gap-3 p-4">
        {politician.photo ? (
          <img
            src={politician.photo}
            alt={politician.name}
            className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
            {politician.name.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold group-hover:text-primary">
            {politician.titles && (
              <span className="font-normal text-text-secondary">
                {politician.titles}{" "}
              </span>
            )}
            {politician.name}
          </h3>
          <p className="truncate text-xs text-text-secondary">
            {politician.position}
          </p>
          {politician.party && (
            <p className="mt-0.5 text-xs text-primary/80">{politician.party}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 border-t border-border-custom px-4 py-2 text-xs text-text-secondary .light:border-border-light">
        {politician.companies.length > 0 && (
          <span className="flex items-center gap-1">
            <Building2 size={12} className="text-company" />
            {politician.companies.length}
          </span>
        )}
        {politician.spouseCompanies.length > 0 && (
          <span className="flex items-center gap-1">
            <Heart size={12} className="text-pink-400" />
            {politician.spouseCompanies.length}
          </span>
        )}
        {politician.kauzy.length > 0 && (
          <span className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-kauza" />
            {politician.kauzy.length}
          </span>
        )}
        {politician.procurement.length > 0 && (
          <span className="flex items-center gap-1">
            <FileText size={12} className="text-zakazka" />
            {politician.procurement.length}
          </span>
        )}
      </div>
    </Link>
  );
};
