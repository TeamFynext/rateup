import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Inset } from "@/components/RateupHomePage/shared/mockups/kit";

import { RowsMini, rowDelay, rowReveal } from "../shared/mini";

const CHIPS =
  "rounded-full border border-ru-n-200 bg-white px-2 py-0.75 text-[11px] font-medium text-ru-n-600";

function ChipCloud({ items }: Readonly<{ items: readonly string[] }>) {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-wrap gap-1.25">
        {items.map((item, i) => (
          <span
            key={item}
            style={{ transitionDelay: `${i * 70}ms` }}
            className={`${CHIPS} ${rowReveal(shown)}`}
          >
            {item}
          </span>
        ))}
      </div>
    </Inset>
  );
}

export function FlowTypesMini() {
  return (
    <ChipCloud
      items={[
        "Star rating",
        "Smiley",
        "Yes / no",
        "Opinion scale",
        "Single choice",
        "Multi select",
        "Dropdown",
        "Short text",
        "Long text",
        "Date",
        "Photo",
        "Opt-in",
      ]}
    />
  );
}

export function DraftsMini() {
  return (
    <RowsMini
      items={[
        { key: "r", left: "Restaurant & café", right: "Food quality · Service" },
        { key: "s", left: "Retail store", right: "Product range · Staff" },
        { key: "a", left: "Salon & spa", right: "Service · Cleanliness" },
        { key: "g", left: "Gym & fitness", right: "Facilities · Trainers" },
      ]}
    />
  );
}

export function RulesMini() {
  return (
    <RowsMini
      items={[
        { key: "d", left: "Send after", right: "2 hours" },
        { key: "c", left: "Ask the same customer at most", right: "Every 30 days" },
        { key: "h", left: "Counts as happy", right: "4 stars and up" },
        { key: "g", left: "Google review link", right: "Per team" },
      ]}
    />
  );
}

export function AlertMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`rounded-lg border border-ru-amber-200 bg-ru-amber-50 px-2.75 py-2 ${rowReveal(shown)}`}
        >
          <div className="text-[12.5px] font-semibold text-ru-amber-700">
            Unhappy customer feedback
          </div>
          <div className="text-[12px] text-ru-n-600">Arjun S. rated their visit 2.</div>
        </div>
        <div style={rowDelay(1)} className={`flex flex-wrap gap-1.25 ${rowReveal(shown)}`}>
          {["In-app", "Push", "Email", "Desktop"].map((channel) => (
            <span key={channel} className={CHIPS}>
              {channel}
            </span>
          ))}
        </div>
      </div>
    </Inset>
  );
}

export function WebSurveyMini() {
  return (
    <RowsMini
      items={[
        { key: "q", left: "QR code & share link", right: "Per team" },
        { key: "k", left: "Kiosk mode", right: "On" },
        { key: "l", left: "Languages", right: "English, Hindi, Arabic" },
        { key: "n", left: "NPS", right: "Promoters · Detractors" },
      ]}
    />
  );
}

export function SummaryMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div
        ref={ref}
        style={rowDelay(0)}
        className={`rounded-lg border border-ru-n-200 bg-white px-2.75 py-2.5 ${rowReveal(shown)}`}
      >
        <div className="mb-1 text-[10.5px] font-semibold tracking-[0.06em] text-ru-blue-600 uppercase">
          AI summary · 212 answers
        </div>
        <p className="text-[12.5px]/[1.5] text-ru-n-600">
          Most praise the coffee and the staff. Weekend waiting times come up repeatedly, along with
          requests for more seating outside.
        </p>
      </div>
    </Inset>
  );
}
