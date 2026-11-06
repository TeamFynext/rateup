import ShowcaseSheet from "../shared/ShowcaseSheet";
import BoardMock from "./board-mock/BoardMock";

export default function Showcase() {
  return (
    <ShowcaseSheet
      eyebrow="The board"
      icon={
        <>
          <rect x="3" y="4" width="5" height="16" rx="1.5" />
          <rect x="10" y="4" width="5" height="11" rx="1.5" />
          <rect x="17" y="4" width="4" height="7" rx="1.5" />
        </>
      }
      title="Every lead, where you can see it."
      lead="Drag a card to the next stage. Each one shows who owns it, what happens next and how long it has waited."
      caption="Illustrative board."
    >
      <BoardMock />
    </ShowcaseSheet>
  );
}
