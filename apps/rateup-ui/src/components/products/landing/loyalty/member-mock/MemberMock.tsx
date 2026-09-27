import { Avatar } from "@/components/RateupHomePage/shared/mockups/kit";

import PhoneFrame, { PHONE_IN, PHONE_OUT, PHONE_SYSTEM } from "../../shared/PhoneFrame";
import { useScript } from "../../shared/useScript";
import { MEMBER_SCRIPT, PHASE } from "./script";

/** A stand-in QR: a fixed pattern, since a real code would be scannable and point nowhere. */
const QR_CELLS = [
  1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1,
  0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1,
  1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1,
];

function MemberCard() {
  return (
    <div className="flex-none animate-ru-msg-in self-start overflow-hidden rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white motion-reduce:animate-none">
      <div className="flex items-center gap-3 bg-ru-blue-900 px-3.5 py-3">
        <span className="grid size-16 flex-none grid-cols-9 gap-px rounded-md bg-white p-1.25">
          {QR_CELLS.map((on, i) => (
            <span key={i} className={on ? "bg-ru-blue-950" : "bg-white"} />
          ))}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-white">Meera N.</span>
          <span className="block font-mono text-[11.5px] text-white/70">KQ7-M4P-X2R</span>
        </span>
      </div>
      <p className="px-3.25 py-2.5 text-sm/[1.5] text-ru-n-600">
        Hi Meera, here is your card. Show this QR at the counter to collect and use your points.
      </p>
    </div>
  );
}

function Counter({ phase }: Readonly<{ phase: number }>) {
  const points = phase >= PHASE.earned ? 540 : 500;
  const gold = phase >= PHASE.gold;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-ru-n-200 bg-white p-5 text-left shadow-[0_24px_64px_rgba(16,24,40,0.08)]">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
        At the counter · RateUp cashier
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-[13.5px] font-medium transition-colors duration-500 ${
          phase >= PHASE.scanned
            ? "border-ru-green-100 bg-ru-green-50 text-ru-green-700"
            : "border-dashed border-ru-n-300 bg-ru-n-50 text-ru-n-500"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          className="size-4.5 flex-none"
          aria-hidden="true"
        >
          <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16" />
        </svg>
        {phase >= PHASE.scanned ? "Member card scanned" : "Scan a member card"}
      </div>

      <div
        className={`flex flex-col gap-3 transition-opacity duration-500 ${
          phase >= PHASE.scanned ? "opacity-100" : "opacity-30"
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar initials="MN" className="bg-ru-green-600" size="size-9 text-[12px]" />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-ru-n-700">Meera N.</div>
            <div className="text-[12.5px] text-ru-n-400 tabular-nums">
              {gold ? "Gold" : "Silver"} · {points} points
            </div>
          </div>
          {gold && (
            <span className="animate-ru-msg-in rounded-full bg-ru-amber-50 px-2.5 py-1 text-[11.5px] font-semibold text-ru-amber-700 motion-reduce:animate-none">
              Tier up
            </span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-ru-n-200 bg-ru-n-50 px-3 py-2.5">
          <span className="text-[13px] text-ru-n-500">Bill amount</span>
          <span className="font-display text-[16px] font-bold text-ru-n-700 tabular-nums">
            {phase >= PHASE.billed ? "₹480" : "—"}
          </span>
        </div>

        <div
          className={`rounded-lg py-2.5 text-center text-[13.5px] font-semibold transition-colors duration-300 ${
            phase >= PHASE.earned ? "bg-ru-green-600 text-white" : "bg-ru-blue-600 text-white"
          }`}
        >
          {phase >= PHASE.earned ? "40 points added ✓" : "Add purchase"}
        </div>
      </div>

      <p className="text-[13px]/[1.5] text-ru-n-500">
        In the RateUp app, purchases queue up if the connection drops.
      </p>
    </div>
  );
}

/** A customer joining from the counter QR, earning on a purchase and reaching a new tier. */
export default function MemberMock() {
  const [ref, state] = useScript(MEMBER_SCRIPT);
  const { phase } = state;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="A customer joins a café's loyalty programme on WhatsApp and receives a QR member card; at the counter the cashier scans the card and adds 40 points for a ₹480 bill; the customer is told they have reached Gold, then texts POINTS to check the balance."
      className="grid items-center gap-6 select-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10"
    >
      <div aria-hidden="true">
        <PhoneFrame initial="BB" name="Brew & Bean">
          <div className={PHONE_OUT}>JOIN</div>
          {phase >= PHASE.welcomed && (
            <div className={PHONE_IN}>
              Welcome to Brew &amp; Bean Rewards! You're all set — reply POINTS any time to check
              your balance.
            </div>
          )}
          {phase >= PHASE.card && <MemberCard />}
          {phase >= PHASE.earned && (
            <>
              <div className={PHONE_SYSTEM}>Friday</div>
              <div className={PHONE_IN}>
                Hi Meera, you just earned 40 points. Your balance is now 540.
              </div>
            </>
          )}
          {phase >= PHASE.gold && (
            <div className={PHONE_IN}>
              Congratulations Meera — you've reached{" "}
              <span className="font-semibold text-ru-amber-700">Gold</span>! Enjoy your new
              benefits.
            </div>
          )}
          {phase >= PHASE.asked && <div className={PHONE_OUT}>POINTS</div>}
          {phase >= PHASE.balance && (
            <div className={PHONE_IN}>
              You have 540 points available. Reply REWARDS to see what you can claim.
            </div>
          )}
        </PhoneFrame>
      </div>
      <div aria-hidden="true" className="mx-auto w-full max-w-110">
        <Counter phase={phase} />
      </div>
    </div>
  );
}
