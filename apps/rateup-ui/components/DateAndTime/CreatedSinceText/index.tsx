"use client";

import { Clock } from "lucide-react";
import { useExtracted } from "next-intl";

import TimeSinceText from "../TimeSinceText";

function CreatedSinceText({ createdAt }) {
  const translations = useExtracted();
  return (
    <div className="flex items-center justify-center gap-1">
      {/* <Clock className="w-4 h-4" /> */}
      <p className="text-xs text-gray-500">
        {translations("Created")} {<TimeSinceText isoDateString={createdAt} />}
      </p>
    </div>
  );
}

export default CreatedSinceText;
