import { IconCheck, IconCopy, IconEye, IconQrcode } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { ActionCard } from "@/components/common/action-card.tsx";

import MoreOptionsMenu from "./MoreOptionsMenu.tsx";

function GeneratedQrCard({
  name,
  shortUrlId,
  id,
  createdAt,
  scans,
}: {
  name: string;
  shortUrlId: string;
  id: string;
  createdAt: string | Date;
  scans: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const qrUrl = `${import.meta.env.VITE_FRONTEND_URL}/qr/${shortUrlId}`;
  const handleCardClick = useCallback(() => {
    if (isModalOpen) return;
    navigate({
      to: `/dashboard/qrCreator/${shortUrlId}`,
    });
  }, [navigate, shortUrlId, isModalOpen]);

  const [copied, setCopied] = useState(false);
  const { t: translations } = useTranslation();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrPreview = (
    <div className={"w-full flex justify-center"}>
      <IconQrcode className="w-15 h-15 text-primary group-hover:scale-110 transition-transform duration-300" />
    </div>
  );

  const actions = (
    <MoreOptionsMenu shortUrlId={shortUrlId} name={name} onModalOpen={setIsModalOpen} />
  );

  const footerLeft = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded-md text-gray-600 dark:text-gray-300 text-xs">
        <IconEye className="w-3.5 h-3.5" />
        <span>{scans}</span>
      </div>

      <button
        className="p-1.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        title="copy"
        onClick={handleCopy}
      >
        {copied ? (
          <IconCheck className="w-3.5 h-3.5 text-gray-400 transition-all duration-300" />
        ) : (
          <IconCopy className="w-3.5 h-3.5 text-gray-400 transition-all duration-300" />
        )}
        <div className="text-xs transition-all duration-300 text-gray-600 dark:text-gray-400">
          {copied ? translations("copied") : translations("copy")}
        </div>
      </button>
    </div>
  );

  return (
    <ActionCard
      key={id}
      title={name}
      actions={actions}
      content={qrPreview}
      footerLeft={footerLeft}
      createdAt={createdAt}
      onClick={handleCardClick}
    />
  );
}

export default GeneratedQrCard;
