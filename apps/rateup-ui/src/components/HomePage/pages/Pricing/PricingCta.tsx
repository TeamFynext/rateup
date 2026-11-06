import { useNavigate } from "@tanstack/react-router";

import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink";

/**
 * Closing call to action: the brand-blue band that ends the page, sitting inside the
 * page container rather than running full bleed so it reads as the last card in the
 * stack above it.
 */
export const PricingCta = () => {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-[1240px] px-8 pb-24 pt-14">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-primary p-8 text-white md:p-14">
        <div className="flex-1 basis-[420px]">
          <h2 className="font-display m-0 mb-2 text-[26px] font-bold leading-[1.12] tracking-[-0.028em] text-white md:text-[36px]">
            Ready to launch on WhatsApp?
          </h2>
          <p className="m-0 max-w-[56ch] text-lg leading-[1.6] text-white/80">
            Start on the free plan today. No card, no apps, no forms.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/signup" })}
            className="h-10 cursor-pointer rounded-lg border-none bg-white px-6 text-sm font-medium text-primary transition-[filter,transform] duration-150 hover:brightness-[0.94] active:translate-y-px"
          >
            Get Started Free
          </button>
          <BookDemoLink>
            <span className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-white/40 px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-white/15">
              Talk to Sales
            </span>
          </BookDemoLink>
        </div>
      </div>
    </section>
  );
};
