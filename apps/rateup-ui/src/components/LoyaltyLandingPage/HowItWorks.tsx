import { useNavigate } from "@tanstack/react-router";

import styles from "./loyalty.landing.module.css";

export default function HowItWorks() {
  const navigate = useNavigate();
  return (
    <section className={`${styles["light-sec"]}`} id="how" data-screen-label="How It Works">
      <div className={styles.wrap}>
        <div className={`${styles["sec-head"]} ${styles.reveal}`}>
          <h2>How It Works</h2>
          <p>Get your WhatsApp loyalty program up and running in minutes</p>
        </div>
        <div className={styles.steps}>
          <div className={`${styles.step} ${styles.reveal}`} data-d="1">
            <div className={styles.top}>
              <span className={styles.num}>1</span>
              <h3>
                Connect
                <br />
                WhatsApp
              </h3>
            </div>
            <p>Link your WhatsApp Business account in just a few clicks</p>
            <div className={styles.bgicon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                <line x1="18" y1="3" x2="18" y2="9" />
                <line x1="15" y1="6" x2="21" y2="6" />
              </svg>
            </div>
          </div>

          <div className={`${styles.step} ${styles.reveal}`} data-d="2">
            <div className={styles.top}>
              <span className={styles.num}>2</span>
              <h3>
                Set Up
                <br />
                Rewards
              </h3>
            </div>
            <p>Define your points system and rewards structure</p>
            <div className={styles.bgicon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>

          <div className={`${styles.step} ${styles.reveal}`} data-d="3">
            <div className={styles.top}>
              <span className={styles.num}>3</span>
              <h3>
                Invite
                <br />
                Customers
              </h3>
            </div>
            <p>Share your unique WhatsApp link with customers</p>
            <div className={styles.bgicon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>

          <div className={`${styles.step} ${styles.reveal}`} data-d="4">
            <div className={styles.top}>
              <span className={styles.num}>4</span>
              <h3>
                Start
                <br />
                Rewarding
              </h3>
            </div>
            <p>Automatically track purchases and send rewards</p>
            <div className={styles.bgicon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
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
          </div>
        </div>

        <div className={`${styles["center-cta"]} ${styles.reveal}`}>
          <button
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={() =>
              navigate({
                to: "/signup",
              })
            }
          >
            Launch WhatsApp Loyalty
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
      </div>
    </section>
  );
}
