import { Link } from "@tanstack/react-router";

import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import { BAND, SectionHead } from "../shared/section";
import {
  AlertMini,
  DraftsMini,
  FlowTypesMini,
  RulesMini,
  SummaryMini,
  WebSurveyMini,
} from "./feature-mocks";

export default function Features() {
  return (
    <section id="features" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="What you control"
          icon={
            <>
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </>
          }
          title="Your questions, your timing, your threshold."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={
              <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
            }
            title="A real form, inside WhatsApp"
            body="Feedback is a WhatsApp Flow — a native form Meta renders in the chat, built from ratings, choices, text and more."
          >
            <FlowTypesMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z" />
                <path d="M14 3.5v4h4M10 13h5M10 16.5h3" />
              </>
            }
            title="Start from your kind of business"
            body="Question sets for restaurants and cafés, retail, salons, gyms and any business — each one editable."
          >
            <DraftsMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </>
            }
            title="When to ask, and who's happy"
            body="Set the delay after a visit, how often one customer may be asked, and the rating that counts as happy."
          >
            <RulesMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
                <path d="M10 20.5a2 2 0 0 0 4 0" />
              </>
            }
            title="Unhappy? Your team knows first"
            body="A low rating raises an alert with the customer's name and score, so a manager can reach out the same day."
          >
            <AlertMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
              </>
            }
            title="Web surveys when you need more"
            body="Longer surveys behind a QR code, on a kiosk or by link — with NPS, logic jumps, themes and translations."
          >
            <WebSurveyMini />
            <Link
              to="/products/whatsapp-survey"
              className="text-[14.5px] font-semibold text-ru-blue-600 hover:text-ru-blue-700"
            >
              About WhatsApp surveys →
            </Link>
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <path d="m12 3 1.8 4.9L19 9.7l-4.2 3.2 1.4 5.1L12 15.1 7.8 18l1.4-5.1L5 9.7l5.2-1.8L12 3Z" />
            }
            title="AI summaries of written answers"
            body="On web surveys, read what hundreds of customers wrote in one paragraph, question by question or team by team."
          >
            <SummaryMini />
          </MockCard>
        </div>
      </div>
    </section>
  );
}
