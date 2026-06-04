import { useNavigate } from "@tanstack/react-router";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

import { BookDemoModal } from "../helper/BookDemoModal";

function LoyaltySection() {
  const navigate = useNavigate();
  return (
    <section className={`${styles.section} ${styles["section--tight"]}`}>
      <div className={styles.page}>
        <div className={`${styles["cta-band"]} ${styles.reveal}`}>
          <h2>Ready To Turn One Sale Into A Lifetime?</h2>

          <p>Launch loyalty, referrals and automated engagement on WhatsApp.</p>

          <div className={styles["cta-row"]}>
            <button
              className={`${styles.btn} ${styles["btn-primary"]}`}
              onClick={() =>
                navigate({
                  to: "/signup",
                })
              }
            >
              Start For Free
            </button>
            <BookDemoModal>
              <button className={`${styles.btn} ${styles["btn-ghost"]}`}>
                Book a Demo
              </button>
            </BookDemoModal>
          </div>

          <div className={styles.micro}>
            No credit card required · Cancel anytime
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoyaltySection;
