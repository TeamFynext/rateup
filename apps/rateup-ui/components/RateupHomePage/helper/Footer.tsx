import Link from "next/link";

// Social icon SVGs matching the design (YouTube, Instagram, Facebook, Threads, X, Pinterest)
const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const ThreadsIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.566-1.301-1.682-2.219-3.279-2.651-.438 3.071-1.776 4.896-3.98 5.448-.76.19-1.629.278-2.638.2-1.33-.1-2.481-.612-3.237-1.442-.813-.89-1.156-2.059-1.006-3.3.297-2.457 2.27-3.813 5.354-3.713.875.027 1.718.112 2.498.258-.168-.976-.531-1.719-1.106-2.268-.637-.607-1.607-.922-2.833-.922h-.046c-1.17.013-2.076.42-2.67 1.202-.527.702-.764 1.728-.703 3.044v.063c-.037 1.166.248 2.049.855 2.62.554.523 1.38.797 2.524.765l.063.001c.77-.01 1.364-.148 1.83-.42.627-.368 1.015-.978 1.195-1.878-.42-.032-.844-.051-1.266-.056-2.282-.03-3.516.788-3.664 1.997-.064.524.06 1.142.573 1.698.468.507 1.193.8 2.038.854.75.048 1.367-.011 1.891-.17z" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const columns = [
  {
    heading: "Product",
    links: [
      "Omnichannel Team Inbox",
      "Smart AI Automation",
      "AI Chatbot",
      "AI Workflow",
      "AI Analytics & Insights",
      "Loyaity & Referrals",
    ],
    showMore: true,
  },
  {
    heading: "Solutions",
    links: [
      "Marketing & Sales",
      "Customer Support",
      "Healthcare",
      "eLearning",
      "E-Commerce",
      "Finance",
      "Hospitality",
    ],
  },
  {
    heading: "Integrations",
    links: ["Salesforce", "HubSpot", "Zapier", "Zapier", "Zapier", "Zapier"],
    showMore: true,
  },
  {
    heading: "Comparison",
    links: [
      "RateUp vs Trengo",
      "RateUp vs Gallabox",
      "RateUp vs CleverTap",
      "RateUp vs CleverTap",
      "RateUp vs CleverTap",
    ],
    showMore: true,
  },
  {
    heading: "Company",
    links: ["About Us", "Contact", "Careers", "Support Center"],
  },
  {
    heading: "Resources",
    links: ["Blog", "Newsroom", "Case Studies", "Help Center"],
  },
  {
    heading: "Pricing",
    links: ["Basic Plan", "Plus Plan", "Custom Plan"],
  },
];

const socialLinks = [
  { Icon: YoutubeIcon, href: "#", bg: "#FF0000" },
  {
    Icon: InstagramIcon,
    href: "#",
    bg: "radial-gradient(circle at 30% 110%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
  },
  { Icon: FacebookIcon, href: "#", bg: "#1877F2" },
  { Icon: ThreadsIcon, href: "#", bg: "#000" },
  { Icon: XIcon, href: "#", bg: "#000" },
  { Icon: PinterestIcon, href: "#", bg: "#E60023" },
];

const legalLinks = [
  "Privacy Policy",
  "Terms of Service",
  "Cookie Policy",
  "Cancellation Policy",
  "DPA / Security",
];

export function Footer() {
  return (
    <footer className="bg-[#FFFFFF] border-t border-white/10 pt-12 pb-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px]">
        {/* Nav columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-10 mb-12">
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-shade-of-blue-14 font-semibold text-sm mb-4">
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      href="#"
                      className="text-grey-color-7 hover:text-white text-[13px] leading-snug transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
                {col.showMore && (
                  <li>
                    <Link
                      href="#"
                      className="text-[#2D74E0] hover:text-white text-[13px] transition-colors"
                    >
                      Show More
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Middle row: Meta badge | App store badges | Social icons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-t border-white/10">
          {/* Meta Business Partner badge */}
          {/* Meta Business Partner badge with glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(45,116,224,0.4) 0%, transparent 70%)",
                filter: "blur(20px)",
                transform: "scale(1.4)",
              }}
            />
            <img
              src="/images/landing/customerLogos/metaveve.png"
              alt="Meta Business Partner"
              className="relative h-22 w-auto object-contain"
            />
          </div>
          {/* App Store badges */}
          <div className="flex items-center gap-4">
            {/* Google Play */}
            <a
              href="#"
              className="flex items-center gap-3 bg-black border border-white/20 rounded-xl px-4 py-2.5 hover:border-white/40 transition-colors"
            >
              <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                <path
                  d="M0.432 0.482C0.162 0.768 0 1.218 0 1.806V22.194C0 22.782 0.162 23.232 0.438 23.514L0.51 23.58L11.742 12.348V12.006L0.504 0.414L0.432 0.482Z"
                  fill="url(#gplay1)"
                />
                <path
                  d="M15.438 16.158L11.742 12.348V12.006L15.444 8.196L15.534 8.25L19.944 10.74C21.192 11.448 21.192 12.612 19.944 13.326L15.534 15.81L15.438 16.158Z"
                  fill="url(#gplay2)"
                />
                <path
                  d="M15.534 15.81L11.742 12L0.432 23.514C0.858 23.964 1.56 24.018 2.352 23.574L15.534 15.81Z"
                  fill="url(#gplay3)"
                />
                <path
                  d="M15.534 8.25L2.352 0.492C1.56 0.042 0.858 0.102 0.432 0.552L11.742 12.006L15.534 8.25Z"
                  fill="url(#gplay4)"
                />
                <defs>
                  <linearGradient
                    id="gplay1"
                    x1="10.758"
                    y1="1.512"
                    x2="-4.098"
                    y2="16.368"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#00A0FF" />
                    <stop offset="1" stopColor="#00A0FF" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient
                    id="gplay2"
                    x1="21.702"
                    y1="12"
                    x2="-0.198"
                    y2="12"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FFD900" />
                    <stop offset="1" stopColor="#FFD900" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient
                    id="gplay3"
                    x1="13.296"
                    y1="14.232"
                    x2="-4.788"
                    y2="32.31"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FF3A44" />
                    <stop offset="1" stopColor="#C31162" />
                  </linearGradient>
                  <linearGradient
                    id="gplay4"
                    x1="-2.502"
                    y1="-4.938"
                    x2="5.97"
                    y2="3.534"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#32A071" />
                    <stop offset="1" stopColor="#2DA771" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <div className="text-[10px] text-white/60 leading-none mb-0.5">
                  GET IT ON
                </div>
                <div className="text-white font-semibold text-[14px] leading-tight">
                  Google Play
                </div>
              </div>
            </a>

            {/* App Store */}
            <a
              href="#"
              className="flex items-center gap-3 bg-black border border-white/20 rounded-xl px-4 py-2.5 hover:border-white/40 transition-colors"
            >
              <svg width="22" height="26" viewBox="0 0 22 26" fill="white">
                <path d="M18.264 13.792c-.03-3.168 2.592-4.704 2.712-4.776-1.476-2.16-3.78-2.454-4.602-2.484-1.956-.198-3.822 1.158-4.818 1.158-.996 0-2.52-1.134-4.14-1.104-2.124.036-4.086 1.242-5.178 3.138-2.214 3.846-.564 9.546 1.59 12.666 1.056 1.53 2.31 3.246 3.96 3.186 1.59-.066 2.196-.99 4.122-.99 1.926 0 2.478.99 4.158.954 1.716-.03 2.802-1.554 3.852-3.09 1.212-1.776 1.716-3.492 1.746-3.582-.036-.018-3.384-1.302-3.402-5.076zM15.12 4.374c.876-1.056 1.464-2.526 1.302-3.996-1.26.054-2.784.84-3.684 1.896-.81.936-1.518 2.43-1.326 3.864 1.404.108 2.838-.714 3.708-1.764z" />
              </svg>
              <div>
                <div className="text-[10px] text-white/60 leading-none mb-0.5">
                  Download on the
                </div>
                <div className="text-white font-semibold text-[14px] leading-tight">
                  App Store
                </div>
              </div>
            </a>
          </div>

          {/* Social icons */}
          <div className="flex flex-col items-end gap-3">
            <span className="text-[#93C6F5] text-sm font-medium">
              Follow us
            </span>
            <div className="flex items-center gap-2">
              {socialLinks.map(({ Icon, href, bg }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                  style={{ background: bg }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-5 border-t border-white/10">
          <p className="text-[#93C6F5]/70 text-sm">
            ©2025 RateUp. All rights reserved.
          </p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1">
            {legalLinks.map((l) => (
              <Link
                key={l}
                href="#"
                className="text-[#93C6F5]/70 hover:text-white text-sm transition-colors"
              >
                {l}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
