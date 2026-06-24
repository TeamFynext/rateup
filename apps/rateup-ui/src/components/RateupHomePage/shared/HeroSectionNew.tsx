import { RateupStar } from "@/components/integrations/logos";

import { BookDemoModal } from "../helper/BookDemoModal";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

function HeroSectionNew() {
  return (
    <>
      {" "}
      <header className={styles.hero} id="top">
        <div className={styles["hero-bg"]} />
        <div className={styles.page}>
          <div className={styles["hero-grid"]}>
            {/* Left: copy */}
            <div className={`${styles.reveal} ${styles["in"]}`}>
              <div className={styles["hero-pill"]}>
                <span className={styles.tagdot}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--cyan)",
                      boxShadow: "0 0 10px var(--cyan)",
                      display: "inline-block",
                    }}
                  />
                  New
                </span>
                Loyalty + Referrals, fully automated on WhatsApp
              </div>
              <h1>
                Engage Customers
                <br />
                Everywhere They <span className={styles["grad-cyan"]}>Already Are</span>
              </h1>
              <p className={styles.lead}>
                Most customers buy once and disappear. RateUp fixes that.
              </p>
              <p className={styles.sub}>
                Loyalty programs, referral automation, and post-purchase feedback — all running on
                WhatsApp, automatically. No new apps for your customers. No extra work for your
                team.
              </p>
              <div className={styles["cta-row"]}>
                <BookDemoModal>
                  <button className={`${styles.btn} ${styles["btn-primary"]}`} type="button">
                    Book a Demo
                    <svg
                      width="17"
                      height="17"
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
                  </button>
                </BookDemoModal>
                <button
                  className={`${styles.btn} ${styles["btn-ghost"]}`}
                  onClick={() => {
                    const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
                    const message = encodeURIComponent("Hi, I need help with support");
                    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
                  </svg>
                  Chat with us on WhatsApp
                </button>
              </div>
              <div className={styles.works}>
                <div className={styles.lbl}>Works With</div>
                <div className={styles.chips}>
                  <span className={styles.chip}>
                    <span className={`${styles.ci} ${styles["ic-wa"]}`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
                      </svg>
                    </span>
                    WhatsApp
                  </span>
                  <span className={styles.chip}>
                    <span className={`${styles.ci} ${styles["ic-ig"]}`}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="5.5" />
                        <circle cx="12" cy="12" r="4.2" />
                        <circle cx="17.6" cy="6.4" r="1.1" fill="#fff" stroke="none" />
                      </svg>
                    </span>
                    Instagram
                  </span>
                  <span className={styles.chip}>
                    <span className={`${styles.ci} ${styles["ic-msgr"]}`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                        <path d="M12 2C6.27 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.14 7.13.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.54-.04 1.02.28 2.1.43 3.2.43 5.73 0 10-4.2 10-9.7S17.73 2 12 2zm6 7.46l-2.93 4.65c-.47.74-1.46.93-2.17.4l-2.33-1.74a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.68-.62l2.93-4.65c.47-.74 1.46-.93 2.17-.4l2.33 1.74c.21.16.5.16.72 0l3.15-2.39c.42-.32.97.18.68.62z" />
                      </svg>
                    </span>
                    Messenger
                  </span>
                  <span className={styles.chip}>
                    <span className={`${styles.ci} ${styles["ic-blue"]}`}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                    Web Chat
                  </span>
                  <span className={styles.chip}>
                    <span className={styles.ci} style={{ background: "#95BF47" }}>
                      <b style={{ fontSize: 12, color: "#fff", fontWeight: 800 }}>S</b>
                    </span>
                    Shopify
                  </span>
                  <span className={styles.chip}>
                    <span className={styles.ci} style={{ background: "#7F54B3" }}>
                      <b style={{ fontSize: 11, color: "#fff", fontWeight: 800 }}>W</b>
                    </span>
                    WooCommerce
                  </span>
                </div>
              </div>
            </div>

            {/* Right: orbital diagram */}
            <div className={`${styles.reveal} ${styles.in}`} data-d="1">
              <div className={styles["orbit-wrap"]}>
                {/* spokes + dotted ring paths */}
                <svg className={styles["orbit-paths"]} viewBox="0 0 100 100" aria-hidden="true">
                  <circle className={styles["op-ring"]} cx="50" cy="50" r="29" />

                  <circle
                    className={`${styles["op-ring"]} ${styles["op-ring--out"]}`}
                    cx="50"
                    cy="50"
                    r="42"
                  />
                </svg>

                {/* concentric glow rings */}
                <div className={styles["orbit-rings"]}>
                  <div className={`${styles.ring} ${styles.r1}`}></div>
                  <div className={`${styles.ring} ${styles.r2}`}></div>
                  <div className={`${styles.ring} ${styles.r3}`}></div>
                </div>

                {/* central logo hub */}
                <div className={styles["orbit-core"]}>
                  <span className={styles["orbit-core__sheen"]}></span>

                  <span className={styles["orbit-core__disc"]}>
                    <RateupStar className="h-14 w-14" />
                  </span>

                  <span className={styles["orbit-core__label"]}>RateUp</span>
                </div>

                {/* inner ring · channels */}

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-in"]}`}
                  style={{ "--a": "-50deg" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-wa"]}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
                    </svg>
                  </span>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-in"]}`}
                  style={{ "--a": "50deg", "--fd": ".6s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-ig"]}`}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5.5" />
                      <circle cx="12" cy="12" r="4.2" />
                      <circle cx="17.6" cy="6.4" r="1.1" fill="#fff" stroke="none" />
                    </svg>
                  </span>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-in"]}`}
                  style={{ "--a": "140deg", "--fd": "1.1s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-msgr"]}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 2C6.27 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.14 7.13.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.54-.04 1.02.28 2.1.43 3.2.43 5.73 0 10-4.2 10-9.7S17.73 2 12 2zm6 7.46l-2.93 4.65c-.47.74-1.46.93-2.17.4l-2.33-1.74a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.68-.62l2.93-4.65c.47-.74 1.46-.93 2.17-.4l2.33 1.74c.21.16.5.16.72 0l3.15-2.39c.42-.32.97.18.68.62z" />
                    </svg>
                  </span>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-in"]}`}
                  style={{ "--a": "230deg", "--fd": ".3s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-blue"]}`}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>
                </div>

                {/* outer ring · capabilities */}

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-out"]} ${styles["lbl-out"]}`}
                  style={{ "--a": "-18deg", "--fd": ".8s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-cyan"]}`}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>

                  <em>Automation</em>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-out"]} ${styles["lbl-out"]}`}
                  style={{ "--a": "54deg", "--fd": "1.4s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-warm"]}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1.8l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 16.84 6.09 19.96l1.13-6.57L2.45 8.74l6.6-.96L12 1.8z" />
                    </svg>
                  </span>

                  <em>Loyalty</em>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-out"]} ${styles["lbl-out"]}`}
                  style={{ "--a": "126deg", "--fd": ".5s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-violet"]}`}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 11l18-5v12L3 14v-3z" />
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                    </svg>
                  </span>

                  <em>Campaigns</em>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-out"]} ${styles["lbl-out"]}`}
                  style={{ "--a": "198deg", "--fd": "1.0s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-cyan"]}`}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>

                  <em>Feedback</em>
                </div>

                <div
                  className={`${styles["orbit-node"]} ${styles["ring-out"]} ${styles["lbl-out"]}`}
                  style={{ "--a": "270deg", "--fd": ".2s" } as React.CSSProperties}
                >
                  <span className={`${styles.ic} ${styles["ic-blue"]}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
                      <path d="M19 14l.7 2L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14z" />
                    </svg>
                  </span>

                  <em>AI Workflows</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default HeroSectionNew;
