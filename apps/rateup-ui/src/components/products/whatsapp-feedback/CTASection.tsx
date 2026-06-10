import { useNavigate } from "@tanstack/react-router";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

import style from "./feedback.module.css";

export default function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="bg-[linear-gradient(180deg,#E8F5F0_0%,#F4FBF8_100%)] py-[100px] text-center">
      <div className="max-w-[1200px] mx-auto px-8">
        <h2 className="font-display font-black text-[clamp(30px,4.2vw,52px)] tracking-[-0.025em] text-ink-800 max-w-[680px] mx-auto mb-4 leading-[1.08]">
          Ready to Hear What Your
          <br />
          Customers Really Think?
        </h2>
        <p className="text-[17px] text-ink-500 max-w-[580px] mx-auto mb-9 leading-[1.55]">
          Stop missing out on valuable feedback. Start turning customer insights
          into measurable growth with RateUp's WhatsApp Surveys. Book your free,
          personalized demo today.
        </p>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <button
            onClick={() => navigate({ to: "/signup" })}
            className={`${style.heroGradient} inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-base tracking-[-0.01em] pl-[22px] py-[6px] pr-[6px] text-white  shadow-[0_10px_26px_rgba(42,98,84,0.40)] hover:shadow-[0_14px_34px_rgba(42,98,84,0.55)] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap`}
          >
            Get Started
            <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-chip-dark flex-shrink-0">
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </span>
          </button>
          <BookDemoModal>
            <button className="bg-transparent font-extrabold text-base text-fb-green border border-fb-green py-3 px-[22px] rounded-xl hover:border-fb-green hover:bg-fb-green hover:text-white transition-colors cursor-pointer">
              Schedule a Demo
            </button>
          </BookDemoModal>
        </div>
      </div>
    </section>
  );
}
