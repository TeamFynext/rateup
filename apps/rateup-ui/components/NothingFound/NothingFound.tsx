"use client";

import Image from "next/image";

import { useExtracted } from "next-intl";

interface NothingFoundProps {
  text: string;
  className?: string;
}

export default function NothingFound({
  className,
  text,
}: Readonly<NothingFoundProps>) {
  const translations = useExtracted();

  return (
    <div
      className={`flex h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center ${className ?? ""}`}
    >
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/nodata.svg`}
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
