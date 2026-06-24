import { useTranslation } from "react-i18next";

import TimeSinceText from "../TimeSinceText.tsx";

function CreatedSinceText({ createdAt }) {
  const { t: translations } = useTranslation();
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
      {/* <Clock className="w-4 h-4" /> */}
      <p className="truncate whitespace-nowrap text-xs text-gray-500">
        {translations("Created")} {<TimeSinceText isoDateString={createdAt} />}
      </p>
    </div>
  );
}

export default CreatedSinceText;
