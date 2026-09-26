import { Link } from "@tanstack/react-router";

export default function PricingNote() {
  return (
    <section className="bg-white pb-14 sm:pb-24">
      <div className="mx-auto max-w-280 px-5">
        <div className="grid items-center gap-6 rounded-2xl border border-ru-blue-200 bg-ru-blue-50 px-6 py-7 sm:px-9 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
              Know the cost before you press send.
            </h2>
            <p className="max-w-[66ch] text-[15.5px]/[1.6] text-ru-n-500">
              Meta prices template messages by category and by the recipient's country, so a
              marketing broadcast in India costs a different rate than one in the UAE. Your RateUp
              plan sets the conversation allowance each campaign is checked against.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/tools/whatsapp-pricing-calculator"
              className="inline-flex h-11 items-center rounded-lg bg-ru-blue-600 px-5.5 text-[15px] font-semibold text-white transition-colors hover:bg-ru-blue-700"
            >
              Estimate your cost
            </Link>
            <Link
              to="/pricing"
              className="inline-flex h-11 items-center rounded-lg border border-ru-n-200 bg-white px-5.5 text-[15px] font-semibold text-ru-n-700 transition-colors hover:border-ru-n-300"
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
