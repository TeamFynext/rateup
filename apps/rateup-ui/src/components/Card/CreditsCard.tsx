import React from "react";
import { useTranslation } from "react-i18next";

type CreditsCardProps = {
  enableCredits: boolean;
  url?: string | File | null;
  children: React.ReactNode;
  sx?: React.CSSProperties;
  fz?: number | string;
  pl?: number | string;
};

export const CreditsCard = ({
  enableCredits,
  url,
  children,
  sx = undefined,
  fz = 9,
  pl = 0,
}: CreditsCardProps) => {
  let author = "";
  let username = "";
  if (typeof url === "string" && url.includes("?")) {
    const params = new URLSearchParams(url?.split("?")[1]);
    author = params.get("author") ?? "";
    username = params.get("username") ?? "";
  }
  const { t: translations } = useTranslation();
  return (
    <div className="relative m-0 h-full w-full p-0" style={sx}>
      {children}
      {enableCredits && (
        <span
          className="absolute bottom-0 left-0 w-full text-white max-[480px]:w-30"
          style={{
            fontSize: fz,
            paddingLeft: pl || (fz === 9 ? "0.5rem" : 0),
            paddingRight: fz === 9 ? "0.5rem" : 0,
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
          }}
        >
          {translations("Photo by")}
          <a
            href={`https://unsplash.com/@${username}?utm_source=Rateup&utm_medium=referral`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: fz }}
            className="text-white"
          >
            {author}
          </a>{" "}
          {translations("on")}
          <a
            href="https://unsplash.com/?utm_source=Rateup&utm_medium=referral"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: fz }}
            className="text-white"
          >
            {translations("Unsplash")}
          </a>
        </span>
      )}
    </div>
  );
};
