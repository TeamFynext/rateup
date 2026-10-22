import { Link } from "@tanstack/react-router";

import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import { BAND, SectionHead } from "../shared/section";
import { AgentShopMini, AttributionMini, InboxShopMini } from "./feature-mocks";

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
          title="Your team, your AI agent and your ads can all sell."
        >
          The shop is built into the same inbox, mobile app and Meta AI agent you already run your
          conversations on.
        </SectionHead>

        <div className="grid gap-4 md:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={<path d="M3.5 5.5h17v13h-17zM14 5.5v13" />}
            title="Sell from the inbox and the app"
            body="Agents send product cards, build an order and send a payment link from any conversation — on the web or in the RateUp mobile app."
          >
            <InboxShopMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 7V4M9 12h.01M15 12h.01M9.5 15.5h5" />
              </>
            }
            title="The AI agent can take orders too"
            body="With RateUp's connector, the Meta AI Agent searches your products, starts a checkout, answers “where's my order?” and signs customers up for back-in-stock alerts."
          >
            <AgentShopMini />
            <Link
              to="/products/meta-ai-agent"
              className="text-[14.5px] font-semibold text-ru-blue-600 hover:text-ru-blue-700"
            >
              About the Meta AI Agent →
            </Link>
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M4 19V9M10 19V5M16 19v-7M21 19H3" />
              </>
            }
            title="Know which ad made the sale"
            body="Orders that start from a click-to-WhatsApp ad carry the ad they came from, so you can see what your ad spend actually sold."
          >
            <AttributionMini />
          </MockCard>
        </div>
      </div>
    </section>
  );
}
