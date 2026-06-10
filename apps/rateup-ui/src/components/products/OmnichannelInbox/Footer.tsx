import { Link } from "@tanstack/react-router";

import { RateupStar } from "@/components/integrations/logos";

import style from "./omnichannel.module.css";

export default function Footer() {
  return (
    <footer
      className="border-t mt-16 pt-[52px] pb-7"
      style={{ background: "#04101F", borderColor: "rgba(255,255,255,0.09)" }}
    >
      <div className="max-w-[1200px] mx-auto px-7">
        <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="relative z-20 mr-4 flex items-center
                                  space-x-2 px-2 py-1 text-sm font-normal text-black"
            >
              <span className={style.brand}>
                <RateupStar className="h-8 w-8" />
                <span className={style.wm}>
                  Rate
                  <span className={style.up}>Up</span>
                </span>
              </span>
            </Link>
            <p className="text-[13.5px] leading-[1.6] text-white/50 m-0 max-w-[270px]">
              RateUp Inbox — Conversations that convert, relationships that
              last. Part of the RateUp customer engagement platform.
            </p>
            <div className="flex gap-2.5 mt-[18px]">
              {[
                {
                  url: "https://x.com/rateup_app",
                  icon: (
                    <svg
                      key="x"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.9 2H22l-7.5 8.6L23 22h-6.6l-5.2-6.8L5.2 22H2l8-9.2L1.5 2h6.8l4.7 6.2L18.9 2zm-2.3 18h1.8L7.5 3.8H5.6L16.6 20z" />
                    </svg>
                  ),
                },
                {
                  url: "https://www.linkedin.com/company/rateup",
                  icon: (
                    <svg
                      key="li"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM0 8h5v16H0V8zm7.5 0H12v2.2h.07c.63-1.2 2.17-2.46 4.46-2.46C21.4 7.74 24 10.2 24 15v9h-5v-8c0-1.9-.03-4.36-2.66-4.36-2.66 0-3.07 2.08-3.07 4.22V24h-5V8z" />
                    </svg>
                  ),
                },
                {
                  url: "https://www.instagram.com/rateupsoftware/",
                  icon: (
                    <svg
                      key="ig"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle
                        cx="17.5"
                        cy="6.5"
                        r="1"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                  ),
                },
              ].map(({ url, icon }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-white/75 no-underline transition-all duration-200 hover:text-white"
                  style={{
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {[
            {
              title: "Product",
              links: [
                ["Unified Inbox", "#features"],
                ["Teams & Roles", "#features"],
                ["Automations", "#features"],
                ["Mobile Apps", "#features"],
                ["Compare", "#compare"],
              ],
            },
            {
              title: "Company",
              links: [
                ["About RateUp", "/about-us"],
                ["Customers", "#"],
                ["Pricing", "/pricing"],
                ["Careers", "#"],
                ["Contact", "/contact-us"],
              ],
            },
            {
              title: "Resources",
              links: [
                ["Help Center", "https://docs.rateup.app"],
                ["Blog", "/blog"],
                ["WhatsApp API", "#"],
                ["Integrations", "#"],
                ["Status", "#"],
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h5 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 mt-0 mb-3.5">
                {title}
              </h5>
              {links.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="block text-[13.5px] text-white/75 no-underline mb-2.5 transition-colors duration-200 hover:text-white"
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div
          className="flex justify-between items-center mt-12 pt-5 text-[12.5px] text-white/50 flex-wrap gap-3.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
        >
          <div>© 2026 RateUp · www.rateup.app</div>
          <div>
            Reimagine Customer Engagement — Unified. Automated. Intelligent.
          </div>
        </div>
      </div>
    </footer>
  );
}
