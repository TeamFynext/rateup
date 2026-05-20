"use client";

import { Image } from "@unpic/react";
import { useTranslation } from "react-i18next";

interface NothingFoundProps {
  text: string;
  className?: string;
}

export default function NothingFound({
  className,
  text,
}: Readonly<NothingFoundProps>) {
  const { t: translations } = useTranslation();

  return (
    <div
      className={`flex h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center ${className ?? ""}`}
    >
      <Image
        src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/nodata.svg`}
        alt={translations("Nothing found")}
        width={140}
        height={140}
        className="opacity-35"
      />
      <p className="text-sm font-medium text-muted-foreground">
        {text ?? translations("Nothing found")}
      </p>
    </div>
  );
}
