interface LoadingSkeletonProps {
  count?: number;
  type?: "card" | "row" | "text";
}

export const LoadingSkeleton = ({
  count = 6,
  type = "card",
}: LoadingSkeletonProps) => {
  if (type === "text") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-white/10" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    );
  }

  if (type === "row") {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-white/5" />
      ))}
    </div>
  );
};
