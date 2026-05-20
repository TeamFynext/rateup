import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStringColor = (string: string) => {
  const colors = [
    {
      bg: "bg-linear-to-br from-blue-500 to-blue-600",
      ring: "ring-blue-200",
    },
    {
      bg: "bg-linear-to-br from-purple-500 to-purple-600",
      ring: "ring-purple-200",
    },
    {
      bg: "bg-linear-to-br from-pink-500 to-pink-600",
      ring: "ring-pink-200",
    },
    {
      bg: "bg-linear-to-br from-orange-500 to-orange-600",
      ring: "ring-orange-200",
    },
    {
      bg: "bg-linear-to-br from-green-500 to-green-600",
      ring: "ring-green-200",
    },
    {
      bg: "bg-linear-to-br from-teal-500 to-teal-600",
      ring: "ring-teal-200",
    },
    {
      bg: "bg-linear-to-br from-indigo-500 to-indigo-600",
      ring: "ring-indigo-200",
    },
    { bg: "bg-linear-to-br from-red-500 to-red-600", ring: "ring-red-200" },
    {
      bg: "bg-linear-to-br from-cyan-500 to-cyan-600",
      ring: "ring-cyan-200",
    },
    {
      bg: "bg-linear-to-br from-emerald-500 to-emerald-600",
      ring: "ring-emerald-200",
    },
    {
      bg: "bg-linear-to-br from-violet-500 to-violet-600",
      ring: "ring-violet-200",
    },
    {
      bg: "bg-linear-to-br from-fuchsia-500 to-fuchsia-600",
      ring: "ring-fuchsia-200",
    },
  ];

  let hash = 0;
  for (let i = 0; i < string?.length; i++) {
    hash = (string?.codePointAt(i) || 0) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const getInitials = (name: string) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
