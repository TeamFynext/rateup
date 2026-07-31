// Static feature visualisations, extracted from `Features.tsx`.
//
// Each was an inline `viz={...}` prop on a FeatureCard. They reference no local state,
// so this is a verbatim lift.

import { RateupStar } from "@/components/integrations/logos";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

export function OmniChannelInboxViz() {
  return (
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

        <span className={styles.mdot} style={{ background: "var(--cyan)" }} />
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5.5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.6" cy="6.4" r="1.1" fill="#fff" stroke="none" />
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
  );
}

export function WhatsappLoyaltyViz() {
  return (
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
  );
}

export function CustomerProfilesRetentionAiViz() {
  return (
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

        <div className={styles["loy-progress"]} style={{ marginTop: 9 }}>
          <span
            style={{
              width: "92%",
              background: "linear-gradient(90deg,var(--cyan-2),var(--cyan))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function SmartAutomationsViz() {
  return (
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
          <span className={styles.mdot} style={{ background: "var(--cyan)" }} />

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
          <span className={styles.mdot} style={{ background: "var(--warm-400)" }} />

          <div className={styles.mline} style={{ width: "52%" }} />
        </div>
      </div>
    </div>
  );
}

export function CampaignManagementViz() {
  return (
    <div className={styles.bars}>
      <div className={styles.b} style={{ height: "38%" }} />

      <div className={styles.b} style={{ height: "62%" }} />

      <div className={styles.b} style={{ height: "48%" }} />

      <div className={styles.b} style={{ height: "80%" }} />

      <div className={styles.b} style={{ height: "58%" }} />

      <div className={styles.b} style={{ height: "95%" }} />
    </div>
  );
}

export function FeedbackAnalyticsViz() {
  return (
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

        <div className={styles["loy-progress"]} style={{ marginTop: 10 }}>
          <span
            style={{
              width: "72%",
              background: "linear-gradient(90deg,var(--cyan-2),var(--cyan))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function AiChatbotsViz() {
  return (
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
  );
}

export function IntegrationWithCrmsViz() {
  return (
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
  );
}

export function IphoneAndroidAppsViz() {
  return (
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
  );
}

export function TeamsRolesViz() {
  return (
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
  );
}
