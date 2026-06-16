import { RateupStar } from "@/components/integrations/logos";

interface LeadFunnelProps {
  onBookDemo: () => void;
}

export function LeadFunnel({ onBookDemo }: LeadFunnelProps) {
  return (
    <div
      className="reveal in"
      style={{
        borderRadius: 28,
        overflow: "hidden",
        background:
          "linear-gradient(175deg, #0C2B55 0%, #071A33 55%, #04101F 100%)",
        border: "1px solid rgba(79,163,255,0.2)",
        boxShadow:
          "0 0 0 1px rgba(0,0,0,0.3), 0 28px 60px rgba(0,0,0,0.5), 0 0 80px rgba(47,163,255,0.08)",
      }}
    >
      {/* Top visual */}
      <div
        style={{
          position: "relative",
          padding: "36px 28px 30px",
          textAlign: "center",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 80% 65% at 50% 0%, rgba(47,163,255,0.26), transparent 65%)",
          }}
        />

        {/* Icons row */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginBottom: 14,
          }}
        >
          {/* <img
            src="/rateup-star.png"
            alt="RateUp"
            style={{
              width: 52,
              height: 52,
              filter: 'drop-shadow(0 6px 20px rgba(248,149,29,0.55))',
              animation: 'twinkle 3.4s ease-in-out infinite',
            }}
          /> */}
          <RateupStar className="h-8 w-8" />
          <div
            style={{
              width: 1,
              height: 36,
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#25D366",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(37,211,102,0.45)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
            </svg>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.04em",
          }}
        >
          Automate it with RateUp.
        </div>
      </div>

      {/* CTA section */}
      <div
        style={{
          padding: "18px 20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 13,
        }}
      >
        {/* Free trial badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#4ADE80",
            padding: "4px 11px",
            borderRadius: 999,
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.25)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#4ADE80",
              boxShadow: "0 0 7px #4ADE80",
              flexShrink: 0,
            }}
          />
          Free Trial Available
        </div>

        {/* Headline */}
        <p
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 21,
            color: "#fff",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Get your business on{" "}
          <span style={{ color: "#4FC3FF" }}>WhatsApp</span> with RateUp
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={onBookDemo}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "14.5px",
              cursor: "pointer",
              borderRadius: "11px",
              padding: "13px 20px",
              border: "1px solid transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              width: "100%",
              background: "linear-gradient(180deg, #3D8BEE, #2360C8)",
              color: "#fff",
              boxShadow:
                "0 10px 30px rgba(45,111,214,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
              transition:
                "transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1), background 180ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow =
                "0 14px 38px rgba(45,111,214,0.6), inset 0 1px 0 rgba(255,255,255,0.3)";
              el.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow =
                "0 10px 30px rgba(45,111,214,0.45), inset 0 1px 0 rgba(255,255,255,0.25)";
              el.style.transform = "none";
            }}
            onMouseDown={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px) scale(0.97)";
            }}
            onMouseUp={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px) scale(1)";
            }}
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
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "14.5px",
              cursor: "pointer",
              borderRadius: "11px",
              padding: "13px 20px",
              border: "1px solid transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              width: "100%",
              background: "linear-gradient(180deg, #2BD367, #1FB855)",
              color: "#fff",
              boxShadow:
                "0 10px 28px rgba(37,211,102,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
              textDecoration: "none",
              transition:
                "transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1), background 180ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow =
                "0 14px 36px rgba(37,211,102,0.55), inset 0 1px 0 rgba(255,255,255,0.3)";
              el.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow =
                "0 10px 28px rgba(37,211,102,0.4), inset 0 1px 0 rgba(255,255,255,0.25)";
              el.style.transform = "none";
            }}
            onMouseDown={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px) scale(0.97)";
            }}
            onMouseUp={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px) scale(1)";
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
            </svg>
            Chat with us on WhatsApp
          </a>
        </div>

        {/* Trust line */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            fontSize: 10.5,
            color: "rgba(255,255,255,0.38)",
            fontWeight: 500,
          }}
        >
          {["No credit card", "No expiry", "100+ clients"].map((item, i) => (
            <span
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 8px",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.09)" : "none",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
