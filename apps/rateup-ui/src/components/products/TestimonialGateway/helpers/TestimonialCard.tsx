import { Star } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils.ts";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  rating?: number;
  channel?: "email" | "whatsapp" | "linkedin";
  verified?: boolean;
}

export default function TestimonialCard({
  quote,
  author,
  role,
  company,
  rating = 5,
  channel,
  verified = false,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="relative bg-white/80 dark:bg-black/40 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-xl p-6 md:p-8 rounded-2xl max-w-xl mx-auto space-y-5"
    >
      {/* Quote */}
      <p className="text-lg md:text-xl text-gray-800 dark:text-gray-100 leading-relaxed font-medium">
        “{quote}”
      </p>

      {/* Rating */}
      {rating && (
        <div className="flex items-center gap-1 text-yellow-400">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-yellow-400" />
          ))}
        </div>
      )}

      {/* Author Info */}
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-full bg-[#1c518e] flex items-center justify-center text-white font-semibold text-sm shadow-inner">
          {author
            .split(" ")
            .map((word) => word[0])
            .join("")}
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {author} {verified && <span className="ml-1 text-sm text-green-500">✔</span>}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {role} @ {company}
          </p>
        </div>
      </div>

      {/* Channel Badge */}
      {channel && (
        <span
          className={cn(
            "absolute top-4 right-4 text-xs px-2 py-1 rounded-full font-medium",
            channel === "whatsapp" && "bg-green-500/10 text-green-600",
            channel === "email" && "bg-blue-500/10 text-blue-600",
            channel === "linkedin" && "bg-indigo-500/10 text-indigo-600",
          )}
        >
          {channel}
        </span>
      )}
    </motion.div>
  );
}
