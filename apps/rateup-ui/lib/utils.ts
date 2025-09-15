"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const getBrowserId = (): string => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("browserId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("browserId", id);
  }
  return id;
};
