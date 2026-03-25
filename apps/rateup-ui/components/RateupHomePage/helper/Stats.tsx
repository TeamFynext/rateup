type Stat = {
  value: string;
  label: string;
  gradient?: boolean;
};
interface StatsProps {
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
export default function Stats({
  stats = defaultStats,
  className = "",
}: StatsProps) {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md px-8 py-8 md:py-10 shadow-[0_0_50px_-12px_rgba(46,91,255,0.15)] overflow-hidden relative">
          {/* Subtle glow behind the stats */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rateup-blue/10 via-transparent to-transparent"></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10 text-center">
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
        </div>
      </div>
    </section>
  );
}
