import { Link } from "@tanstack/react-router";

import Layout from "@/components/RateupHomePage/Layout.tsx";

import ToolsTabs from "./ToolsTabs.tsx";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

interface ToolsShellProps {
  /** Slug of the open tool; omit on the /tools index. */
  activeSlug?: string;
  title: string;
  description: string;
  /** Third hero pill, after "No signup" and "No email gate". */
  badge?: string;
  /** Breadcrumb trail after "Tools". */
  crumb?: { label: string };
  children: React.ReactNode;
}

/**
 * Page frame for `/tools` and everything under it: the navy tool switcher, the
 * hero, and the warm off-white canvas the cards sit on.
 */
export default function ToolsShell({
  activeSlug,
  title,
  description,
  badge,
  crumb,
  children,
}: Readonly<ToolsShellProps>) {
  return (
    <Layout
      contentClassName={`${styles.themeDefault} bg-background`}
      subheader={<ToolsTabs activeSlug={activeSlug} />}
    >
      <div className="bg-background font-sans text-foreground">
        {/* Hero */}
        <div className="mx-auto w-full max-w-[1240px] px-6 pt-10 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  to="/tools"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tools
                </Link>
              </li>
              {crumb ? (
                <>
                  <li aria-hidden>›</li>
                  <li className="font-semibold text-foreground">{crumb.label}</li>
                </>
              ) : null}
            </ol>
          </nav>

          <h1 className="max-w-[840px] font-display text-[34px] leading-[1.05] font-black tracking-[-0.025em] text-foreground sm:text-[42px] lg:text-[52px]">
            {title}
          </h1>
          <p className="mt-4 max-w-[700px] text-[16px] leading-[1.55] text-muted-foreground sm:text-[18px]">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="rounded-full bg-[#E7F9EE] px-2.5 py-1.5 text-[11.5px] font-bold tracking-[0.06em] text-[#128C4A] uppercase">
              No signup
            </span>
            <span className="rounded-full bg-accent px-2.5 py-1.5 text-[11.5px] font-bold tracking-[0.06em] text-primary uppercase">
              No email gate
            </span>
            {badge ? (
              <span className="rounded-full bg-accent px-2.5 py-1.5 text-[11.5px] font-bold tracking-[0.06em] text-primary uppercase">
                {badge}
              </span>
            ) : null}
          </div>
        </div>

        {children}
      </div>
    </Layout>
  );
}
