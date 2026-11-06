import { Link } from "@tanstack/react-router";

import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import { BAND, SectionHead } from "../shared/section";
import { AgentToolMini, StagePickerMini, StageRuleMini } from "./feature-mocks";

export default function Connected() {
  return (
    <section className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Wired to the inbox"
          icon={
            <>
              <path d="M9 15 15 9" />
              <path d="M11 6.5 13 4.5a4 4 0 0 1 5.7 5.7l-2 2M13 17.5l-2 2a4 4 0 0 1-5.7-5.7l2-2" />
            </>
          }
          title="The board moves with the conversation."
        >
          Your Leads board is the one the inbox, your automation rules and the AI agent all work on
          — so a stage set anywhere shows up everywhere.
        </SectionHead>

        <div className="grid gap-4 md:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={<path d="M3.5 5.5h17v13h-17zM14 5.5v13" />}
            title="Set the stage while you reply"
            body="The inbox side panel has a lead stage picker, and every chat in the list shows its stage. Stage a whole list of contacts at once from Contacts."
          >
            <StagePickerMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M13 2 3 14h8l-1 8 10-12h-8Z" />}
            title="Rules that react to a stage"
            body="Trigger an automation when a lead changes stage, move contacts to a stage as a rule's action, or only run a rule for contacts in a given stage."
          >
            <StageRuleMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 7V4M9 12h.01M15 12h.01M9.5 15.5h5" />
              </>
            }
            title="The AI agent can stage leads too"
            body="With RateUp's built-in connector, the Meta AI Agent can move the customer it is talking to — say, when they ask for a quote."
          >
            <AgentToolMini />
            <Link
              to="/products/meta-ai-agent"
              className="text-[14.5px] font-semibold text-ru-blue-600 hover:text-ru-blue-700"
            >
              About the Meta AI Agent →
            </Link>
          </MockCard>
        </div>
      </div>
    </section>
  );
}
