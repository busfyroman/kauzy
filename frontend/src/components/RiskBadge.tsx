import { getRiskColor, getRiskBgColor } from "@/utils/format";

interface RiskBadgeProps {
  score: number | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export const RiskBadge = ({
  score,
  showLabel = true,
  size = "sm",
}: RiskBadgeProps) => {
  if (score == null) return null;

  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${getRiskColor(score)} ${getRiskBgColor(score)} ${sizeClasses}`}
      title={`Skóre rizika: ${score}/100`}
    >
      <span className="font-bold">{Math.round(score)}</span>
      {showLabel && <span>/100</span>}
    </span>
  );
};
