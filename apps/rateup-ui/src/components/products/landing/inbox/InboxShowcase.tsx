import ShowcaseSheet from "../shared/ShowcaseSheet";
import InboxMock from "./inbox-mock/InboxMock";

export default function InboxShowcase() {
  return (
    <ShowcaseSheet
      eyebrow="The inbox"
      icon={
        <>
          <path d="M3.5 13.5 6 5.5h12l2.5 8v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
          <path d="M3.5 13.5h4.6l1.2 2.4h5.4l1.2-2.4h4.6" />
        </>
      }
      title="One queue for every channel your customers use."
      lead="Each conversation is a ticket — numbered, assigned, tagged and closed with a result."
    >
      <InboxMock />
    </ShowcaseSheet>
  );
}
