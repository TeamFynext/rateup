import { useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Clock, Copy, Eye, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import TimeSinceText from "../DateAndTime/TimeSinceText";
import { Button } from "../ui/button";

function LCard({ sortedValue, shareURL, Icon, baseURL, MoreOptions }) {
  const [copiedId, setCopiedId] = useState(false);
  const translations = useTranslations();
  const handleCopy = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const router = useRouter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedValue?.map((v) => (
        <div
          key={v?.id}
          className="rounded-xl border hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer relative transform hover:scale-[1.02] flex flex-col gap-2"
          onClick={() => router.push(`${baseURL}/${v?.shortUrlId}`)}
        >
          {/* Dropdown Menu - Top Right Corner */}
          <div className="absolute top-3 right-3 z-10">
            <MoreOptions shortUrlId={v?.shortUrlId} id={v?.id} name={v?.name} />
          </div>

          {/* Landing Page Preview/Hero Section */}
          <div className="relative h-32 dark:bg-transparent bg-blue-50/30 border-b overflow-hidden">
            {/* Large Icon */}
            <div className="relative h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-primary rounded-2xl shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Icon className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Status Badge - Top Left */}
            <div className="absolute top-3 left-3">
              {v?.isPublished === true ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/90 backdrop-blur-sm shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  <span className="text-[10px] font-semibold text-white uppercase tracking-wide">
                    {translations("Active")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/90 backdrop-blur-sm shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  <span className="text-[10px] font-semibold text-white uppercase tracking-wide">
                    {translations("Inactive")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
              {v?.name}
            </h3>
            <div className="dark:bg-transparent flex items-center justify-between px-4 bg-blue-50 rounded-lg p-3 border">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center shadow-sm">
                  <Eye className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  {translations("Views")}
                </span>
              </div>
              <div className="text-xl font-bold text-primary">
                {v?.visitorsCount}
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 min-w-0 rounded-lg px-2.5 py-2 border">
                  <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span
                    className={`text-[10px] text-gray-500 truncate ${v?.isPublished ? "opacity-100" : "opacity-50 cursor-not-allowed"}`}
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
                    <Check className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-500">
              <Clock className="w-3 h-3" />
              <span>
                {translations("Created")}{" "}
                <TimeSinceText isoDateString={v?.createdAt} />
              </span>
            </div>
          </div>

          {/* Hover Effect Overlay */}
          <div className="absolute inset-0 border-2 border-primary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
      ))}
    </div>
  );
}

export default LCard;
