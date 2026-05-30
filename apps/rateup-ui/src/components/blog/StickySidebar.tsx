// StickySidebar.tsx
// Converted from the RateUp HTML sidebar — all styles preserved as inline/Tailwind

const PHOTO_BASE64 = `data:image/png;base64,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`;

// Ring SVG for stat cards
function Ring({
  stroke,
  offset,
  value,
  color,
}: {
  stroke: string;
  offset: number;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{ position: "relative", width: 40, height: 40, margin: "0 auto" }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="#EAECF8"
          strokeWidth="4.5"
        />
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke={stroke}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="94.2"
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  stroke,
  offset,
  value,
  color,
}: {
  label: string;
  stroke: string;
  offset: number;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        borderRadius: 12,
        padding: "7px 8px 6px",
        width: 68,
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: 7,
          fontWeight: 800,
          letterSpacing: "0.07em",
          color: "#555",
          marginBottom: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <Ring stroke={stroke} offset={offset} value={value} color={color} />
    </div>
  );
}

export default function StickySidebar() {
  return (
    <div style={{ width: 268, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Google Font import via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        .rateup-btn-trial {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 13px;
          background: rgba(255,255,255,0.14);
          border: 1.5px solid rgba(255,255,255,0.32);
          border-radius: 13px;
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 9px;
          transition: background .2s;
          gap: 6px;
        }
        .rateup-btn-trial:hover { background: rgba(255,255,255,0.22); }
        .rateup-btn-wa {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 13px;
          background: #25D366;
          border: none;
          border-radius: 13px;
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          gap: 7px;
          transition: background .2s;
        }
        .rateup-btn-wa:hover { background: #1EBD5A; }
      `}</style>

      {/* Main card */}
      <div
        style={{
          width: 268,
          borderRadius: 24,
          overflow: "hidden",
          background:
            "linear-gradient(168deg, #061140 0%, #0C2383 42%, #1A52E8 78%, #2462FF 100%)",
          boxShadow: "0 20px 60px rgba(8,24,120,0.45)",
        }}
      >
        {/* ── HERO ── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 300,
            overflow: "hidden",
            background:
              "linear-gradient(168deg, #061140 0%, #0C2383 55%, #1A52E8 100%)",
          }}
        >
          {/* Stats grid — behind photo (z-index 1) */}
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              zIndex: 1,
            }}
          >
            <StatCard
              label="SENT"
              stroke="#6C7FFF"
              offset={18.84}
              value="80%"
              color="#4A5BDE"
            />
            <StatCard
              label="DELIVERED"
              stroke="#A78BFA"
              offset={37.68}
              value="60%"
              color="#7C3AED"
            />
            <StatCard
              label="READ"
              stroke="#38BDF8"
              offset={56.52}
              value="40%"
              color="#0369A1"
            />
            <StatCard
              label="REPLIED"
              stroke="#34D399"
              offset={75.36}
              value="20%"
              color="#047857"
            />
          </div>

          {/* WhatsApp badge — behind photo (z-index 1) */}
          <div style={{ position: "absolute", left: 14, top: 72, zIndex: 1 }}>
            <div
              style={{
                width: 50,
                height: 50,
                background: "#25D366",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 18px rgba(37,211,102,0.55)",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  background: "#FF3B30",
                  color: "#fff",
                  fontSize: 7,
                  fontWeight: 900,
                  borderRadius: 20,
                  padding: "2px 5px",
                  border: "1.5px solid rgba(255,255,255,0.9)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                99+
              </span>
              <svg width="27" height="27" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 2.5C8.54 2.5 2.5 8.54 2.5 16c0 2.37.64 4.6 1.76 6.52L2.5 29.5l7.24-1.73A13.44 13.44 0 0016 29.5c7.46 0 13.5-6.04 13.5-13.5S23.46 2.5 16 2.5z"
                  fill="white"
                />
                <path
                  d="M22.4 19.85c-.3-.15-1.79-.88-2.07-.98-.27-.1-.47-.15-.67.15-.2.3-.78.98-.96 1.18-.18.2-.36.23-.66.08-.3-.15-1.28-.47-2.44-1.5-.9-.8-1.51-1.8-1.69-2.1-.18-.3-.02-.46.14-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.18-.01-.38-.01-.58-.01s-.53.07-.8.38c-.28.3-1.06 1.03-1.06 2.52 0 1.48 1.08 2.91 1.23 3.11.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.79-.73 2.04-1.43.26-.7.26-1.3.18-1.43-.07-.13-.27-.2-.57-.35z"
                  fill="#25D366"
                />
              </svg>
            </div>
          </div>

          {/* Gradient top — z-index 2 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 50,
              background:
                "linear-gradient(to bottom, #061140 0%, transparent 100%)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />

          {/* Woman photo — z-index 3 */}
          <img
            src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/blog/girlwithphone.png`}
            alt="Woman smiling while using WhatsApp on her phone"
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-52%)",
              height: 310,
              width: "auto",
              objectFit: "contain",
              objectPosition: "top center",
              zIndex: 3,
            }}
          />

          {/* Gradient bottom — z-index 4 */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 85,
              background:
                "linear-gradient(to top, #1340C8 0%, transparent 100%)",
              zIndex: 4,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "10px 18px 0" }}>
          {/* Free trial chip */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 30,
              padding: "4px 11px",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.88)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#25D366",
                boxShadow: "0 0 8px #25D366",
                display: "inline-block",
              }}
            />
            Free Trial Available
          </div>

          {/* Heading */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.2,
              letterSpacing: "-0.4px",
              marginBottom: 16,
            }}
          >
            Get your business
            <br />
            on{" "}
            <em style={{ color: "#82CBFF", fontStyle: "normal" }}>WhatsApp</em>
            <br />
            with RateUp
          </div>

          {/* CTA buttons */}
          <a href="https://rateup.app/signup" className="rateup-btn-trial">
            Start Free Trial &nbsp;→
          </a>
          <a href="https://rateup.app/contact-us" className="rateup-btn-wa">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
              <path d="M16 2.5C8.54 2.5 2.5 8.54 2.5 16c0 2.37.64 4.6 1.76 6.52L2.5 29.5l7.24-1.73A13.44 13.44 0 0016 29.5c7.46 0 13.5-6.04 13.5-13.5S23.46 2.5 16 2.5z" />
            </svg>
            Book a Demo
          </a>
        </div>

        {/* ── TRUST BAR ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "13px 0 18px",
            gap: 0,
          }}
        >
          {["No credit card", "No expiry", "100+ clients"].map((text, i) => (
            <span key={text} style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.48)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {text}
              </span>
              {i < 2 && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.22)",
                    margin: "0 6px",
                    display: "inline-block",
                  }}
                />
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
