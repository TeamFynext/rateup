interface BlogHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function BlogHero({ searchQuery, onSearchChange }: BlogHeroProps) {
  return (
    <header className="relative overflow-hidden pt-11 bg-white border-b border-[#ECECEA]">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,_rgba(28,81,142,0.05),_transparent_70%)]" />

      <div className="max-w-[1200px] mx-auto px-[28px]">
        <div className="reveal in relative z-[1] flex flex-col items-center text-center pb-[30px] gap-3">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-[7px] text-[11px] font-bold tracking-[0.16em] uppercase py-[5px] px-[14px] rounded-full text-[#1C518E] bg-[#1C518E]/[0.07] border border-[#1C518E]/[0.18]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1C518E] shrink-0" />
            Knowledge Hub
          </div>

          {/* Title */}
          <h1 className="font-nunito font-black text-[clamp(34px,4.5vw,54px)] text-[#0E1E3A] leading-[1.05] tracking-[-0.025em] m-0">
            WhatsApp Marketing &amp;
            <br />
            <span className="text-[#2FA3FF]">Loyalty Insights</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[15.5px] text-[#64666A] m-0 max-w-[420px] leading-[1.55]">
            Actionable guides, case studies and strategies to grow your business on WhatsApp.
          </p>

          {/* Search */}
          <div className="relative w-full max-w-[400px]">
            <input
              type="search"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
              className="w-full py-[11px] pr-[44px] pl-[18px] bg-[#F4F5F2] border border-[#DCDEDD] rounded-full text-[#0E1E3A] text-[14px] outline-none transition-all duration-200 focus:bg-white focus:border-[#1C518E] focus:shadow-[0_0_0_3px_rgba(28,81,142,0.12)]"
            />
            <svg
              className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#9B9D9A] pointer-events-none"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
