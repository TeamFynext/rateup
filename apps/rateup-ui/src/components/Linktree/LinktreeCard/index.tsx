import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, LinkIcon, MousePointerClick } from "lucide-react";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { ActionCard } from "@/components/common/action-card.tsx";
import { Button } from "@/components/ui/button.tsx";

import MoreOptionsMenu from "./MoreOptionsMenu.tsx";

interface LinktreeCardProps {
  readonly id: string;
  readonly name: string;
  readonly shortUrlId: string;
  readonly createdAt: string | Date;
  readonly visitorsCount: number;
  readonly isPublished: boolean;
  readonly shareUrl: string;
}

function LinktreeCard({
  id,
  name,
  shortUrlId,
  createdAt,
  visitorsCount,
  isPublished,
  shareUrl,
}: Readonly<LinktreeCardProps>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
  const { t: translations } = useTranslation();
  const fullUrl = `${shareUrl}/${shortUrlId}`;

  const handleCardClick = useCallback(() => {
    if (isModalOpen) return;
    navigate({
      to: `/dashboard/quickAccessLinks/${shortUrlId}`,
    });
  }, [navigate, shortUrlId, isModalOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const actions = (
    <MoreOptionsMenu shortUrlId={shortUrlId} id={id} name={name} onModalOpen={setIsModalOpen} />
  );

  const statusBadge = (
    <p
      className={`text-[11px] border px-2 py-0.5 rounded-full ${
        isPublished ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
      }`}
    >
      {isPublished ? translations("ACTIVE") : translations("INACTIVE")}
    </p>
  );

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex gap-5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <MousePointerClick className="w-4 h-4" />
          <span>{translations("Clicks")}</span>
        </div>
        <span className="text-lg font-semibold">{visitorsCount || 0}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0 px-2.5 flex-1">
        <LinkIcon className="w-3 h-3 text-gray-400 shrink-0" />
        <span
          className={`text-xs text-gray-500 truncate ${
            isPublished ? "opacity-100" : "opacity-50 cursor-not-allowed"
          }`}
        >
          {fullUrl}
        </span>
        <Button
          variant="ghost"
          disabled={!isPublished}
          size="icon"
          className="h-8 w-8 shrink-0 hover:text-primary border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCopy}
        >
          {copiedId ? (
            <Check className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-500" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <ActionCard
      title={name}
      actions={actions}
      content={content}
      footerLeft={statusBadge}
      createdAt={createdAt}
      onClick={handleCardClick}
    />
  );
}

export default LinktreeCard;
