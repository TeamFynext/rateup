import ShowcaseSheet from "../shared/ShowcaseSheet";
import CampaignMock from "./campaign-mock/CampaignMock";

export default function Showcase() {
  return (
    <ShowcaseSheet
      eyebrow="A campaign"
      icon={
        <>
          <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      }
      title="Sent to thousands. Accounted for, one by one."
      lead="Every recipient moves through the same funnel, and every failure comes with Meta's reason."
      caption="Illustrative campaign."
    >
      <CampaignMock />
    </ShowcaseSheet>
  );
}
