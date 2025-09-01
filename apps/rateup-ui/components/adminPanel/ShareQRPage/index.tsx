"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslations } from "next-intl";
import { v4 as uuid } from "uuid";

import { generateWaMessageUrl } from "../../../utils/whatsapp/wa_url";
import ShareQR from "../../Survey/ShareSurvey/ShareQR";
import LinkWithCopyBtn from "./LinkWithCopyBtn";
import ResourceSelector from "./ResourceSelector";

const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

function ShareQRPage() {
  const [resource, setResource] = useState<string>("Web Survey");
  const [link, setLink] = useState(null);
  const translations = useTranslations();
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
