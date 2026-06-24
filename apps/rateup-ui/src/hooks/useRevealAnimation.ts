import { useEffect } from "react";

import styles from "@/components/LoyaltyLandingPage/loyalty.landing.module.css";

export function useRevealAnimation() {
  useEffect(() => {
    const revObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.in);
            revObs.unobserve(e.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    document.querySelectorAll(`.${styles.reveal}`).forEach((el) => revObs.observe(el));

    return () => revObs.disconnect();
  }, []);
}
