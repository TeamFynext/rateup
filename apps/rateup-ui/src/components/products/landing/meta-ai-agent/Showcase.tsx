import ShowcaseSheet from "../shared/ShowcaseSheet";
import AgentMock from "./agent-mock/AgentMock";

export default function Showcase() {
  return (
    <ShowcaseSheet
      eyebrow="The agent"
      icon={
        <>
          <rect x="4" y="7" width="16" height="12" rx="3" />
          <path d="M12 7V4M9 12h.01M15 12h.01M9.5 15.5h5" />
        </>
      }
      title="Answers what it knows. Hands over what it shouldn't."
      lead="It replies from your knowledge, looks things up through your tools, and steps aside for your team — in the same inbox they already work in."
    >
      <AgentMock />
    </ShowcaseSheet>
  );
}
