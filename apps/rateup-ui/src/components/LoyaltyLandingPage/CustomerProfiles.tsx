import { useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

import styles from "./loyalty.landing.module.css";

export default function CustomerProfiles() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "profiles" | "segments" | "campaigns" | "referrals" | "analytics"
  >("profiles");
  const segments = [
    {
      n: "VIP Champions",
      d: "Top 5% by lifetime spend",
      c: "#3D6CD4",
      count: "1,240",
      pct: 92,
    },
    {
      n: "Loyal Regulars",
      d: "Purchased 3+ times",
      c: "#1F8A5B",
      count: "3,580",
      pct: 74,
    },
    {
      n: "New Members",
      d: "Joined in last 30 days",
      c: "#F8951D",
      count: "2,110",
      pct: 58,
    },
    {
      n: "At Risk",
      d: "No activity in 60 days",
      c: "#E3506B",
      count: "640",
      pct: 34,
    },
    {
      n: "Win-Back",
      d: "Lapsed, high past value",
      c: "#7A5CE0",
      count: "430",
      pct: 22,
    },
  ];
  const referrals = [
    { n: "John Doe", p: 680, c: "#3b6fd4" },
    { n: "Liam Miller", p: 240, c: "#1f8a5b" },
    { n: "Olivia Evans", p: 300, c: "#c9577f" },
    { n: "Beckett Hayes", p: 880, c: "#5a4ec2" },
    { n: "Lyra Valentine", p: 6, c: "#d98a2b" },
    { id: 6, n: "Aria Mathew", p: 420, c: "#2b8fb0" },
    { id: 7, n: "Noah Bennett", p: 510, c: "#557a2f" },
  ];
  const bars = [
    { l: "Mon", h: 48 },
    { l: "Tue", h: 66 },
    { l: "Wed", h: 54 },
    { l: "Thu", h: 82 },
    { l: "Fri", h: 100 },
    { l: "Sat", h: 90 },
    { l: "Sun", h: 72 },
  ];
  const leaders = [
    { n: "Beckett Hayes", r: 18, pts: "8,800", c: "#5a4ec2" },
    { n: "Olivia Evans", r: 14, pts: "6,400", c: "#c9577f" },
    { n: "Aria Mathew", r: 11, pts: "5,100", c: "#2b8fb0" },
    { n: "Noah Bennett", r: 9, pts: "4,200", c: "#557a2f" },
    { n: "John Doe", r: 7, pts: "3,300", c: "#3b6fd4" },
  ];

  return (
    <section
      className={styles.profiles}
      id="profiles"
      data-screen-label="Customer Profiles"
    >
      <div className={styles.wrap}>
        <div className={styles.reveal}>
          <h2>
            How <span className={styles.b}>RateUp</span> Powers WhatsApp Loyalty
          </h2>
          <p className={styles.sub}>
            Turn every customer conversation into repeat purchases with
            automated rewards, loyalty points, tier upgrades, and personalized
            WhatsApp engagement.
          </p>
        </div>

        <div className={`${styles["profile-panel"]} ${styles.reveal}`}>
          <div className={styles["panel-tabs"]} id="panelTabs">
            <button
              className={`${styles.tab} ${activeTab === "profiles" ? styles.active : styles.icononly}`}
              onClick={() => setActiveTab("profiles")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className={styles.tabLabel}>Customer Profiles</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === "segments" ? styles.active : styles.icononly}`}
              onClick={() => setActiveTab("segments")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span className={styles.tabLabel}>Smart Segments</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === "campaigns" ? styles.active : styles.icononly}`}
              onClick={() => setActiveTab("campaigns")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11l18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
              <span className={styles.tabLabel}>Broadcast Campaigns</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === "referrals" ? styles.active : styles.icononly}`}
              onClick={() => setActiveTab("referrals")}
            >
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
              <span className={styles.tabLabel}>Referral Program</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === "analytics" ? styles.active : styles.icononly}`}
              onClick={() => setActiveTab("analytics")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span className={styles.tabLabel}>Loyalty Analytics</span>
            </button>
          </div>

          <div className={styles["panel-body"]} key={activeTab}>
            {activeTab === "profiles" && (
              <>
                <div className={styles["app-mock"]}>
                  <div className={styles.glow} />
                  <div className={styles.cols}>
                    <div className={styles.pcard}>
                      <div className={styles["pf-top"]}>
                        <div className={styles["pf-av"]}>AF</div>
                        <div className={styles["pf-name"]}>Alistair Finch</div>
                        <div className={styles["pf-code"]}>
                          Referral Code · ZkuDf123
                        </div>
                      </div>
                      <div className={styles["pf-info"]}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Customer Info
                      </div>
                      <div className={styles["pf-field"]}>
                        <div className={styles.l}>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Points
                        </div>
                        <div className={`${styles.v} ${styles.warm}`}>
                          4680 Points
                        </div>
                      </div>
                      <div className={styles["pf-field"]}>
                        <div className={styles.l}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                            <line x1="12" y1="18" x2="12" y2="18" />
                          </svg>
                          Phone
                        </div>
                        <div className={styles.v}>+91 7256989899</div>
                      </div>
                      <div className={styles["pf-field"]}>
                        <div className={styles.l}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <polyline points="22 6 12 13 2 6" />
                          </svg>
                          Email Id
                        </div>
                        <div className={styles.v}>af12@gmail.com</div>
                      </div>
                      <div className={styles["pf-field"]}>
                        <div className={styles.l}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Last activity
                        </div>
                        <div className={styles.v}>Jun 28, 2025</div>
                      </div>
                      <div
                        className={styles["pf-field"]}
                        style={{ border: "none" }}
                      >
                        <div className={styles.l}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
                          </svg>
                          Engagement Score
                        </div>
                        <div className={styles.v}>89%</div>
                      </div>
                    </div>

                    <div className={styles.rlist}>
                      <div className={styles.rh}>
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
                        </svg>
                        Referrals Summary
                      </div>
                      <div className={styles.sortrow}>
                        Name{" "}
                        <svg
                          viewBox="0 0 24 24"
                          width="12"
                          height="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </div>
                      <div id="referralList">
                        {referrals.map((r, idx) => {
                          const initials = r.n
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2);
                          return (
                            <div key={idx} className={styles.rrow}>
                              <div
                                className={styles.ra}
                                style={{ background: r.c }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className={styles.rn}>{r.n}</div>
                                <div className={styles.rp}>{r.p} Points</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles["profile-copy"]}>
                  <h3>
                    Real-Time
                    <br />
                    Customer Profiles
                  </h3>
                  <p>
                    Get a complete real-time view of every customer with
                    conversation history, order activity, loyalty points,
                    engagement timelines, support interactions, and behavioral
                    insights.
                  </p>
                  <div className={styles["tag-pills"]}>
                    <span className={styles.tp}>Real-Time</span>
                    <span className={styles.tp}>Customer Profiles</span>
                    <span className={styles.tp}>Purchase History</span>
                    <span className={styles.tp}>Engagement History</span>
                  </div>
                  <div className={styles["hero-cta"]}>
                    <button
                      className={`${styles.btn} ${styles["btn-primary"]}`}
                      onClick={() =>
                        navigate({
                          to: "/signup",
                        })
                      }
                    >
                      Get Started Now
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
                    <a
                      href="#how"
                      className={`${styles.btn} ${styles["btn-secondary"]}`}
                    >
                      Know More
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
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeTab === "segments" && (
              <>
                <div className={styles["app-mock"]}>
                  <div className={styles.glow} />
                  <div className={styles.mck}>
                    <div className={styles["mck-h"]}>
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
                      </svg>
                      Auto-Generated Segments
                    </div>
                    <p className={styles["mck-sub"]}>
                      Updated in real time as customers engage
                    </p>
                    {segments.map((s, idx) => (
                      <div key={idx} className={styles["mck-row"]}>
                        <span
                          className={styles["mck-dot"]}
                          style={{ background: s.c }}
                        />
                        <div style={{ flex: 1 }}>
                          <div className={styles.nm}>{s.n}</div>
                          <div className={styles.mt}>{s.d}</div>
                          <div className={styles["mck-bar"]}>
                            <i
                              style={{
                                width: `${s.pct}%`,
                                background: s.c,
                                display: "block",
                                height: "100%",
                                borderRadius: "4px",
                              }}
                            />
                          </div>
                        </div>
                        <div className={styles.rt}>
                          <div className={styles.big}>{s.count}</div>
                          <div className={styles.sm}>customers</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles["profile-copy"]}>
                  <h3>
                    Smart Customer
                    <br />
                    Segments
                  </h3>
                  <p>
                    Automatically group customers by spend, tier, activity and
                    behavior — then trigger the right WhatsApp reward to the
                    right audience, with zero manual lists.
                  </p>
                  <div className={styles["tag-pills"]}>
                    <span className={styles.tp}>Behavioral</span>
                    <span className={styles.tp}>Auto-Updating</span>
                    <span className={styles.tp}>Tier-Based</span>
                    <span className={styles.tp}>Spend Tiers</span>
                  </div>
                  <div className={styles["hero-cta"]}>
                    <button
                      className={`${styles.btn} ${styles["btn-primary"]}`}
                      onClick={() =>
                        navigate({
                          to: "/signup",
                        })
                      }
                    >
                      Get Started Now
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
                    <a
                      href="#how"
                      className={`${styles.btn} ${styles["btn-secondary"]}`}
                    >
                      Know More
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
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeTab === "campaigns" && (
              <>
                <div className={styles["app-mock"]}>
                  <div className={styles.glow} />
                  <div className={styles.mck}>
                    <div className={styles["mck-h"]}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 11l18-5v12L3 14v-3z" />
                        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                      </svg>
                      New WhatsApp Campaign
                    </div>
                    <p className={styles["mck-sub"]}>
                      Double Points Weekend · Silver &amp; Gold tiers
                    </p>
                    <div className={styles["mck-compose"]}>
                      <div className={styles["mck-wa"]}>
                        Hi {"{{name}}"} 🎉 This weekend earn{" "}
                        <span className={styles.pts}>2x points</span> on every
                        order. Tap below to shop &amp; redeem your rewards!
                      </div>
                      <div className={styles["mck-tags"]}>
                        <span className={styles["mck-pill"]}>⚡ Automated</span>
                        <span className={styles["mck-pill"]}>🎯 Targeted</span>
                        <span className={styles["mck-pill"]}>🕒 Scheduled</span>
                      </div>
                    </div>
                    <div className={styles["mck-deliver"]}>
                      <div className={styles.d}>
                        <div className={styles.n}>4,200</div>
                        <div className={styles.l}>Delivered</div>
                      </div>
                      <div className={styles.d}>
                        <div className={styles.n}>3,990</div>
                        <div className={styles.l}>Read (95%)</div>
                      </div>
                      <div className={styles.d}>
                        <div className={styles.n}>1,470</div>
                        <div className={styles.l}>Clicked</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles["profile-copy"]}>
                  <h3>
                    Broadcast
                    <br />
                    Campaigns
                  </h3>
                  <p>
                    Send personalized, on-brand WhatsApp campaigns to any
                    segment — double-point weekends, tier upgrades, win-back
                    offers — and watch them land with 90%+ open rates.
                  </p>
                  <div className={styles["tag-pills"]}>
                    <span className={styles.tp}>Personalized</span>
                    <span className={styles.tp}>Scheduled</span>
                    <span className={styles.tp}>High Open Rate</span>
                    <span className={styles.tp}>Click Tracking</span>
                  </div>
                  <div className={styles["hero-cta"]}>
                    <button
                      className={`${styles.btn} ${styles["btn-primary"]}`}
                      onClick={() =>
                        navigate({
                          to: "/signup",
                        })
                      }
                    >
                      Get Started Now
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
                    <a
                      href="#how"
                      className={`${styles.btn} ${styles["btn-secondary"]}`}
                    >
                      Know More
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
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeTab === "referrals" && (
              <>
                <div className={styles["app-mock"]}>
                  <div className={styles.glow} />
                  <div className={styles.mck}>
                    <div className={styles["mck-h"]}>
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
                      </svg>
                      Top Referrers This Month
                    </div>
                    <p className={styles["mck-sub"]}>
                      Customers earn 500 points per successful referral
                    </p>
                    {leaders.map((l, idx) => (
                      <div key={idx} className={styles["mck-row"]}>
                        <span
                          className={`${styles["mck-rank"]} ${idx === 0 ? styles.top : ""}`}
                        >
                          {idx + 1}
                        </span>
                        <span
                          className={styles["mck-av"]}
                          style={{ background: l.c }}
                        >
                          {l.n
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div className={styles.nm}>{l.n}</div>
                          <div className={styles.mt}>
                            {l.r} friends referred
                          </div>
                        </div>
                        <div className={styles.rt}>
                          <div className={`${styles.big} ${styles.warm}`}>
                            {l.pts}
                          </div>
                          <div className={styles.sm}>points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles["profile-copy"]}>
                  <h3>
                    Referral
                    <br />
                    Program
                  </h3>
                  <p>
                    Turn loyal customers into your best growth channel. Every
                    referral is tracked automatically, both sides get rewarded
                    in WhatsApp, and your leaderboard keeps them coming back.
                  </p>
                  <div className={styles["tag-pills"]}>
                    <span className={styles.tp}>Auto-Tracked</span>
                    <span className={styles.tp}>Two-Sided Rewards</span>
                    <span className={styles.tp}>Leaderboard</span>
                    <span className={styles.tp}>Viral Growth</span>
                  </div>
                  <div className={styles["hero-cta"]}>
                    <button
                      className={`${styles.btn} ${styles["btn-primary"]}`}
                      onClick={() =>
                        navigate({
                          to: "/signup",
                        })
                      }
                    >
                      Get Started Now
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
                    <a
                      href="#how"
                      className={`${styles.btn} ${styles["btn-secondary"]}`}
                    >
                      Know More
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
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeTab === "analytics" && (
              <>
                <div className={styles["app-mock"]}>
                  <div className={styles.glow} />
                  <div className={styles.mck}>
                    <div className={styles["mck-h"]}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      Loyalty Performance
                    </div>
                    <p className={styles["mck-sub"]}>
                      Last 7 days · points issued &amp; redeemed
                    </p>
                    <div className={styles["mck-tiles"]}>
                      <div className={styles["mck-tile"]}>
                        <div className={styles.tn}>182K</div>
                        <div className={styles.tl}>Points Issued</div>
                      </div>
                      <div className={styles["mck-tile"]}>
                        <div className={styles.tn}>68%</div>
                        <div className={styles.tl}>Redemption Rate</div>
                      </div>
                      <div className={styles["mck-tile"]}>
                        <div className={styles.tn}>+45%</div>
                        <div className={styles.tl}>Retention Lift</div>
                      </div>
                    </div>
                    <div className={styles["mck-chart"]}>
                      {bars.map((b, idx) => (
                        <div key={idx} className={styles.cb}>
                          <i
                            style={{
                              height: `${b.h}%`,
                              width: "100%",
                              borderRadius: "6px 6px 0 0",
                              display: "block",
                              background:
                                "linear-gradient(180deg, var(--loyalty-blue-2), var(--loyalty-blue))",
                            }}
                          />
                          <span>{b.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles["profile-copy"]}>
                  <h3>
                    Loyalty
                    <br />
                    Analytics
                  </h3>
                  <p>
                    See exactly how your program performs — points issued,
                    redemption rates, retention lift and revenue impact — all in
                    one real-time dashboard you can act on instantly.
                  </p>
                  <div className={styles["tag-pills"]}>
                    <span className={styles.tp}>Real-Time</span>
                    <span className={styles.tp}>Redemption Rate</span>
                    <span className={styles.tp}>Retention Lift</span>
                    <span className={styles.tp}>Revenue Impact</span>
                  </div>
                  <div className={styles["hero-cta"]}>
                    <button
                      className={`${styles.btn} ${styles["btn-primary"]}`}
                      onClick={() =>
                        navigate({
                          to: "/signup",
                        })
                      }
                    >
                      Get Started Now
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
                    <a
                      href="#how"
                      className={`${styles.btn} ${styles["btn-secondary"]}`}
                    >
                      Know More
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
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
