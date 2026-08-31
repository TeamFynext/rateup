import { useNavigate } from "@tanstack/react-router";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";

/**
 * Closing call to action. Lives outside PricingSection so the route can place it after
 * the FAQ, which is the order the design lays the page out in.
 */
export const PricingCta = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-[radial-gradient(ellipse_at_50%_0%,#0D2E5C_0%,var(--color-ru-blue-900)_60%,var(--color-ru-blue-950)_100%)] text-white">
      <div className="mx-auto max-w-[1240px] px-8 py-24 text-center">
        <h2 className="font-nunito mx-auto my-0 max-w-[720px] text-[36px] font-black leading-[1.05] tracking-[-0.025em] text-white md:text-[48px]">
          Ready to launch on <span className="text-ru-blue-300">WhatsApp?</span>
        </h2>
        <p className="mx-auto mb-8 mt-[18px] max-w-[520px] text-[17px] text-white/70">
          Start on Free today. Upgrade the day your conversations outgrow it.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate({ to: "/signup" })}
            className="bg-ru-star cursor-pointer rounded-[10px] border-none px-[26px] py-[15px] text-[15px] font-extrabold text-ru-blue-900 shadow-[0_8px_24px_rgba(248,149,29,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px"
          >
            Create free account
          </button>
          <BookDemoModal>
            <span className="inline-block cursor-pointer rounded-[10px] border border-white/20 px-[22px] py-[15px] text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-white/10">
              Talk to sales →
            </span>
          </BookDemoModal>
        </div>
      </div>
    </section>
  );
};
