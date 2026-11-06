import ShowcaseSheet from "../shared/ShowcaseSheet";
import MemberMock from "./member-mock/MemberMock";

export default function Showcase() {
  return (
    <ShowcaseSheet
      eyebrow="The member's side"
      icon={<path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />}
      title="Join in one message. Earn at every visit."
      lead="The customer's card, balance and rewards live in their WhatsApp. Your team scans and adds points at the counter."
    >
      <MemberMock />
    </ShowcaseSheet>
  );
}
