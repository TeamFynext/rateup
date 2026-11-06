import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import AlsoList from "../shared/AlsoList";
import { BAND, SectionHead } from "../shared/section";
import { BoardsMini, HistoryMini, IdleMini, ImportMini, ListMini, TaskMini } from "./feature-mocks";

const ALSO = [
  "Win probability and a stale-lead threshold on every stage",
  "Owner, several assignees and a team on each lead",
  "Labels, company and expected close date",
  "Lost reasons you define, picked when a lead is lost",
  "Search by name, company or phone",
  "Only owners and admins can delete a lead",
];

export default function Features() {
  return (
    <section id="features" className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Inside the pipeline"
          icon={
            <>
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </>
          }
          title="Everything a lead needs, on one card."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={<path d="M3 6h18M3 12h18M3 18h12" />}
            title="Board or list"
            body="Drag cards across the board, or switch to a list grouped by stage and move, assign or delete many leads at once."
          >
            <ListMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z" />
                <path d="M14 3.5v4h4M10 13h5M10 16.5h3" />
              </>
            }
            title="Notes and full history"
            body="Every move, note, task and close is recorded on the lead, and the conversation is one click away."
          >
            <HistoryMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </>
            }
            title="A next step on every lead"
            body="Schedule a call, message, meeting, document or to-do with a due time. The person it's for gets notified."
          >
            <TaskMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M12 3 2.5 20h19L12 3Z" />
                <path d="M12 10v4M12 17.2v.1" />
              </>
            }
            title="Stale leads stand out"
            body="Leave a lead longer than its stage allows and the card is outlined with how long it has been idle — and it joins Needs attention."
          >
            <IdleMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />}
            title="Import and export"
            body="Bring leads in from CSV or Excel, up to 1,000 rows at a time from a ready-made template. Export any filtered view the same way."
          >
            <ImportMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="3" y="4" width="5" height="16" rx="1.5" />
                <rect x="10" y="4" width="5" height="11" rx="1.5" />
                <rect x="17" y="4" width="4" height="7" rx="1.5" />
              </>
            }
            title="More than sales"
            body="Alongside the Leads board, run up to ten more for support tickets, projects or anything else, each with its own columns."
          >
            <BoardsMini />
          </MockCard>
        </div>

        <AlsoList items={ALSO} />
      </div>
    </section>
  );
}
