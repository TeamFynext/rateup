import { RateupStar } from "@/components/integrations/logos";

interface LeadFunnelProps {
  onBookDemo: () => void;
}

export function LeadFunnel({ onBookDemo }: LeadFunnelProps) {
  return (
    <div className="reveal in rounded-[28px] overflow-hidden bg-[linear-gradient(175deg,#0C2B55_0%,#071A33_55%,#04101F_100%)] border border-[#4FC3FF]/20 shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_28px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(47,163,255,0.08)]">
      {/* Top visual */}
      <div className="relative pt-[36px] px-[28px] pb-[30px] text-center overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_65%_at_50%_0%,rgba(47,163,255,0.26),transparent_65%)]" />

        {/* Icons row */}
        <div className="relative z-[1] flex items-center justify-center gap-3.5 mb-3.5">
          <RateupStar className="h-8 w-8" />
          <div className="w-px h-9 bg-white/15" />
          <div className="w-11 h-11 rounded-[12px] bg-[#25D366] shrink-0 flex items-center justify-center shadow-[0_6px_20px_rgba(37,211,102,0.45)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
            </svg>
          </div>
        </div>

        <div className="relative z-[1] text-[12px] font-semibold text-white/45 tracking-[0.04em]">
          Automate it with RateUp.
        </div>
      </div>

      {/* CTA section */}
      <div className="pt-[18px] px-5 pb-[22px] flex flex-col gap-[13px]">
        {/* Free trial badge */}
        <div className="inline-flex items-center gap-1.5 self-start text-[10px] font-bold tracking-[0.12em] uppercase py-1 px-[11px] rounded-full text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/25">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_7px_#4ADE80] shrink-0" />
          Free Trial Available
        </div>

        {/* Headline */}
        <p className="font-nunito font-black text-[21px] text-white leading-[1.12] tracking-[-0.02em] m-0">
          Get your business on <span className="text-[#4FC3FF]">WhatsApp</span>{" "}
          with RateUp
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-[9px]">
          <button
            onClick={onBookDemo}
            className="font-bold text-[14.5px] cursor-pointer rounded-[11px] py-[13px] px-5 border border-transparent inline-flex items-center justify-center gap-2.25 w-full bg-[linear-gradient(180deg,#3D8BEE,#2360C8)] text-white shadow-[0_10px_30px_rgba(45,111,214,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 hover:shadow-[0_14px_38px_rgba(45,111,214,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:-translate-y-0.5 active:scale-[0.97]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Book a Demo
          </button>
          <a
            href="https://wa.me/?text=Hi%20RateUp%2C%20I%27d%20like%20to%20learn%20more"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[14.5px] cursor-pointer rounded-[11px] py-[13px] px-5 border border-transparent inline-flex items-center justify-center gap-2.25 w-full bg-[linear-gradient(180deg,#2BD367,#1FB855)] text-white shadow-[0_10px_28px_rgba(37,211,102,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] no-underline transition-all duration-200 hover:shadow-[0_14px_36px_rgba(37,211,102,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:-translate-y-0.5 active:scale-[0.97]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
            </svg>
            Chat with us on WhatsApp
          </a>
        </div>

        {/* Trust line */}
        <div className="flex justify-center flex-wrap text-[10.5px] text-white/38 font-medium">
          {["No credit card", "No expiry", "100+ clients"].map((item, i) => (
            <span
              key={item}
              className={`flex items-center gap-1.25 px-2 ${i > 0 ? "border-l border-white/9" : "border-none"}`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
