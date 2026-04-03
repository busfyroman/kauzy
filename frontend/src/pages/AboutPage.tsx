import { useTranslation } from "react-i18next";
import {
  Globe,
  Database,
  Shield,
  ExternalLink,
} from "lucide-react";

const dataSources = [
  {
    name: "vlada.gov.sk",
    url: "https://www.vlada.gov.sk/vlada-sr/clenovia-vlady/",
    description: { sk: "Členovia vlády SR", en: "Government members" },
  },
  {
    name: "nrsr.sk",
    url: "https://www.nrsr.sk/web/?SectionId=60",
    description: { sk: "Poslanci NR SR", en: "Parliament members" },
  },
  {
    name: "Wikidata",
    url: "https://query.wikidata.org/",
    description: { sk: "Údaje o manželoch/kách politikov", en: "Spouse data" },
  },
  {
    name: "ORSR",
    url: "https://www.orsr.sk/",
    description: { sk: "Obchodný register SR", en: "Commercial register" },
  },
  {
    name: "RPVS",
    url: "https://rpvs.gov.sk/rpvs/",
    description: { sk: "Register partnerov verejného sektora", en: "Public sector partners" },
  },
  {
    name: "kauzy.sk",
    url: "https://kauzy.sk/",
    description: { sk: "Databáza politických káuz", en: "Political scandals database" },
  },
  {
    name: "UVOstat",
    url: "https://www.uvostat.sk/",
    description: { sk: "Verejné obstarávania", en: "Public procurement" },
  },
  {
    name: "CRZ",
    url: "https://www.crz.gov.sk/",
    description: { sk: "Centrálny register zmlúv", en: "Central contract register" },
  },
];

export const AboutPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "sk" | "en";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">{t("about.title")}</h1>

      {/* Methodology */}
      <section className="rounded-xl border border-border-custom bg-card p-6 .light:border-border-light .light:bg-card-light">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Database size={20} className="text-primary" />
          {t("about.methodology")}
        </h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            {lang === "sk"
              ? "Dáta sú zbierané automaticky z verejne dostupných vládnych registrov a otvorených dátových zdrojov. Scraper beží týždenne cez GitHub Actions a generuje statické JSON súbory."
              : "Data is collected automatically from publicly available government registries and open data sources. The scraper runs weekly via GitHub Actions and generates static JSON files."}
          </p>
          <p>
            {lang === "sk"
              ? "Prepojenia medzi politikmi a firmami sú identifikované na základe mena v obchodnom registri (ORSR) a registri partnerov verejného sektora (RPVS). Prepojenia cez manžela/ku používajú dáta z Wikidata a sú označené úrovňou istoty (vysoká/stredná/nízka)."
              : "Connections between politicians and companies are identified by name matching in the commercial register (ORSR) and public sector partners register (RPVS). Spouse connections use Wikidata and are labeled with confidence levels (high/medium/low)."}
          </p>
          <p>
            {lang === "sk"
              ? "Skóre rizika (0-100) je vypočítané na základe časovania zákazky, výšky sumy, veku firmy, koncentrácie zákaziek, priamosti prepojenia a transparentnosti obstarávacieho procesu."
              : "Risk scores (0-100) are computed based on contract timing, value, company age, contract concentration, directness of connection, and procurement procedure transparency."}
          </p>
        </div>
      </section>

      {/* Data Sources */}
      <section className="rounded-xl border border-border-custom bg-card p-6 .light:border-border-light .light:bg-card-light">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Globe size={20} className="text-company" />
          {t("about.sources")}
        </h2>
        <div className="space-y-2">
          {dataSources.map((source) => (
            <a
              key={source.name}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm transition-colors hover:bg-white/10"
            >
              <div>
                <p className="font-medium">{source.name}</p>
                <p className="text-xs text-text-secondary">
                  {source.description[lang] || source.description.sk}
                </p>
              </div>
              <ExternalLink size={14} className="text-text-secondary" />
            </a>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="rounded-xl border border-kauza/30 bg-kauza/5 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Shield size={20} className="text-kauza" />
          {t("about.disclaimer")}
        </h2>
        <p className="text-sm text-text-secondary">
          {t("about.disclaimerText")}
        </p>
      </section>
    </div>
  );
};
