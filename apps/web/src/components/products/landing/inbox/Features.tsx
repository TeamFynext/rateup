import { Link } from "@tanstack/react-router";

import { InboxList, PipelineBoard } from "@/components/RateupHomePage/shared/mockups/boards";
import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import AlsoList from "../shared/AlsoList";
import { BAND, SectionHead } from "../shared/section";
import { AssignMini, NotesMini, RulesMini, SessionMini } from "./feature-mocks";

const ALSO = [
  "iOS and Android apps with push notifications",
  "Voice notes, images, video, documents and location",
  "WhatsApp templates and Flows from the reply box",
  "Favourites, spam and block",
  "Filter by channel, label, teammate or team",
  "Instagram comments alongside DMs",
];

export default function Features() {
  return (
    <section id="features" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Inside the inbox"
          icon={
            <>
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </>
          }
          title="Built for how support teams actually work."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={<path d="M3 6h18M3 12h18M3 18h12" />}
            title="One queue, three channels"
            body="WhatsApp, Instagram and Messenger land together, each marked with its channel. Filter down to one number or account when you need to."
          >
            <InboxList />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <circle cx="10" cy="8" r="3.4" />
                <path d="M3.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
              </>
            }
            title="Every conversation has an owner"
            body="Assign to a teammate or a whole team. Until someone owns it, an unassigned banner sits on the thread with Assign to me."
          >
            <AssignMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M5 4.5h14v11H11l-4 4v-4H5v-11ZM9 9h6M9 12h4" />}
            title="Private notes and @mentions"
            body="Ask the warehouse, loop in a manager, leave context for the next shift — in a lane the customer never sees. Mentions get their own view."
          >
            <NotesMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M3.6 5h16.8l-6.3 7.1v6L10 20v-7.9L3.6 5Z" />}
            title="Tags, labels and lifecycle stage"
            body="Move a contact through your pipeline while you answer them. Labels stay with the person; tags stay with the conversation."
          >
            <PipelineBoard />
            <Link
              to="/products/pipeline"
              className="text-[14.5px] font-semibold text-ru-blue-600 hover:text-ru-blue-700"
            >
              About Pipeline →
            </Link>
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M13 2 3 14h8l-1 8 10-12h-8Z" />}
            title="Quick replies and auto-replies"
            body="Saved replies a keystroke away, approved templates in the reply box, and rules that greet, tag and assign before anyone opens the thread."
          >
            <RulesMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </>
            }
            title="The 24-hour window, on a clock"
            body="Every WhatsApp thread counts down its session. When it closes, free-text replies lock and a template reopens the conversation."
          >
            <SessionMini />
          </MockCard>
        </div>

        <AlsoList items={ALSO} />
      </div>
    </section>
  );
}
