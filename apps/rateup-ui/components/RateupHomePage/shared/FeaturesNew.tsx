import { Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
export default function Features() {
  return (
    <section
      className={`${sora.className} flex items-center justify-center p-4`}
    >
      <div className="max-w-6xl flex flex-col items-center justify-center gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-[#C4D7F5] rounded-xl col-span-2 p-4">
            <span className="text-rateup-graytext text-xl font-semibold">
              Campaign Management
            </span>
            <p className="text-[#7A8289] text-xs font-normal">
              Turn Campaigns into Conversations / Conversations That Sell. Send
              promos, reminders, or surveys in minutes—no tech skills needed.
              Manage campaigns across channels with ease.
            </p>
          </div>
          <div className="border border-[#C4D7F5] rounded-xl p-4">
            <span className="text-rateup-graytext text-xl font-semibold">
              WhatsApp Business API
            </span>
            <p className="text-[#7A8289] text-xs font-normal">
              Official WhatsApp Business API integration with bulk messaging,
              templates, and automated responses.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-[#C4D7F5] rounded-xl p-4">
            <span className="text-rateup-graytext text-xl font-semibold">
              Ticketing & Escalation
            </span>
            <p className="text-[#7A8289] text-xs font-normal">
              Convert support inquiries and complaints into trackable tickets
              that can be automatically or manually assigned to team members.
            </p>
          </div>
          <div className="border border-[#C4D7F5] rounded-xl col-span-2 p-4">
            <span className="text-rateup-graytext text-xl font-semibold">
              Multi-branch
            </span>
            <p className="text-[#7A8289] text-xs font-normal">
              Super admins can add unlimited branches, track performance, and
              compare results across teams. Branch members see only their own
              activities, while admins oversee everything —ensuring service
              quality and efficiency.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-[#C4D7F5] rounded-xl col-span-2 p-4">
            <span className="text-rateup-graytext text-xl font-semibold">
              WhatsApp Flow
            </span>
            <p className="text-[#7A8289] text-xs font-normal">
              Build smart, automated workflows that respond instantly,
              personalize conversations, and move customers from hello to
              purchase — effortlessly.
            </p>
          </div>
          <div className="border border-[#C4D7F5] rounded-xl p-4">
            <span className="text-rateup-graytext text-xl font-semibold">
              QR Codes: Offline → Online
            </span>
            <p className="text-[#7A8289] text-xs font-normal">
              Turn receipts, posters, or tables into digital touchpoints for
              offers, feedback, or loyalty sign-ups.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
