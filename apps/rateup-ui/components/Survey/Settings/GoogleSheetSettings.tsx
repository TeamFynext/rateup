import PaperLayout from "../../styled/Layouts/PaperLayout";
import { CopyLinkComponent } from "../ShareSurvey/ShareSurvey";

const GoogleSheetSettings = ({ spreadSheetId }) => {
  const url = spreadSheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadSheetId}`
    : null;
  return url ? (
    <PaperLayout className={`section-div`}>
      <h2 className={"settings-section-heading"}>GoogleSheet</h2>
      <CopyLinkComponent value={url} buttonRadius={"lg"} label="Sheet Url" />
    </PaperLayout>
  ) : null;
};

export default GoogleSheetSettings;
