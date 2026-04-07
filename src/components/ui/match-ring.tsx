export function MatchRing({
  score,
  size = 58,
}: {
  score: number;
  size?: number;
}) {
  const color =
    score >= 90 ? "#4f46e5"
    : score >= 75 ? "#3b82f6"
    : score >= 60 ? "#0891b2"
    : score >= 40 ? "#d97706"
    : "#ef4444";

  const gradientId = `ring-${score}-${size}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        {/* Track */}
        <circle
          cx="18" cy="18" r="15.5"
          fill="none"
          stroke="#e8e8ec"
          strokeWidth="2.4"
        />
        {/* Gradient */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        {/* Score arc */}
        <circle
          cx="18" cy="18" r="15.5"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeDasharray={`${score} ${100 - score}`}
          strokeLinecap="round"
          strokeWidth="2.8"
          style={{
            filter: `drop-shadow(0 0 3px ${color}25)`,
            transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-extrabold text-on-surface"
          style={{ fontSize: size < 50 ? "8px" : size > 80 ? "16px" : "11px" }}
        >
          {Math.round(score)}%
        </span>
      </div>
    </div>
  );
}
