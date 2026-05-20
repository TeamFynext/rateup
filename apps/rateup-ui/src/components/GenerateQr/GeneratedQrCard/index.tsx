"use client";

import { useCallback, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, Edit, Eye, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";

import CreatedSinceText from "../../DateAndTime/CreatedSinceText/index.tsx";
import MoreOptionsMenu from "./MoreOptionsMenu.tsx";

function GeneratedQrCard({
  name,
  shortUrlId,
  id,
  createdAt,
  isPublished,
  scans,
}) {
  const navigate = useNavigate();
  const qrUrl = `${import.meta.env.VITE_FRONTEND_URL}/qr/${shortUrlId}`;
  const handleCardClick = useCallback(() => {
    navigate({
      to: `/dashboard/qrCreator/${shortUrlId}`,
    });
  }, [navigate, shortUrlId]);

  const [copied, setCopied] = useState(false);
  const { t: translations } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      key={id}
      className="rounded-xl shadow-sm  overflow-hidden  p-0 py-2 px-2"
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold truncate">
              {name.length > 20 ? name.slice(0, 20) + "…" : name}
            </h3>

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-300">
              <CreatedSinceText createdAt={createdAt} />
            </div>
          </div>

          <MoreOptionsMenu shortUrlId={shortUrlId} name={name} />
        </div>

        {/* QR Preview */}
        <div
          className="group w-full aspect-square rounded-xl border flex items-center justify-center relative cursor-pointer dark:bg-transparent bg-gray-50"
          onClick={handleCardClick}
        >
          <div className="flex flex-col items-center justify-center gap-1 ">
            <QrCode className="w-20 h-20 text-gray-400 dark:text-gray-300 group-hover:scale-110 transition-transform duration-300" />
            <span className="flex items-center justify-center gap-1 group-hover:opacity-100 opacity-0 transition-all duration-500 ">
              <Edit className="w-3 h-3 text-gray-500 dark:text-gray-300" />
              <span className="text-gray-500 dark:text-gray-300 text-xs">
                {translations("Click to Edit")}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded-md text-gray-600 dark:text-gray-300 text-xs">
            <Eye className="w-3.5 h-3.5" />
            <span>{scans}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg cursor-pointer flex items-center justify-center gap-1"
              title="copy"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-gray-400 transition-all duration-300" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400 transition-all duration-300" />
              )}
              {copied ? (
                <div className="text-xs text-gray-600 transition-all duration-300 dark:text-gray-400">
                  {translations("copied")}
                </div>
              ) : (
                <div className="text-xs transition-all duration-300 text-gray-600 dark:text-gray-400">
                  {translations("copy")}
                </div>
              )}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GeneratedQrCard;
