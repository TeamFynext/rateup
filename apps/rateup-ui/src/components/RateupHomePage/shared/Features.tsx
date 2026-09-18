import { BookDemoCta, Eyebrow, WhatsAppCta, WhatsAppTile } from "./home-ui";
import {
  AutomationFlow,
  CampaignStats,
  CashierMini,
  InboxList,
  PipelineBoard,
} from "./mockups/boards";
import { AgentReply, LoyaltyThread, ReviewFlow } from "./mockups/chat";
import { MockCard } from "./mockups/kit";

export default function Features() {
  return (
    <section
      id="platform"
      className="border-b border-ru-n-100 bg-[linear-gradient(180deg,var(--color-ru-blue-50)_0%,#fff_60%)]"
    >
      <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6 sm:mb-10">
          <div className="max-w-155">
            <Eyebrow
              className="mb-4.5"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                </svg>
              }
            >
              The platform
            </Eyebrow>
            <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
              Everything you need in one place.
            </h2>
            <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
              One customer record behind every conversation. Start with loyalty on WhatsApp — the
              rest is already there when you need it.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.25 rounded-full border border-ru-n-200 bg-white px-3.5 py-2">
            <WhatsAppTile className="size-4.5 rounded-[5px]" glyphClassName="size-2.75" />
            <span className="text-sm font-medium text-ru-n-600">Runs on your own number</span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex flex-[2.1_1_420px] flex-col gap-4 rounded-[20px] border border-ru-blue-200 bg-white p-5.5 shadow-md sm:p-7.5">
            <span className="inline-flex w-fit items-center gap-1.75 rounded-full border border-ru-amber-200 bg-ru-amber-50 py-1.25 pr-2.75 pl-1.25 text-[13px] font-semibold text-ru-amber-700">
              <span className="size-4 rounded-full bg-ru-star" />
              Flagship
            </span>

            <div>
              <div className="mb-2 font-display text-[clamp(1.375rem,2.9vw,1.8125rem)] font-bold tracking-[-0.025em] text-ru-n-700">
                WhatsApp Loyalty
              </div>
              <p className="max-w-[52ch] text-base/[1.6] text-ru-n-500">
                Points, VIP tiers, rewards and referrals inside the thread. Members get a QR card on
                WhatsApp and your cashier scans it — no app, no plastic card, no login.
              </p>
            </div>

            <LoyaltyThread />

            <div className="mt-auto flex flex-wrap gap-2.5">
              {[
                "Earning rules you set",
                "Up to three VIP tiers",
                "Cashier screen & QR poster",
                "Visit reminders",
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-ru-n-200 bg-ru-n-50 px-2.75 py-1.5 text-[13.5px] text-ru-n-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-[1.2_1_300px] flex-col gap-4">
            <MockCard
              className="flex-1"
              icon={<path d="M3 6h18M3 12h18M3 18h12" />}
              title="Shared Inbox"
              body="WhatsApp, Instagram and Messenger in one team queue. Assign, mention, tag, resolve."
            >
              <InboxList />
            </MockCard>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          <MockCard
            className="flex-[1.3_1_300px]"
            icon={
              <>
                <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
                <path d="M15 9a4 4 0 0 1 0 6" />
              </>
            }
            title="Campaigns"
            body="Pick a group, schedule an approved template, send a test first. Failed sends can be retried."
          >
            <CampaignStats />
          </MockCard>

          <MockCard
            className="flex-[1.3_1_300px]"
            icon={
              <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
            }
            title="Feedback & Google Reviews"
            body="A survey after every visit. Happy customers go on to Google with a review to start from; unhappy ones reach you first."
          >
            <ReviewFlow />
          </MockCard>

          <MockCard
            className="flex-[1.3_1_300px]"
            icon={<path d="M3.6 5h16.8l-6.3 7.1v6L10 20v-7.9L3.6 5Z" />}
            title="Lead Pipeline"
            body="Turn a conversation into a lead, drag it through your stages and watch the forecast."
          >
            <PipelineBoard />
          </MockCard>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          <MockCard
            className="flex-[1_1_240px]"
            icon={<path d="M13 2 3 14h8l-1 8 10-12h-8Z" />}
            title="Flows & Chatbots"
            body="No-code flows and keyword replies on WhatsApp and Instagram, with a clean hand-over."
          >
            <AutomationFlow />
          </MockCard>

          <MockCard
            className="flex-[1_1_240px]"
            icon={
              <>
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 3v4M9 13h.01M15 13h.01" />
              </>
            }
            title="Meta AI Agent"
            body="Answers from your own knowledge base and works through the tools you connect."
          >
            <AgentReply />
          </MockCard>

          <MockCard
            className="flex-[1_1_240px]"
            icon={
              <>
                <rect x="6.5" y="2.5" width="11" height="19" rx="3" />
                <path d="M11 18.5h2" />
              </>
            }
            title="Mobile App"
            body="Inbox, flows, forms and the loyalty cashier on iOS and Android, for the shop floor."
          >
            <CashierMini />
          </MockCard>
        </div>

        <div className="flex flex-wrap gap-4">
          <MockCard
            className="flex-[1_1_240px]"
            icon={
              <>
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </>
            }
            title="Integrations"
            body="Connect your store, POS and CRM, or build on webhooks and the REST API."
          >
            <div className="mt-auto flex flex-wrap gap-2">
              {["Shopify", "WooCommerce", "Petpooja", "Zoho", "Zapier", "Google Sheets"].map(
                (name) => (
                  <span
                    key={name}
                    className="rounded-lg border border-ru-n-200 bg-ru-n-50 px-2.75 py-1.5 text-[13px] text-ru-n-600"
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </MockCard>

          <MockCard
            className="flex-[1_1_240px]"
            icon={
              <>
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
                <path d="M14 14h3v3M20.5 14v6.5H14M17 20.5v-1" />
              </>
            }
            title="QR Studio & Web Forms"
            body="Branded QR codes and short links that open your survey, loyalty sign-up or form."
          >
            <div className="mt-auto flex flex-wrap gap-2">
              {["Themes", "Translations", "Testimonials"].map((name) => (
                <span
                  key={name}
                  className="rounded-lg border border-ru-n-200 bg-ru-n-50 px-2.75 py-1.5 text-[13px] text-ru-n-600"
                >
                  {name}
                </span>
              ))}
            </div>
          </MockCard>

          <div className="flex flex-[1.2_1_260px] flex-col justify-between gap-3.5 rounded-[20px] border border-ru-blue-200 bg-ru-blue-50 p-5.5 sm:p-7">
            <div>
              <div className="mb-2 font-display text-[clamp(1.25rem,2.4vw,1.4375rem)] font-bold tracking-[-0.022em] text-ru-n-700">
                Want it wired to your own store?
              </div>
              <p className="text-[15.5px]/[1.55] text-ru-n-600">
                We'll set up loyalty, feedback and one win-back flow on a demo number in 20 minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <BookDemoCta
                showArrow={false}
                className="h-11.5 px-5 text-[15.5px] max-sm:w-full max-sm:justify-center"
              />
              <WhatsAppCta className="h-11.5 px-4 text-[15.5px] max-sm:w-full max-sm:justify-center">
                WhatsApp
              </WhatsAppCta>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
