"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { useTranslations } from "next-intl";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueColor: string;
  iconBgColor: string;
  OnClickAction?: any;
}

export const StatCards = ({
  label,
  value,
  icon,
  valueColor,
  iconBgColor,
  OnClickAction,
}: StatCardProps) => {
  const translations = useTranslations();
  const router = useRouter();
  return (
    <div
      className="bg-white cursor-pointer shadow rounded-lg p-4 flex items-center border border-[#E2E5ED] justify-between transition-all duration-300 hover:border-[rgba(0,79,152,0.3)] hover:shadow-[0_0_2px_1px_rgba(0,79,152,0.3)] ease-in-out hover:scale-[1.03]"
      onClick={() => router.push(`${OnClickAction}`)}
    >
      <div>
        <div className="text-sm font-semibold text-[#343A40] mt-1">
          {translations(`${label}`)}
        </div>
        <div className={`text-4xl font-bold`} style={{ color: valueColor }}>
          {value}
        </div>
      </div>
      <div
        className="p-1.5 rounded-md"
        style={{ backgroundColor: iconBgColor }}
      >
        {icon}
      </div>
    </div>
  );
};

export const StatCardSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg p-4 flex items-center border border-[#E2E5ED] justify-between animate-pulse">
      <div>
        <div className="h-4 w-24 bg-[#E2E5ED] rounded mb-2"></div>
        <div className="h-8 w-20 bg-[#E2E5ED] rounded"></div>
      </div>
      <div className="p-1.5 rounded-md bg-[#E2E5ED] w-10 h-10"></div>
    </div>
  );
};
