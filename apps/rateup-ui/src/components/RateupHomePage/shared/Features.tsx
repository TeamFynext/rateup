import { useEffect, type ReactNode } from "react";

import {
  OmniChannelInboxViz,
  WhatsappLoyaltyViz,
  CustomerProfilesRetentionAiViz,
  SmartAutomationsViz,
  CampaignManagementViz,
  FeedbackAnalyticsViz,
  AiChatbotsViz,
  IntegrationWithCrmsViz,
  IphoneAndroidAppsViz,
  TeamsRolesViz,
} from "./feature-visuals.tsx";

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

function FeatureCard({ viz, icon, iconClass, title, desc, tags, delay }: FeatureCardProps) {
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
            Everything You Need In <span className={styles["grad-cyan"]}>One Place</span>
          </h2>

          <p className={styles.reveal} data-d="2">
            Ten tools that used to live in ten tabs — unified into a single, automated engagement
            engine.
          </p>
        </div>

        <div className={styles["feat-grid"]}>
          {/* 1 */}
          <FeatureCard
            viz={<OmniChannelInboxViz />}
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
            viz={<WhatsappLoyaltyViz />}
            iconClass={styles["ic-warm"]}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1.8l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 16.84 6.09 19.96l1.13-6.57L2.45 8.74l6.6-.96L12 1.8z" />
              </svg>
            }
            title="WhatsApp Loyalty"
            desc="Points, tiers and rewards — all on WhatsApp. No apps, no forms, just one message."
            tags={["Points & tiers", "Referrals"]}
          />
          <FeatureCard
            viz={<CustomerProfilesRetentionAiViz />}
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
            viz={<SmartAutomationsViz />}
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
            viz={<CampaignManagementViz />}
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
            viz={<FeedbackAnalyticsViz />}
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
            viz={<AiChatbotsViz />}
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
            viz={<IntegrationWithCrmsViz />}
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
            viz={<IphoneAndroidAppsViz />}
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
            viz={<TeamsRolesViz />}
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
