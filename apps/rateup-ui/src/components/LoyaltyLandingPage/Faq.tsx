import { useEffect, useRef, useState } from "react";

import styles from "./loyalty.landing.module.css";

const faqs = [
  {
    q: "How Does WhatsApp Loyalty Work?",
    a: "Customers join your loyalty program with a single WhatsApp message — no app, no form. Every purchase automatically earns points, unlocks tiers, and triggers personalized reward messages right inside the chat they already use every day.",
  },
  {
    q: "Do Customers Need To Download An App?",
    a: "No. That is the whole point. The entire experience — enrollment, points, tiers, rewards and redemption — happens inside WhatsApp. There is nothing for your customers to install, sign up for, or remember.",
  },
  {
    q: "Is This Compliant With WhatsApp Business API?",
    a: "Yes. RateUp is built on the official WhatsApp Business API and follows Meta's messaging policies, including opt-in requirements and approved message templates, so your program stays fully compliant.",
  },
  {
    q: "How Do Businesses Track Points And Rewards?",
    a: "Everything is visible in your RateUp dashboard — real-time customer profiles, points balances, tier status, referral activity and engagement history. You can see exactly what each customer has earned and redeemed.",
  },
  {
    q: "How Quickly Can I Get Started?",
    a: "Most businesses launch in under 10 minutes. Connect your WhatsApp Business account, define your points and rewards, share your link, and you are live — no developers required.",
  },
  {
    q: "What If I Already Have A Loyalty Program?",
    a: "You can migrate existing members and point balances into RateUp, or run both in parallel. Our integrations with Shopify, CRMs and payment gateways keep your customer and order data in sync automatically.",
  },
];

function FAQItem({ q, a }: Readonly<{ q: string; a: string }>) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const ansRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ansRef.current) return;
    if (open) {
      ansRef.current.style.maxHeight = ansRef.current.scrollHeight + "px";
    } else {
      ansRef.current.style.maxHeight = "0";
    }
  }, [open]);

  useEffect(() => {
    if (!itemRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      },
    );
    observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={itemRef}
      className={`${styles["faq-item"]} ${styles.reveal} ${revealed ? styles.in : ""} ${
        open ? styles.open : ""
      }`}
    >
      <button className={styles["faq-q"]} onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className={styles.pm}></span>
      </button>
      <div className={styles["faq-a"]} ref={ansRef}>
        <div className={styles.inner}>{a}</div>
      </div>
    </div>
  );
}

export default function Faq() {
  return (
    <section className={`${styles.faq} ${styles["on-dark"]}`} id="faq" data-screen-label="FAQ">
      <div className={styles.wrap}>
        <div className={`${styles["sec-head"]} ${styles.reveal}`}>
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className={styles["faq-list"]}>
          {faqs.map((f, i) => (
            <FAQItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
