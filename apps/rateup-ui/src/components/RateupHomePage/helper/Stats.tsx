import { GradientText } from "../components/btn.tsx";

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

export default function Stats({
  stats = defaultStats,
  className = "",
}: StatsProps) {
  return (
    <section className="py-0 pb-4">
      <div className="mx-8 xl:mx-auto xl:max-w-6xl xl:w-[calc(100%-4rem)]">
        <div className="rounded-[32px] bg-[#000A1F] px-4 py-0 overflow-hidden relative">
          <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-[#004F98] text-center">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={[
                  "flex flex-col items-center justify-center",
                  "py-5 px-6 lg:py-0 lg:h-28",
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
