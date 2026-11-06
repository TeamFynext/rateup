import { useTranslation } from "react-i18next";

import { rateupLogo } from "@/utils/constants.ts";

export default function RateupRedirectCard({ className = "" }) {
  const { t: translations } = useTranslation();
  return (
    <div
      className={`flex items-center justify-center bg-white w-[150px] mx-auto px-3 pt-1 ${className}`}
      style={{
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
      }}
    >
      <a href="https://www.rateup.app" className="w-fit text-primary no-underline hover:underline">
        <div className="flex items-end justify-center gap-0">
          <span className="text-[10px] mb-[2px] text-gray-500">{translations("Powered By")}</span>
          <img src={rateupLogo} className="h-[22px] w-auto object-contain" alt="RateUp Logo" />
        </div>
      </a>
    </div>
  );
}
