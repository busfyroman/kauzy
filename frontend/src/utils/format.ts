export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("sk-SK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return date;
  }
};

export const getRiskColor = (score: number | null | undefined): string => {
  if (score == null) return "text-text-secondary";
  if (score <= 30) return "text-risk-low";
  if (score <= 60) return "text-risk-medium";
  return "text-risk-high";
};

export const getRiskBgColor = (score: number | null | undefined): string => {
  if (score == null) return "bg-gray-500/20";
  if (score <= 30) return "bg-risk-low/20";
  if (score <= 60) return "bg-risk-medium/20";
  return "bg-risk-high/20";
};

export const getTypeColor = (
  type: "politician" | "company" | "kauza" | "zakazka",
): string => {
  const colors = {
    politician: "text-politician",
    company: "text-company",
    kauza: "text-kauza",
    zakazka: "text-zakazka",
  };
  return colors[type] || "text-text-secondary";
};

export const getTypeBgColor = (
  type: "politician" | "company" | "kauza" | "zakazka",
): string => {
  const colors = {
    politician: "bg-politician/20",
    company: "bg-company/20",
    kauza: "bg-kauza/20",
    zakazka: "bg-zakazka/20",
  };
  return colors[type] || "bg-gray-500/20";
};
