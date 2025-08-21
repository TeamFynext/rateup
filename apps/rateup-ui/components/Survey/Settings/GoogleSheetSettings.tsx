import { useTranslations } from "next-intl";

import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";

import PaperLayout from "../../styled/Layouts/PaperLayout";

const GoogleSheetSettings = ({ spreadSheetId }) => {
  const translations = useTranslations();
  const url = spreadSheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadSheetId}`
    : null;
  return url ? (
    <PaperLayout className={`section-div`}>
      <h2 className={"settings-section-heading"}>
        {translations("GoogleSheet")}
      </h2>
      <ContainedTextField
        rightSection={<ApiCopyButton value={url} />}
        label={translations("Sheet Url")}
        value={url}
        readOnly
      />
    </PaperLayout>
  ) : null;
};

export default GoogleSheetSettings;
