import { useEffect, type ReactNode } from "react";

import { RateupStar } from "@/components/integrations/logos";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

interface FeatureCardProps {
  viz: ReactNode;
  icon: ReactNode;
  iconClass: string;
  title: string;
  desc: string;
  tags: string[];
  delay?: string;
}

function FeatureCard({
  viz,
  icon,
  iconClass,
  title,
  desc,
  tags,
  delay,
}: FeatureCardProps) {
  return (
    <div className={`${styles.feat} ${styles.reveal}`} data-d={delay}>
      <div className={styles.viz}>{viz}</div>

      <div className={styles.body}>
        <div className={styles.fhead}>
          <span className={`${styles.ficon} ${iconClass}`}>{icon}</span>

          <h3>{title}</h3>
        </div>

        <p>{desc}</p>

        <div className={styles["tag-row"]}>
          {tags.map((t) => (
            <span key={t} className={styles.ftag}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  useEffect(() => {
    const els = document.querySelectorAll(`.${styles.reveal}`);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);

            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
      },
    );

    els.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);
  return (
    <section className={styles.section} id="features">
      <div className={styles.page}>
        <div className={styles["sec-head"]}>
          <span className={`${styles.eyebrow} ${styles.reveal}`}>
            <span className={styles.dot} />
            The Platform
          </span>

          <h2 className={styles.reveal} data-d="1">
            Everything You Need In{" "}
            <span className={styles["grad-cyan"]}>One Place</span>
          </h2>

          <p className={styles.reveal} data-d="2">
            Ten tools that used to live in ten tabs — unified into a single,
            automated engagement engine.
          </p>
        </div>

        <div className={styles["feat-grid"]}>
          {/* 1 */}
          <FeatureCard
            viz={
              <div className={`${styles["viz-pad"]} ${styles["viz-inbox"]}`}>
                <div className={`${styles["ic-item"]} ${styles.on}`}>
                  <span
                    className={`${styles.ci} ${styles["ic-wa"]}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.07.13.07.73-.17 1.41z" />
                    </svg>
                  </span>

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "55%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />

                    <div
                      className={styles.mline}
                      style={{
                        width: "80%",
                        marginTop: 6,
                      }}
                    />
                  </div>

                  <span
                    className={styles.mdot}
                    style={{ background: "var(--cyan)" }}
                  />
                </div>

                <div className={styles["ic-item"]}>
                  <span
                    className={`${styles.ci} ${styles["ic-ig"]}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
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
                      <circle
                        cx="17.6"
                        cy="6.4"
                        r="1.1"
                        fill="#fff"
                        stroke="none"
                      />
                    </svg>
                  </span>

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "42%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />

                    <div
                      className={styles.mline}
                      style={{
                        width: "68%",
                        marginTop: 6,
                      }}
                    />
                  </div>
                </div>

                <div className={styles["ic-item"]}>
                  <span
                    className={`${styles.ci} ${styles["ic-msgr"]}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 2C6.27 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.14 7.13.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.54-.04 1.02.28 2.1.43 3.2.43 5.73 0 10-4.2 10-9.7S17.73 2 12 2zm6 7.46l-2.93 4.65c-.47.74-1.46.93-2.17.4l-2.33-1.74a.6.6 0 0 0-.72 0l-3.15 2.39c-.42.32-.97-.18-.68-.62l2.93-4.65c.47-.74 1.46-.93 2.17-.4l2.33 1.74c.21.16.5.16.72 0l3.15-2.39c.42-.32.97.18.68.62z" />
                    </svg>
                  </span>

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "48%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />

                    <div
                      className={styles.mline}
                      style={{
                        width: "72%",
                        marginTop: 6,
                      }}
                    />
                  </div>
                </div>
              </div>
            }
            iconClass={styles["ic-blue"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
              </svg>
            }
            title="Omni Channel Inbox"
            desc="WhatsApp, Instagram, Messenger and web chat in one shared inbox. Route conversations to the right agent or bot with smart rules — never miss a message again."
            tags={["Shared inbox", "Smart routing", "Canned replies"]}
          />
          <FeatureCard
            delay="1"
            viz={
              <div className={styles["loy-card"]}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-2)",
                      fontWeight: 600,
                    }}
                  >
                    Gold Member
                  </span>
                  <RateupStar className="w-5 h-5 block" />
                </div>

                <div className={styles["loy-pts"]} style={{ marginTop: 8 }}>
                  1,250
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--ink-3)",
                      fontWeight: 600,
                    }}
                  >
                    {" "}
                    pts
                  </span>
                </div>

                <div className={styles["loy-progress"]}>
                  <span />
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-3)",
                    marginTop: 7,
                  }}
                >
                  280 pts to next reward
                </div>
              </div>
            }
            iconClass={styles["ic-warm"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1.8l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 16.84 6.09 19.96l1.13-6.57L2.45 8.74l6.6-.96L12 1.8z" />
              </svg>
            }
            title="WhatsApp Loyalty"
            desc="Points, tiers and rewards — all on WhatsApp. No apps, no forms, just one message."
            tags={["Points & tiers", "Referrals"]}
          />
          <FeatureCard
            viz={
              <div
                className={styles["viz-pad"]}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className={styles.mini}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                  }}
                >
                  <div className={styles.mrow} style={{ marginBottom: 13 }}>
                    <span
                      className={styles.mavatar}
                      style={{
                        background: "linear-gradient(135deg,#4FC3FF,#2360C8)",
                      }}
                    />

                    <div style={{ flex: 1 }}>
                      <div
                        className={styles.mline}
                        style={{
                          width: "60%",
                          background: "rgba(255,255,255,0.32)",
                        }}
                      />

                      <div
                        className={styles.mline}
                        style={{
                          width: "40%",
                          marginTop: 6,
                        }}
                      />
                    </div>

                    <span
                      className={styles.ftag}
                      style={{
                        margin: 0,
                        color: "#7BE0A5",
                        borderColor: "rgba(22,163,74,0.4)",
                        background: "rgba(22,163,74,0.14)",
                      }}
                    >
                      Loyal
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-3)",
                        fontWeight: 600,
                      }}
                    >
                      Retention Score
                    </span>

                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 900,
                        fontSize: 19,
                        color: "#fff",
                      }}
                    >
                      92
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--ink-3)",
                          fontWeight: 700,
                        }}
                      >
                        /100
                      </span>
                    </span>
                  </div>

                  <div
                    className={styles["loy-progress"]}
                    style={{ marginTop: 9 }}
                  >
                    <span
                      style={{
                        width: "92%",
                        background:
                          "linear-gradient(90deg,var(--cyan-2),var(--cyan))",
                      }}
                    />
                  </div>
                </div>
              </div>
            }
            iconClass={styles["ic-cyan"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M16 11l2 2 4-4" />
              </svg>
            }
            title="Customer Profiles & Retention AI"
            desc="A unified profile for every customer — orders, sentiment and channels in one place. AI flags churn risk before they go quiet, so you act early."
            tags={["Unified profiles", "Churn prediction"]}
          />
          <FeatureCard
            delay="1"
            viz={
              <div
                className={styles["viz-pad"]}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 11,
                }}
              >
                <div
                  className={styles.mini}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 10,
                    borderColor: "rgba(248,182,56,0.35)",
                  }}
                >
                  <span
                    className={styles.mbadge}
                    style={{
                      background: "var(--warm-logo-gradient)",
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3a2400"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "56%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: 9.5,
                      color: "var(--ink-4)",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    TRIGGER
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    paddingLeft: 20,
                  }}
                >
                  <div
                    className={styles.mini}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 9,
                      borderColor: "rgba(47,163,255,0.35)",
                      background: "rgba(47,163,255,0.1)",
                    }}
                  >
                    <span
                      className={styles.mdot}
                      style={{ background: "var(--cyan)" }}
                    />

                    <div className={styles.mline} style={{ width: "62%" }} />
                  </div>

                  <div
                    className={styles.mini}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 9,
                    }}
                  >
                    <span
                      className={styles.mdot}
                      style={{ background: "var(--warm-400)" }}
                    />

                    <div className={styles.mline} style={{ width: "52%" }} />
                  </div>
                </div>
              </div>
            }
            iconClass={styles["ic-violet"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 6a6 6 0 0 1-6 6 6 6 0 0 0-6 6" />
                <circle cx="18" cy="6" r="3" />
              </svg>
            }
            title="Smart Automations"
            desc="No-code journeys built from triggers, conditions and delays. Send the right message at the right moment — without lifting a finger."
            tags={["No-code builder", "Triggers", "Conditions"]}
          />
          <FeatureCard
            viz={
              <div className={styles.bars}>
                <div className={styles.b} style={{ height: "38%" }} />

                <div className={styles.b} style={{ height: "62%" }} />

                <div className={styles.b} style={{ height: "48%" }} />

                <div className={styles.b} style={{ height: "80%" }} />

                <div className={styles.b} style={{ height: "58%" }} />

                <div className={styles.b} style={{ height: "95%" }} />
              </div>
            }
            iconClass={styles["ic-violet"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11l18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            }
            title="Campaign Management"
            desc="Segment, schedule and broadcast personalized campaigns — then watch them convert in real time."
            tags={["Segments", "Broadcasts"]}
          />
          <FeatureCard
            delay="1"
            viz={
              <div
                className={styles["viz-pad"]}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className={styles.mini}
                  style={{
                    width: "100%",
                    padding: 16,
                    borderRadius: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      fontWeight: 600,
                    }}
                  >
                    Net Promoter Score
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 900,
                        fontSize: 32,
                        color: "#fff",
                      }}
                    >
                      72
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--success)",
                        fontWeight: 700,
                      }}
                    >
                      ▲ 8 pts
                    </span>
                  </div>

                  <div
                    className={styles["loy-progress"]}
                    style={{ marginTop: 10 }}
                  >
                    <span
                      style={{
                        width: "72%",
                        background:
                          "linear-gradient(90deg,var(--cyan-2),var(--cyan))",
                      }}
                    />
                  </div>
                </div>
              </div>
            }
            iconClass={styles["ic-cyan"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-3-3-4 4" />
              </svg>
            }
            title="Feedback & Analytics"
            desc="One-tap surveys after every order. Turn raw sentiment into NPS, CSAT and trends you can act on."
            tags={["NPS / CSAT", "Live dashboards"]}
          />
          <FeatureCard
            viz={
              <div
                className={styles["viz-pad"]}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    className={`${styles.ci} ${styles["ic-cyan"]}`}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 2l1.5 4L18 7.5 14 9l-2 4-2-4L6 7.5 10.5 6 12 2z" />
                    </svg>
                  </span>

                  <div
                    className={styles.mini}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "12px 12px 12px 3px",
                    }}
                  >
                    <div className={styles.mline} style={{ width: 90 }} />

                    <div
                      className={styles.mline}
                      style={{
                        width: 64,
                        marginTop: 6,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "12px 12px 3px 12px",
                      background: "linear-gradient(135deg,#3D8BEE,#2360C8)",
                    }}
                  >
                    <div
                      className={styles.mline}
                      style={{
                        width: 70,
                        background: "rgba(255,255,255,0.6)",
                      }}
                    />
                  </div>
                </div>
              </div>
            }
            iconClass={styles["ic-cyan"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="8" width="18" height="12" rx="3" />
                <path d="M12 8V4M8 2h8M9 13h.01M15 13h.01" />
              </svg>
            }
            title="AI Chatbots"
            desc="AI agents that answer FAQs, recover issues and book orders 24/7 — handing off to humans only when it matters."
            tags={["24/7 replies", "Human handoff"]}
          />
          <FeatureCard
            delay="1"
            viz={
              <div className={styles.intg}>
                <div className={styles.ihub}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1.8l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 16.84 6.09 19.96l1.13-6.57L2.45 8.74l6.6-.96L12 1.8z" />
                  </svg>
                </div>

                <div
                  className={styles.inode}
                  style={{
                    top: "18%",
                    left: "16%",
                  }}
                >
                  S
                </div>

                <div
                  className={styles.inode}
                  style={{
                    top: "14%",
                    right: "18%",
                  }}
                >
                  W
                </div>

                <div
                  className={styles.inode}
                  style={{
                    bottom: "18%",
                    left: "14%",
                  }}
                >
                  H
                </div>

                <div
                  className={styles.inode}
                  style={{
                    bottom: "16%",
                    right: "16%",
                  }}
                >
                  Z
                </div>
              </div>
            }
            iconClass={styles["ic-blue"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            }
            title="Integration with CRMs"
            desc="Connect Shopify, WooCommerce, HubSpot, Zoho and 30+ tools. Sync customer data both ways in minutes."
            tags={["Shopify", "HubSpot", "Webhooks"]}
          />
          <FeatureCard
            delay="2"
            viz={
              <div className={styles.phones}>
                <div
                  className={styles["mini-phone"]}
                  style={{
                    transform: "rotate(-7deg) translateY(6px)",
                  }}
                >
                  <div className={styles.scr} />
                </div>

                <div
                  className={styles["mini-phone"]}
                  style={{
                    transform: "rotate(7deg) translateY(6px)",
                  }}
                >
                  <div className={styles.scr} />
                </div>
              </div>
            }
            iconClass={styles["ic-blue"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <path d="M12 18h.01" />
              </svg>
            }
            title="iPhone & Android Apps"
            desc="Run your entire engagement workflow from your pocket. Native apps for iOS and Android keep your team replying, broadcasting and tracking — wherever they are."
            tags={["iOS", "Android", "Push alerts", "Offline-ready"]}
          />
          <FeatureCard
            delay="2"
            viz={
              <div
                className={styles["viz-pad"]}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  justifyContent: "center",
                }}
              >
                <div className={styles.mrow}>
                  <span
                    className={styles.mavatar}
                    style={{
                      background: "linear-gradient(135deg,#3D8BEE,#2360C8)",
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "50%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>

                  <span className={styles.ftag} style={{ margin: 0 }}>
                    Admin
                  </span>
                </div>

                <div className={styles.mrow}>
                  <span
                    className={styles.mavatar}
                    style={{
                      background: "linear-gradient(135deg,#4FC3FF,#2FA3FF)",
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "62%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>

                  <span className={styles.ftag} style={{ margin: 0 }}>
                    Agent
                  </span>
                </div>

                <div className={styles.mrow}>
                  <span
                    className={styles.mavatar}
                    style={{
                      background: "var(--warm-logo-gradient)",
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      className={styles.mline}
                      style={{
                        width: "44%",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />
                  </div>

                  <span className={styles.ftag} style={{ margin: 0 }}>
                    Manager
                  </span>
                </div>
              </div>
            }
            iconClass={styles["ic-cyan"]}
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Teams & Roles"
            desc="Granular permissions for every seat. Assign chats, set roles, and keep your whole team in sync."
            tags={["Permissions", "Assignment"]}
          />
        </div>
      </div>
    </section>
  );
}
