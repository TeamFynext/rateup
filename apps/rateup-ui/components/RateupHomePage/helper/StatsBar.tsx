interface Stat {
  value: string;
  label: string;
  gradient?: boolean; // renders value with blue gradient
}

interface StatsBarProps {
  stats?: Stat[];
  className?: string;
}

const defaultStats: Stat[] = [
  { value: "100+", label: "Active Clients", gradient: true },
  { value: "5×", label: "Average ROI", gradient: true },
  { value: "3987+", label: "Reviews Collected", gradient: true },
  { value: "98%", label: "Customer Satisfaction", gradient: true },
];

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "linear-gradient(to right, #2D74E0, #66D7FF)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

export default function StatsBar({
  stats = defaultStats,
  className = "",
}: StatsBarProps) {
  return (
    <div
      className={[
        " mx-8 xl:mx-29 rounded-[40px] bg-[#000A1F]",
        "grid grid-cols-2 lg:grid-cols-4",
        "divide-y divide-x divide-[#004F98]",
        "lg:divide-y-0",
        className,
      ].join(" ")}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          className={[
            "flex flex-col items-center justify-center",
            "py-7 px-6 lg:py-0 lg:h-40",
            // remove top border on first two mobile items
            i < 2 ? "border-t-0" : "",
            // remove left border on left-column mobile items
            i % 2 === 0 ? "border-l-0" : "",
          ].join(" ")}
        >
          {/* Big value */}
          <span className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
            <GradientText>{stat.value}</GradientText>
          </span>

          {/* Label */}
          <span className="text-light-blue-5 text-xs lg:text-base font-medium mt-1 tracking-wide text-center">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
