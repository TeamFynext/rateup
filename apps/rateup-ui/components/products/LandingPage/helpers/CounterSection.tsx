"use client";

import { useEffect, useRef, useState } from "react";

import { motion, useInView } from "motion/react";

type Stat = {
  label: string;
  value: number;
  suffix?: string;
};

const stats: Stat[] = [
  { label: "Clients Served", value: 75, suffix: "+" },
  { label: "Customer Satisfaction", value: 98, suffix: "%" },
  { label: "Engagement Increase", value: 25, suffix: "%" },
  { label: "Time Saved", value: 40, suffix: "%" },
];

function AnimatedCounter({
  value,
  suffix,
}: {
  value: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const start = 0;
    const duration = 1000; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentValue = Math.floor(start + eased * (value - start));
      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count}
      {suffix && <span className="text-[#3072bc]">{suffix}</span>}
    </span>
  );
}

export default function CounterSection() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:mt-24 max-w-5xl mx-auto">
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: idx * 0.2 }}
        >
          <p className="text-4xl sm:text-5xl font-bold">
            <AnimatedCounter value={stat.value} suffix={stat.suffix} />
          </p>
          <p className="text-lg mt-2 font-medium">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
