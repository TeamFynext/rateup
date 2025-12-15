import { useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Clock, Copy, LinkIcon, MousePointerClick } from "lucide-react";
import { useTranslations } from "next-intl";

import TimeSinceText from "../DateAndTime/TimeSinceText";
import { Button } from "../ui/button";

function LCard({ sortedValue, shareURL, baseURL, MoreOptions }) {
  const [copiedId, setCopiedId] = useState(false);
  const translations = useTranslations();
  const handleCopy = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
      {sortedValue?.map((v) => (
        <div
          key={v?.id}
          className="relative border rounded-xl flex flex-col gap-1 cursor-pointer shadow-sm hover:scale-[1.02] transition-all duration-300"
          onClick={() => router.push(`${baseURL}/${v?.shortUrlId}`)}
        >
          <div className="absolute top-3 right-3 z-10">
            <MoreOptions shortUrlId={v?.shortUrlId} id={v?.id} name={v?.name} />
          </div>
          <div className="flex flex-col items-center justify-center gap-3 p-4">
            <h1 className="text-base">{v?.name}</h1>
            <div className="flex flex-col items-center justify-center gap-1">
              <p
                className={`text-[11px] border px-2 py-0.5 rounded-full ${v?.isPublished ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
              >
                {v?.isPublished
                  ? translations("ACTIVE")
                  : translations("INACTIVE")}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {translations("Created")}{" "}
                  <TimeSinceText isoDateString={v?.createdAt} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="border-t">
              <div className="flex flex-col items-center text-center py-2 px-4">
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-100">
                  <MousePointerClick className="w-4 h-4" />
                  <span>{translations("Clicks")}</span>
                </div>
                <span className="text-lg font-semibold">
                  {v?.visitorsCount || 0}
                </span>
              </div>
            </div>

            <div className="rounded-xl">
              <div className="flex items-center gap-2 border-t p-2">
                <div className="flex-1 flex items-center gap-2 min-w-0 px-2.5">
                  <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span
                    className={`text-xs text-gray-500 truncate ${v?.isPublished ? "opacity-100" : "opacity-50 cursor-not-allowed"}`}
                  >
                    {`${shareURL}/${v?.shortUrlId}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  disabled={!v?.isPublished}
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:text-primary border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    !v?.isPublished && e.preventDefault();
                    handleCopy(v?.id, `${shareURL}/${v?.shortUrlId}`);
                  }}
                >
                  {copiedId === v?.id ? (
                    <Check className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default LCard;
