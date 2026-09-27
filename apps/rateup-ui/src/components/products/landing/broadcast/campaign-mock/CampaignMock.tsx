import PhoneFrame, { PHONE_OUT, Ticks } from "../../shared/PhoneFrame";
import { useScript } from "../../shared/useScript";
import { FUNNEL_STAGES } from "../content";
import { CAMPAIGN_SCRIPT, type CampaignState, PHASE } from "./script";

function TemplateMessage({ phase }: Readonly<{ phase: number }>) {
  const tone = phase >= PHASE.read ? "read" : phase >= PHASE.delivered ? "delivered" : "sent";

  return (
    <div className="max-w-[88%] flex-none animate-ru-msg-in self-start overflow-hidden rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white motion-reduce:animate-none">
      <div className="flex h-24 items-center justify-center bg-ru-blue-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6.5 text-ru-blue-400"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
      <div className="px-3.25 pt-2.5 pb-2">
        <p className="text-sm/[1.5] text-ru-n-600">
          Hi Ananya, the festive collection is in at our Kochi store. Show this message for 10% off
          until Sunday.
        </p>
        <div className="mt-1 flex items-center justify-end gap-1.25 text-[11px] text-ru-n-400">
          10:00
          <Ticks tone={tone} />
        </div>
      </div>
      {["Shop the collection", "Copy offer code"].map((label) => (
        <div
          key={label}
          className="border-t border-ru-n-100 py-2.25 text-center text-[13.5px] font-semibold text-ru-blue-600"
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function Report({ state }: Readonly<{ state: CampaignState }>) {
  const total = state.counts.Attempted;

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-ru-n-200 bg-white p-5 text-left shadow-[0_24px_64px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-[16px] font-bold text-ru-n-700">Festive collection</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            state.phase >= PHASE.read
              ? "bg-ru-green-50 text-ru-green-700"
              : "bg-ru-blue-50 text-ru-blue-700"
          }`}
        >
          {state.phase >= PHASE.read ? "Completed" : "Sending"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {FUNNEL_STAGES.map((stage) => {
          const value = state.counts[stage];
          return (
            <div key={stage} className="grid grid-cols-[5.5rem_1fr_3.75rem] items-center gap-3">
              <span className="text-[13px] text-ru-n-600">{stage}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-ru-n-100">
                <span
                  style={{ transform: `scaleX(${value / total})` }}
                  className="block h-full origin-left rounded-full bg-ru-blue-600 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                />
              </span>
              <span className="text-right text-[13px] font-semibold text-ru-n-700 tabular-nums">
                {value.toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-ru-n-200 bg-ru-n-50 p-3.5">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
          Why messages failed
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="min-w-0 truncate text-ru-n-600">
            Meta limited marketing messages to this contact
          </span>
          <span className="flex-none font-medium text-ru-amber-700">Retryable</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
          <span className="min-w-0 truncate text-ru-n-600">
            Number could not receive the message
          </span>
          <span className="flex-none text-ru-n-400">Final</span>
        </div>
      </div>

      <div
        className={`rounded-xl border px-3.5 py-3 text-[13.5px] font-medium transition-colors duration-500 ${
          state.phase >= PHASE.retried
            ? "border-ru-green-100 bg-ru-green-50 text-ru-green-700"
            : "border-ru-n-200 bg-white text-ru-n-500"
        }`}
      >
        {state.phase >= PHASE.retried
          ? "Automatic retry recovered 214 messages"
          : "Automatic retry scheduled · outside quiet hours"}
      </div>
    </div>
  );
}

/** A broadcast arriving on a customer's phone while its delivery funnel fills in. */
export default function CampaignMock() {
  const [ref, state] = useScript(CAMPAIGN_SCRIPT);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A festive-offer broadcast arrives on a customer's WhatsApp with an image, a personalised message and two buttons, and the customer replies. Beside it, the campaign report fills in how many messages were attempted, delivered, read and replied to, why some failed, and how many an automatic retry recovered."
      className="grid items-center gap-6 select-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
    >
      <div aria-hidden="true">
        <PhoneFrame initial="NS" name="Northside Stores">
          <TemplateMessage phase={state.phase} />
          {state.phase >= PHASE.replied && (
            <div className={PHONE_OUT}>Is the green kurta there in M?</div>
          )}
        </PhoneFrame>
      </div>
      <div aria-hidden="true" className="mx-auto w-full max-w-110">
        <Report state={state} />
      </div>
    </div>
  );
}
