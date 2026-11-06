import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";
import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import { BAND, SectionHead } from "../shared/section";

const OWNERSHIP = [
  "Connect your own Stripe or Razorpay account",
  "Customers pay you directly — RateUp never holds the money",
  "No commission on your sales",
];

/** The hosted checkout's total and pay button, as the customer sees it. */
function CheckoutCard() {
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-ru-blue-200 bg-ru-blue-50 p-5.5 sm:p-7">
      <div className="rounded-xl border border-ru-n-200 bg-white p-4 shadow-[0_18px_44px_rgba(16,24,40,0.08)]">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-ru-blue-600 text-[12.5px] font-semibold text-white">
            J
          </span>
          <span>
            <span className="block text-[13.5px] font-semibold text-ru-n-700">Juniper & Co.</span>
            <span className="block text-[11.5px] text-ru-n-400">Secure checkout</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 border-y border-ru-n-100 py-2.5 text-[12.5px] text-ru-n-500">
          <span className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">$56.00</span>
          </span>
          <span className="flex justify-between">
            <span>Coupon AUTUMN15</span>
            <span className="tabular-nums">−$3.60</span>
          </span>
          <span className="flex justify-between">
            <span>Shipping</span>
            <span className="tabular-nums">$6.00</span>
          </span>
          <span className="flex justify-between font-semibold text-ru-n-700">
            <span>Total</span>
            <span className="tabular-nums">$58.40</span>
          </span>
        </div>
        <div className="mt-3 rounded-lg bg-ru-blue-600 py-2.5 text-center text-[13.5px] font-semibold text-white">
          Pay $58.40
        </div>
        <p className="mt-2 text-center text-[11px] text-ru-n-400">
          Processed by Stripe, straight to Juniper & Co.
        </p>
      </div>

      <ul className="flex list-none flex-col gap-2.5 p-0">
        {OWNERSHIP.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[15px] text-ru-n-600">
            <CheckIcon className="mt-1 size-3.5 flex-none text-ru-green-600" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Payments() {
  return (
    <section id="payments" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Payments"
          icon={
            <>
              <rect x="3" y="5.5" width="18" height="13" rx="2" />
              <path d="M3 10h18M7 14.5h4" />
            </>
          }
          title="Your payments, your account."
        >
          Take money the way your customers like to pay, into the account you already have.
        </SectionHead>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <CheckoutCard />

          <div className="grid gap-4 sm:grid-cols-2">
            <MockCard
              className="min-w-0"
              icon={
                <>
                  <rect x="3" y="5.5" width="18" height="13" rx="2" />
                  <path d="M3 10h18" />
                </>
              }
              title="Stripe or Razorpay"
              body="A secure payment link, or the hosted checkout page, charges through your own provider account."
            />
            <MockCard
              className="min-w-0"
              icon={
                <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
              }
              title="The link arrives in the chat"
              body="Customers get the payment link in the same WhatsApp, Instagram or Messenger conversation, and the order confirmation lands there too."
            />
            <MockCard
              className="min-w-0"
              icon={
                <>
                  <rect x="2.5" y="6" width="19" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.6" />
                </>
              }
              title="Cash on delivery"
              body="Each COD order is confirmed by the customer on WhatsApp before you ship — with an optional discount for paying online instead."
            />
            <MockCard
              className="min-w-0"
              icon={
                <>
                  <path d="M3 9.5 12 4l9 5.5" />
                  <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17" />
                </>
              }
              title="Bank transfer"
              body="Offer bank transfer at checkout and mark the order paid when the money arrives."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
