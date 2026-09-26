import PhoneFrame, { PHONE_IN, PHONE_OUT, Typing } from "../../shared/PhoneFrame";
import { useScript } from "../../shared/useScript";
import { FEEDBACK_SCRIPT, PHASE } from "./script";

function Stars({ filled }: Readonly<{ filled: number }>) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          className={`size-4.5 transition-colors duration-300 ${
            n <= filled ? "fill-ru-amber-400 text-ru-amber-400" : "fill-ru-n-100 text-ru-n-200"
          }`}
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
        >
          <path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />
        </svg>
      ))}
    </span>
  );
}

function ButtonRow({ label }: Readonly<{ label: string }>) {
  return (
    <span className="-mx-3.25 -mb-2.5 mt-2.5 flex items-center justify-center gap-1.5 border-t border-ru-n-100 py-2.25 text-[13.5px] font-semibold text-ru-blue-600">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
        aria-hidden="true"
      >
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
      </svg>
      {label}
    </span>
  );
}

/** The WhatsApp Flow form, drawn as the sheet the customer fills in. */
function FlowForm({ phase }: Readonly<{ phase: number }>) {
  const rows = [
    { q: "Overall experience", stars: phase >= PHASE.overall ? 5 : 0 },
    { q: "Food quality", stars: phase >= PHASE.food ? 5 : 0 },
    { q: "Service", stars: phase >= PHASE.service ? 4 : 0 },
  ];

  if (phase >= PHASE.submitted) {
    return <div className={PHONE_OUT}>Feedback sent ✓</div>;
  }

  return (
    <div className="flex-none animate-ru-msg-in self-stretch rounded-2xl border border-ru-n-200 bg-white p-3.5 shadow-md motion-reduce:animate-none">
      <div className="mb-2.5 text-[13px] font-semibold text-ru-n-700">How was your visit?</div>
      <div className="flex flex-col gap-2.25">
        {rows.map((row) => (
          <div key={row.q} className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-ru-n-600">{row.q}</span>
            <Stars filled={row.stars} />
          </div>
        ))}
        <div className="rounded-lg border border-ru-n-200 bg-ru-n-50 px-2.5 py-2 text-[12px] text-ru-n-500">
          {phase >= PHASE.comment ? (
            <span className="text-ru-n-700">Loved the new cold brew!</span>
          ) : (
            "Anything we could do better?"
          )}
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-ru-green-600 py-2 text-center text-[13px] font-semibold text-white">
        Submit
      </div>
    </div>
  );
}

function TeamPanel({ phase }: Readonly<{ phase: number }>) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-ru-n-200 bg-white p-5 text-left shadow-[0_24px_64px_rgba(16,24,40,0.08)]">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        What happens next
      </div>

      <div className="flex min-h-58 flex-col gap-3">
        {phase >= PHASE.thanked && (
          <div className="animate-ru-msg-in rounded-xl border border-ru-green-100 bg-ru-green-50 p-3.5 motion-reduce:animate-none">
            <div className="text-[13.5px] font-semibold text-ru-green-700">
              Meera N. · rated 5 out of 5
            </div>
            <p className="mt-1 text-[13px]/[1.5] text-ru-n-600">
              At or above your threshold — invited to review you on Google.
            </p>
          </div>
        )}
        {phase >= PHASE.alert && (
          <div className="animate-ru-msg-in rounded-xl border border-ru-amber-200 bg-ru-amber-50 p-3.5 motion-reduce:animate-none">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-semibold text-ru-amber-700">
                Unhappy customer feedback
              </span>
              <span className="text-[11.5px] text-ru-n-400">Just now</span>
            </div>
            <p className="mt-1 text-[13px]/[1.5] text-ru-n-600">Arjun S. rated their visit 2.</p>
            <span className="mt-2 inline-block rounded-md border border-ru-n-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-ru-n-700">
              View feedback
            </span>
          </div>
        )}
      </div>

      <p className="text-[13px]/[1.5] text-ru-n-500">
        Alerts arrive in the app, by push, by email and on the desktop.
      </p>
    </div>
  );
}

/** A customer answering the post-visit form in WhatsApp, and where each kind of answer goes. */
export default function FeedbackMock() {
  const [ref, state] = useScript(FEEDBACK_SCRIPT);
  const { phase } = state;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A WhatsApp chat in which a café asks a customer about their visit, the customer rates it five stars in a form inside the chat, and is invited to review the café on Google; beside it, the team receives an alert about another customer who rated their visit two."
      className="grid items-center gap-6 select-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
    >
      <div aria-hidden="true">
        <PhoneFrame initial="BB" name="Brew & Bean">
          <div className={PHONE_IN}>
            Thanks for visiting Brew &amp; Bean today, Meera! How did we do? It takes 30 seconds.
            <ButtonRow label="Give feedback" />
          </div>
          {phase >= PHASE.form && <FlowForm phase={phase} />}
          {phase === PHASE.typing && <Typing />}
          {phase >= PHASE.thanked && (
            <div className={PHONE_IN}>
              Thank you for your feedback! Would you mind sharing it as a Google review?
              <ButtonRow label="Review us on Google" />
            </div>
          )}
        </PhoneFrame>
      </div>
      <div aria-hidden="true" className="mx-auto w-full max-w-110">
        <TeamPanel phase={phase} />
      </div>
    </div>
  );
}
