"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import TimeSinceText from "../TimeSinceText";

function CreatedSinceText({ createdAt }) {
  const translations = useTranslations();
  return (
    <div className="flex items-center justify-center gap-1">
      <Clock className="w-4 h-4" />
      <p>
        {translations("Created")} {<TimeSinceText isoDateString={createdAt} />}
      </p>
    </div>
  );
}

export default CreatedSinceText;
