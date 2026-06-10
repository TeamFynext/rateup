import { Link } from "@tanstack/react-router";

import { RateupStar } from "@/components/integrations/logos";

import style from "./feedback.module.css";

export default function Footer() {
  return (
    //     <footer className="border-t mt-16 pt-[52px] pb-7" style={{ background: '#04101F', borderColor: 'rgba(255,255,255,0.09)' }}>

    //   <div className="max-w-[1200px] mx-auto px-8">
    //     <div className="flex justify-between gap-10 flex-wrap pb-9 border-b border-white/[0.08]">
    //       <div className="max-w-[300px]">
    //         <Link
    //           to="/"
    //           className="relative z-20 mr-4 flex items-center
    //                                         space-x-2 px-2 py-1 text-sm font-normal text-black"
    //         >
    //           <span className={style.brand}>
    //             <RateupStar className="h-8 w-8" />
    //             <span className={style.wm}>
    //               Rate
    //               <span className={style.up}>Up</span>
    //             </span>
    //           </span>
    //         </Link>
    //         <p className="text-sm leading-[1.55]">
    //           Reimagine Customer Engagement — Unified. Automated. Intelligent.
    //           Feedback that runs entirely on WhatsApp.
    //         </p>
    //       </div>
    //       <div className="flex gap-14 flex-wrap">
    //         <div>
    //           <h5 className="text-white text-sm font-bold mb-4">Platform</h5>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             WhatsApp Feedback
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             WhatsApp Loyalty
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Omnichannel Inbox
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Automation
    //           </a>
    //         </div>
    //         <div>
    //           <h5 className="text-white text-sm font-bold mb-4">Resources</h5>
    //           <a
    //             href="#faq"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             FAQ
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Guides
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Blog
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Help Center
    //           </a>
    //         </div>
    //         <div>
    //           <h5 className="text-white text-sm font-bold mb-4">Company</h5>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             About Us
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Pricing
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Contact
    //           </a>
    //           <a
    //             href="#"
    //             className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
    //           >
    //             Careers
    //           </a>
    //         </div>
    //       </div>
    //     </div>
    //     <div className="flex justify-between items-center gap-4 pt-7 text-[13px] flex-wrap">
    //       <span>© 2026 RateUp · All rights reserved</span>
    //       <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/40">
    //         <svg
    //           className="w-3.5 h-3.5 text-wa-green"
    //           viewBox="0 0 24 24"
    //           fill="currentColor"
    //         >
    //           <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2z" />
    //         </svg>
    //         Powered by WhatsApp Business API · www.rateup.app
    //       </span>
    //     </div>
    //   </div>
    // </footer>
    <div className="bg-black text-white/55 py-14 pb-9">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="flex justify-between gap-10 flex-wrap pb-9 border-b border-white/[0.08]">
          <div className="max-w-[300px]">
            <div className="flex items-center gap-2.5 mb-3.5">
              <Link
                to="/"
                className="relative z-20 mr-4 flex items-center
                                  space-x-2 px-2 py-1 text-sm font-normal text-black"
              >
                <span className={style.brand}>
                  <RateupStar className="h-8 w-8" />
                  <span className={style.cm}>
                    Rate
                    <span className={style.uc}>Up</span>
                  </span>
                </span>
              </Link>
            </div>
            <p className="text-sm leading-[1.55]">
              Reimagine Customer Engagement — Unified. Automated. Intelligent.
              Feedback that runs entirely on WhatsApp.
            </p>
          </div>
          <div className="flex gap-14 flex-wrap">
            <div>
              <h5 className="text-white text-sm font-bold mb-4">Platform</h5>
              <a
                href="/products/whatsapp-feedback"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                WhatsApp Feedback
              </a>
              <a
                href="/products/whatsapp-loyalty"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                WhatsApp Loyalty
              </a>
              <a
                href="/products/omnichannel-inbox"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Omnichannel Inbox
              </a>
              <a
                href="#"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Automation
              </a>
            </div>
            <div>
              <h5 className="text-white text-sm font-bold mb-4">Resources</h5>
              <a
                href="#faq"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                FAQ
              </a>
              <a
                href="#"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Guides
              </a>
              <a
                href="/blog"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Blog
              </a>
              <a
                href="https://docs.rateup.app"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Help Center
              </a>
            </div>
            <div>
              <h5 className="text-white text-sm font-bold mb-4">Company</h5>
              <a
                href="/about-us"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                About Us
              </a>
              <a
                href="/pricing"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Pricing
              </a>
              <a
                href="/contact-us"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Contact
              </a>
              <a
                href="#"
                className="block text-white/55 text-sm mb-2.5 no-underline hover:text-wa-green transition-colors"
              >
                Careers
              </a>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center gap-4 pt-7 text-[13px] flex-wrap">
          <span>© 2026 RateUp · All rights reserved</span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/40">
            <svg
              className="w-3.5 h-3.5 text-wa-green"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2z" />
            </svg>
            Powered by WhatsApp Business API · www.rateup.app
          </span>
        </div>
      </div>
    </div>
  );
}
