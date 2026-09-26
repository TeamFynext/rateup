import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import AlsoList from "../shared/AlsoList";
import { BAND, SectionHead } from "../shared/section";
import {
  ConnectorMini,
  GuardrailsMini,
  KnowledgeMini,
  RateupConnectorMini,
  RichRepliesMini,
  SkillsMini,
} from "./feature-mocks";

const ALSO = [
  "Handoff message: Meta's default, one the agent writes, or your own",
  "Staff can hand any conversation back to the agent",
  "Closing a ticket can hand the customer back automatically",
  "A notification when a conversation is handed to your team",
  "A test chat that never reaches a real customer",
  "Evaluations: Meta simulates your scenarios and scores the answers",
];

export default function Features() {
  return (
    <section id="features" className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Teach it, extend it, control it"
          icon={
            <>
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </>
          }
          title="Everything the agent knows, you gave it."
        >
          Every change you save reaches Meta straight away.
        </SectionHead>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z" />
            }
            title="Knowledge"
            body="Business details, FAQs, files — PDF, Word, Excel, CSV and images — and website pages Meta crawls, with the crawl status on each."
          >
            <KnowledgeMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />
            }
            title="Skills"
            body="Plain-language instructions for jobs like taking a booking, each with when to use it. Meta reviews every skill before it goes live."
          >
            <SkillsMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />}
            title="Rich replies"
            body="Let the agent answer with carousels, buttons, WhatsApp Flows, lists, images and locations instead of plain text."
          >
            <RichRepliesMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v4" />}
            title="Your own APIs"
            body="Connect HTTPS endpoints — order status, stock, bookings — with OAuth2, API key, basic or certificate auth, and read the call logs."
          >
            <ConnectorMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M8 12h8M12 8v8" />
              </>
            }
            title="The RateUp connector"
            body="One click gives the agent loyalty balances and rewards, labels, lead stages and team assignment — only ever for the customer it's talking to."
          >
            <RateupConnectorMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z" />}
            title="Guardrails"
            body="Pilot on up to 20 test numbers, ban up to 50 phrases, cap usage by tokens or AI turns, and follow up when a customer goes quiet."
          >
            <GuardrailsMini />
          </MockCard>
        </div>

        <AlsoList items={ALSO} />
      </div>
    </section>
  );
}
