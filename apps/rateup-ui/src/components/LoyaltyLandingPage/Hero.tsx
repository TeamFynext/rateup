import { useEffect, useRef } from "react";

import { useNavigate } from "@tanstack/react-router";

import { BookDemoModal } from "../RateupHomePage/helper/BookDemoModal";
import styles from "./loyalty.landing.module.css";

const chevronSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform:scaleX(-1)"><polyline points="9 6 15 12 9 18"/></svg>`;

const T = "1:30 PM";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function countUp(el: HTMLElement, from: number, to: number, dur: number) {
  const start = performance.now();
  function tick(now: number) {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export default function Hero() {
  const navigate = useNavigate();
  const waBodyRef = useRef<HTMLDivElement>(null);
  const heroRunningRef = useRef(false);
  const heroVisibleRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const waBody = waBodyRef.current;
    if (!waBody) return;

    function mkMsg(side: string, html: string, time: string) {
      const d = document.createElement("div");
      d.className = `${styles.msg} ${styles[side as keyof typeof styles]}`;
      d.innerHTML =
        html +
        (time
          ? `<span class="${styles.t}">${time}${side === "out" ? " ✓✓" : ""}</span>`
          : "");
      waBody!.appendChild(d);
      requestAnimationFrame(() => d.classList.add(styles.show));
      waBody!.scrollTop = waBody!.scrollHeight;
      return d;
    }

    function mkTyping() {
      const d = document.createElement("div");
      d.className = `${styles.typing} ${styles.show}`;
      d.innerHTML = "<span></span><span></span><span></span>";
      waBody!.appendChild(d);
      waBody!.scrollTop = waBody!.scrollHeight;
      return d;
    }

    function mkCard() {
      const d = document.createElement("div");
      d.className = styles["msg-card"];
      d.innerHTML =
        `<div class="${styles.row}"><span>💰 Total Balance</span><span class="${styles.bal}" id="balVal">420</span></div>` +
        `<div class="${styles.row}"><span>⭐ Your Tier</span><span class="${styles.v}">Silver Member</span></div>` +
        `<div class="${styles.row}"><span>🎁 Reward Unlocked</span><span class="${styles.v} ${styles.warm}">50% OFF</span></div>`;
      waBody!.appendChild(d);
      requestAnimationFrame(() => d.classList.add(styles.show));
      waBody!.scrollTop = waBody!.scrollHeight;
      return d;
    }

    function mkReplies(labels: string[]) {
      const wrap = document.createElement("div");
      wrap.className = styles["wa-replies"];
      labels.forEach((l, i) => {
        const b = document.createElement("div");
        b.className = styles.qr;
        b.innerHTML = chevronSVG + "<span>" + l + "</span>";
        wrap.appendChild(b);
        setTimeout(() => b.classList.add(styles.show), 120 * (i + 1));
      });
      waBody!.appendChild(wrap);
      waBody!.scrollTop = waBody!.scrollHeight;
      return wrap;
    }

    async function typingThen(ms: number) {
      const t = mkTyping();
      await sleep(ms);
      t.remove();
    }

    async function waitVisible() {
      while (!heroVisibleRef.current && mountedRef.current) await sleep(220);
    }

    async function runHero() {
      if (heroRunningRef.current) return;
      heroRunningRef.current = true;
      while (mountedRef.current) {
        // reset
        waBody!
          .querySelectorAll(
            `.${styles.msg}, .${styles.typing}, .${styles["msg-card"]}, .${styles["wa-replies"]}`,
          )
          .forEach((n) => n.remove());
        await waitVisible();
        if (!mountedRef.current) break;
        await sleep(500);
        if (!mountedRef.current) break;

        mkMsg("out", "Just grabbed the Hydrating Skin Kit! 🛍️", T);
        await sleep(900);
        if (!mountedRef.current) break;
        await typingThen(1100);
        if (!mountedRef.current) break;
        mkMsg("in", "Hey Neha 🎉 Your order is confirmed & on its way!", T);
        await sleep(950);
        if (!mountedRef.current) break;
        await typingThen(1000);
        if (!mountedRef.current) break;
        mkMsg(
          "in",
          `You just earned <span class="${styles.pts}">+120 points</span> 💛`,
          T,
        );
        await sleep(650);
        if (!mountedRef.current) break;
        const card = mkCard();
        await sleep(420);
        if (!mountedRef.current) break;
        const balEl = card.querySelector("#balVal") as HTMLElement | null;
        if (balEl) countUp(balEl, 420, 540, 1100);
        await sleep(1600);
        if (!mountedRef.current) break;
        mkReplies(["Check Your Rewards", "Redeem Points", "View Offers"]);
        await sleep(1700);
        if (!mountedRef.current) break;
        mkMsg("out", "Redeem now ✅", T);
        await sleep(800);
        if (!mountedRef.current) break;
        await typingThen(1000);
        if (!mountedRef.current) break;
        mkMsg(
          "in",
          "Done! Code <b>YUM50</b> applied — 50% off your next order 🎁",
          T,
        );
        await sleep(3600);
        if (!mountedRef.current) break;
        // fade out
        waBody!
          .querySelectorAll(
            `.${styles.msg}, .${styles["msg-card"]}, .${styles["wa-replies"]}`,
          )
          .forEach((n) => {
            const el = n as HTMLElement;
            el.style.transition = "opacity .5s ease";
            el.style.opacity = "0";
          });
        await sleep(650);
        if (!mountedRef.current) break;
      }
      heroRunningRef.current = false;
    }

    const phoneEl = waBody.closest(".phone") as HTMLElement | null;
    if (phoneEl) {
      const r0 = phoneEl.getBoundingClientRect();
      heroVisibleRef.current = r0.top < window.innerHeight && r0.bottom > 0;

      const obs = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            heroVisibleRef.current = e.isIntersecting;
          });
        },
        { threshold: 0.05 },
      );
      obs.observe(phoneEl);
      setTimeout(() => {
        if (!heroVisibleRef.current) heroVisibleRef.current = true;
      }, 900);
    } else {
      heroVisibleRef.current = true;
    }

    runHero();

    return () => {
      mountedRef.current = false;
      heroRunningRef.current = false;
    };
  }, []);

  return (
    <section
      className={`${styles.hero} ${styles["on-dark"]}`}
      data-screen-label="Hero"
    >
      <div className={styles.beam}></div>
      <div className={styles.wrap}>
        <div className={styles["hero-grid"]}>
          <div className={styles["hero-copy"]}>
            <span className={styles["badge-trust"]}>
              <span className={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </span>
              Trusted By 500+ Businesses
            </span>
            <h1>
              Build Loyalty That
              <br />
              Actually Works
              <br />
              <span className={styles.accent}>On WhatsApp.</span>
            </h1>
            <p className={styles.sub}>
              Reward customers, boost retention, and drive repeat purchases
              through the messaging app they already use daily.
            </p>
            <div className={styles["hero-cta"]}>
              <button
                className={`${styles.btn} ${styles["btn-primary"]}`}
                onClick={() =>
                  navigate({
                    to: "/signup",
                  })
                }
              >
                Start WhatsApp Loyalty
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
              <BookDemoModal>
                <button className={`${styles.btn} ${styles["btn-secondary"]}`}>
                  Book A Demo
                  <span className={styles.chip}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </button>
              </BookDemoModal>
            </div>
          </div>

          <div className={styles["hero-visual"]}>
            {/* floating reward card behind */}
            <div className={styles["reward-card"]} aria-hidden="true">
              <div className={styles["hero-img"]}>
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2b62c4"
                  strokeWidth="1.4"
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
              <div className={styles.rtxt}>
                <p>
                  Hi Neha 😊 You just earned <b>120 loyalty points</b> from your
                  recent purchase.
                  <br />
                  <br />
                  💰 Total Balance: <b>540 Points</b>
                  <br />⭐ Your Tier: <b>Silver Member</b>
                  <br />
                  🎁 Reward Unlocked: <b>50% Off</b>
                </p>
              </div>
              <div className={styles.qrep}>↩︎ Check Your Rewards</div>
              <div className={styles.qrep}>↩︎ Redeem Points</div>
            </div>

            {/* phone with live WhatsApp loyalty chat */}
            <div className={styles.phone}>
              <div className={styles["phone-notch"]}></div>
              <div className={styles.screen}>
                <div className={styles["wa-head"]}>
                  <div className={styles.av}>N</div>
                  <div>
                    <div className={styles.nm}>RateUp Loyalty</div>
                    <div className={styles.st}>business account · online</div>
                  </div>
                  <div className={styles.ic}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                </div>
                <div className={styles["wa-body"]} ref={waBodyRef}>
                  <div className={styles["wa-date"]}>TODAY</div>
                </div>
                <div className={styles["wa-input"]}>
                  <div className={styles.field}>Message</div>
                  <div className={styles.mic}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
