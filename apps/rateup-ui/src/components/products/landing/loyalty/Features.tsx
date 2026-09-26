import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import AlsoList from "../shared/AlsoList";
import { BAND, SectionHead } from "../shared/section";
import {
  EarningMini,
  KeywordsMini,
  ReferralMini,
  RemindersMini,
  RewardsMini,
  TiersMini,
} from "./feature-mocks";

const ALSO = [
  "Join by QR poster, web sign-up page or at the counter",
  "A welcome with a Join button for first-time contacts",
  "Web sign-up bonuses held until the first message or purchase",
  "Points expiry after the months you choose",
  "Printable counter QR card and rewards brochure",
  "Activity ledger and member lists, exportable to CSV or Excel",
];

export default function Features() {
  return (
    <section id="features" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="The programme"
          icon={
            <>
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </>
          }
          title="Points, tiers, rewards and referrals — your rules."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={
              <path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
            }
            title="Earning rules"
            body="Points per amount spent, down to fractions, with multipliers, flat bonus points, minimum spends and rules only certain tiers get."
          >
            <EarningMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6L3.4 9.3l6-.8L12 3Z" />
            }
            title="VIP tiers"
            body="Up to three tiers by spend, each with a points multiplier and perks. Count a rolling window and members move down as well as up."
          >
            <TiersMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <path d="M4 9h16v11H4zM2.5 5.5h19V9h-19zM12 5.5V20M12 5.5c-1.5-3-5-3-5-.5s5 .5 5 .5Zm0 0c1.5-3 5-3 5-.5s-5 .5-5 .5Z" />
            }
            title="Rewards"
            body="Fixed or percentage discounts and free items, bought with points or given as gifts — with stock limits, tier limits and redemption rules."
          >
            <RewardsMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <circle cx="8" cy="8" r="3" />
                <circle cx="17" cy="15" r="3" />
                <path d="M10.5 9.5 14.5 13.5M3 20a5 5 0 0 1 10 0" />
              </>
            }
            title="Referrals"
            body="Every member gets a code and a link. When a friend joins, both sides get their bonus — points or a gift."
          >
            <ReferralMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M4 10h16M9 3v4M15 3v4" />
              </>
            }
            title="Reminders that bring them back"
            body="Birthdays, joining anniversaries, members who've gone quiet, VIP status at risk, and points or rewards about to expire — each at the hour you pick."
          >
            <RemindersMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
            }
            title="Answers by keyword"
            body="Members text a keyword and get their balance, rewards, referral link or card back straight away — or pick from a tappable menu."
          >
            <KeywordsMini />
          </MockCard>
        </div>

        <AlsoList items={ALSO} />
      </div>
    </section>
  );
}
