import { useNavigate } from "@tanstack/react-router";

import styles from "./loyalty.landing.module.css";

export default function WhyWhatsApp() {
  const navigate = useNavigate();
  return (
    <section
      className={`${styles.why} ${styles["light-sec"]}`}
      data-screen-label="Why It Works"
      style={{ paddingTop: 64 }}
    >
      <div className={styles.wrap}>
        <div className={`${styles["sec-head"]} ${styles.reveal}`}>
          <h2>Why WhatsApp Loyalty Works</h2>
          <p>Meet your customers where they already are—no app downloads required</p>
        </div>
        <div className={`${styles["center-cta"]} ${styles.reveal}`} style={{ marginTop: 34 }}>
          <button
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={() =>
              navigate({
                to: "/signup",
              })
            }
          >
            Start Loyalty On WhatsApp
            <span className={styles.chip}>
              <svg
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
        </div>

        <div className={styles["why-grid"]}>
          <div className={styles["why-col"]}>
            <div className={`${styles["why-item"]} ${styles.reveal}`}>
              <div className={styles.ic}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-5 4V5z" />
                  <text
                    x="12"
                    y="12"
                    fontFamily="Georgia"
                    fontSize="9"
                    fill="#0b2548"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    "
                  </text>
                </svg>
              </div>
              <h3>Direct Communication</h3>
              <p>Reach customers instantly through their preferred messaging platform</p>
            </div>
            <div className={`${styles["why-item"]} ${styles.reveal}`} data-d="1">
              <div className={styles.ic}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Customer Engagement</h3>
              <p>Drive 3x higher engagement rates compared to email campaigns</p>
            </div>
            <div className={`${styles["why-item"]} ${styles.reveal}`} data-d="2">
              <div className={styles.ic}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <h3>Increased Retention</h3>
              <p>Boost repeat purchases by up to 40% with personalized rewards</p>
            </div>
          </div>

          <div className={`${styles["why-center"]} ${styles.reveal}`}>
            <div className={styles.diagram}>
              <svg className={styles.wires} viewBox="0 0 320 380" preserveAspectRatio="none">
                <path d="M160 96 L160 142" />
                <path d="M160 212 L160 268" />
                <path d="M88 124 H40" strokeDasharray="0" />
                <path d="M232 124 H280" strokeDasharray="0" />
                <path d="M88 320 H40" strokeDasharray="0" />
                <path d="M232 320 H280" strokeDasharray="0" />
                <circle className={styles.dotA} cx="160" cy="96" r="3.5" fill="#3D6CD4" />
                <circle className={styles.dotB} cx="160" cy="212" r="3.5" fill="#F8951D" />
              </svg>
              <div className={`${styles.node} ${styles.wa}`}>
                <div className={styles["wa-tile"]}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.09c-.25.7-1.44 1.33-1.99 1.41-.51.08-1.16.11-1.87-.12-.43-.14-.99-.32-1.7-.63-2.99-1.29-4.94-4.3-5.09-4.5-.15-.2-1.22-1.62-1.22-3.09 0-1.47.77-2.19 1.04-2.49.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.59.84 2.04.91 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.71.81 2 .96.3.15.49.22.56.35.07.12.07.72-.18 1.42z" />
                  </svg>
                </div>
              </div>
              <div className={`${styles.node} ${styles.hub}`}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <div className={`${styles.node} ${styles.star}`}>
                <img
                  className={styles.st}
                  src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/logo-star.svg`}
                  alt=""
                />
              </div>
            </div>
          </div>

          <div className={styles["why-col"]}>
            <div className={`${styles["why-item"]} ${styles.reveal}`}>
              <div className={styles.ic}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>Easy Setup</h3>
              <p>Launch your loyalty program in minutes without technical complexity</p>
            </div>
            <div className={`${styles["why-item"]} ${styles.reveal}`} data-d="1">
              <div className={styles.ic}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <h3>Reward System</h3>
              <p>Flexible points and rewards that match your business goals</p>
            </div>
            <div className={`${styles["why-item"]} ${styles.reveal}`} data-d="2">
              <div className={styles.ic}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3>Instant Updates</h3>
              <p>Send real-time notifications about points, rewards, and offers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
