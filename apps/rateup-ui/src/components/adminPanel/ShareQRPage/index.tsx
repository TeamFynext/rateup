import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuid } from "uuid";

import { generateWaMessageUrl } from "@/utils/whatsapp/wa_url.tsx";

import ShareQR from "../../Survey/ShareSurvey/ShareQR/index.tsx";
import LinkWithCopyBtn from "./LinkWithCopyBtn/index.tsx";
import ResourceSelector from "./ResourceSelector/index.tsx";

const frontendUrl = import.meta.env.VITE_FRONTEND_URL;

function ShareQRPage() {
  const [resource, setResource] = useState<string>("Web Survey");
  const [link, setLink] = useState<string | null>(null);
  const { t: translations } = useTranslation();
  const handleGenerateBtnClick = useCallback(() => {
    switch (resource) {
      case "Web Survey": {
        const surveyTeamMapId = uuid();
        const link = `${frontendUrl}/public/survey/${surveyTeamMapId}`;
        setLink(link);
        break;
      }
      case "Whatsapp Survey": {
        const surveyTeamMapId = uuid();
        const link = generateWaMessageUrl("PHONE_NUMBER", surveyTeamMapId);
        setLink(link);
        break;
      }
      case "Menu": {
        const newMenuID = uuid();
        const surveyTeamMapId = uuid();
        const link = `${frontendUrl}}/public/menu/${newMenuID}/feedback/${surveyTeamMapId}`;
        setLink(link);
        break;
      }
    }
  }, [resource]);

  useEffect(() => {
    handleGenerateBtnClick();
  }, [resource]);

  return (
    <div>
      <h1>{translations("Share QR")}</h1>
      <ResourceSelector
        resource={resource}
        setResource={setResource}
        onGenerateBtnClick={handleGenerateBtnClick}
      />
      {link && (
        <div>
          <LinkWithCopyBtn link={link} />
          <ShareQR url={link} title={`New-${resource}`} isPublished={true} />
        </div>
      )}
    </div>
  );
}

export default ShareQRPage;
