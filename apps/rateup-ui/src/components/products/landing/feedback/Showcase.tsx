import ShowcaseSheet from "../shared/ShowcaseSheet";
import FeedbackMock from "./feedback-mock/FeedbackMock";

export default function Showcase() {
  return (
    <ShowcaseSheet
      eyebrow="In the chat"
      icon={<path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />}
      title="Thirty seconds, without leaving WhatsApp."
      lead="The form opens inside the chat. What happens next depends on the answer."
    >
      <FeedbackMock />
    </ShowcaseSheet>
  );
}
