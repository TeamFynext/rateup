interface BlogHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function BlogHero({ searchQuery, onSearchChange }: BlogHeroProps) {
  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: 44,
        background: "#fff",
        borderBottom: "1px solid #ECECEA",
      }}
    >
      {/* Subtle gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 70% at 50% 0%, rgba(28,81,142,0.05), transparent 70%)",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingBottom: 30,
            gap: 12,
          }}
          className="reveal in"
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#1C518E",
              padding: "5px 14px",
              borderRadius: 9999,
              background: "rgba(28,81,142,0.07)",
              border: "1px solid rgba(28,81,142,0.18)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#1C518E",
                flexShrink: 0,
              }}
            />
            Knowledge Hub
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "Nunito, ui-rounded, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(34px, 4.5vw, 54px)",
              color: "#0E1E3A",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            WhatsApp Marketing &amp;
            <br />
            <span
              style={{
                background:
                  "linear-gradient(100deg, #6BD0FF 0%, #2FA3FF 55%, #2C6FD6 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Loyalty Insights
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 15.5,
              color: "#64666A",
              margin: 0,
              maxWidth: 420,
              lineHeight: 1.55,
            }}
          >
            Actionable guides, case studies and strategies to grow your business
            on WhatsApp.
          </p>

          {/* Search */}
          <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
            <input
              type="search"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onInput={(e) =>
                onSearchChange((e.target as HTMLInputElement).value)
              }
              style={{
                width: "100%",
                padding: "11px 44px 11px 18px",
                background: "#F4F5F2",
                border: "1px solid #DCDEDD",
                borderRadius: 9999,
                color: "#0E1E3A",
                fontFamily: "inherit",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.background = "#fff";
                e.target.style.borderColor = "#1C518E";
                e.target.style.boxShadow = "0 0 0 3px rgba(28,81,142,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.background = "#F4F5F2";
                e.target.style.borderColor = "#DCDEDD";
                e.target.style.boxShadow = "none";
              }}
            />
            <svg
              style={{
                position: "absolute",
                right: 15,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9B9D9A",
                pointerEvents: "none",
              }}
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
