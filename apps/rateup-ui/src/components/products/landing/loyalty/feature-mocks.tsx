import { useReveal } from "@/components/RateupHomePage/shared/home-ui";
import { Inset } from "@/components/RateupHomePage/shared/mockups/kit";

import { RowsMini, rowDelay, rowReveal } from "../shared/mini";

export function EarningMini() {
  return (
    <RowsMini
      items={[
        { key: "base", left: "Every ₹10 spent", right: "1 point" },
        { key: "gold", left: "Gold members", right: "2× points" },
        { key: "signup", left: "Sign-up bonus", right: "50 points" },
        { key: "refer", left: "Referral bonus", right: "100 each side" },
      ]}
    />
  );
}

const TIER_ROWS = [
  { name: "Member", spend: "From ₹0", tone: "bg-ru-n-400", multiplier: "1×" },
  { name: "Silver", spend: "₹5,000 in 12 months", tone: "bg-ru-blue-400", multiplier: "1.5×" },
  { name: "Gold", spend: "₹15,000 in 12 months", tone: "bg-ru-amber-400", multiplier: "2×" },
];

export function TiersMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        {TIER_ROWS.map((tier, i) => (
          <div
            key={tier.name}
            style={rowDelay(i)}
            className={`flex items-center gap-2.5 rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
          >
            <span className={`size-2.5 flex-none rounded-full ${tier.tone}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium text-ru-n-700">{tier.name}</span>
              <span className="block truncate text-[11px] text-ru-n-400">{tier.spend}</span>
            </span>
            <span className="flex-none text-[12px] font-semibold text-ru-n-600">
              {tier.multiplier}
            </span>
          </div>
        ))}
      </div>
    </Inset>
  );
}

export function RewardsMini() {
  return (
    <RowsMini
      items={[
        { key: "coffee", left: "Free coffee", right: "200 points" },
        { key: "off", left: "₹100 off", right: "400 points" },
        { key: "pct", left: "15% off · Gold only", right: "600 points" },
        { key: "bday", left: "Birthday dessert", right: "Gift" },
      ]}
    />
  );
}

export function ReferralMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="flex flex-col gap-1.5">
        <div
          style={rowDelay(0)}
          className={`rounded-lg border border-ru-n-200 bg-white px-2.75 py-2 ${rowReveal(shown)}`}
        >
          <div className="text-[11px] text-ru-n-400">Your referral code</div>
          <div className="font-mono text-[14px] font-semibold tracking-[0.04em] text-ru-n-700">
            MEERA-7KQ2P
          </div>
        </div>
        <div
          style={rowDelay(1)}
          className={`rounded-lg border border-ru-green-100 bg-ru-green-50 px-2.75 py-2 text-[12.5px] text-ru-green-700 ${rowReveal(shown)}`}
        >
          Arjun joined with your code · +100 points
        </div>
      </div>
    </Inset>
  );
}

export function RemindersMini() {
  return (
    <RowsMini
      items={[
        { key: "bday", left: "Birthday", right: "On the day · 10 AM" },
        { key: "quiet", left: "Quiet for a while", right: "After 45 days" },
        { key: "vip", left: "VIP status at risk", right: "14 days before" },
        { key: "exp", left: "Points expiring", right: "7 days before" },
      ]}
    />
  );
}

const KEYWORDS = ["JOIN", "POINTS", "REWARDS", "REFER", "CARD", "STOP"];

export function KeywordsMini() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <Inset className="p-2.5">
      <div ref={ref} className="grid grid-cols-3 gap-1.5">
        {KEYWORDS.map((keyword, i) => (
          <span
            key={keyword}
            style={{ transitionDelay: `${i * 90}ms` }}
            className={`rounded-md border border-ru-n-200 bg-white py-1.75 text-center font-mono text-[11.5px] font-semibold text-ru-n-700 ${rowReveal(shown)}`}
          >
            {keyword}
          </span>
        ))}
      </div>
    </Inset>
  );
}
