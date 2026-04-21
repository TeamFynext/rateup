"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDown, MessageCircle, Monitor } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function DropDownNavItems() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const items = [
    {
      icon: <MessageCircle className="w-6 h-6 text-rateup-graytext" />,
      title: "Whatsapp Loyalty",
      description: "Engage where your customers are most active",
      href: "/products/whatsapp-loyalty",
    },
    {
      icon: <Monitor className="w-6 h-6 text-rateup-graytext" />,
      title: "Web Survey",
      description: "Collect and analyze customer insights easily",
      href: "/products/whatsapp-survey",
    },
    // {
    //   icon: <ClipboardList className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Ticketing Menu",
    //   description: "Quick, delicious dining with our digital menus",
    //   href: "/products/ticketing",
    // },
    // {
    //   icon: <Box className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Product Packaging QR",
    //   description: "Turn packaging into a customer engagement hub",
    //   href: "/products/qr-studio",
    // },
    // {
    //   icon: <QrCode className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Testimonial Gateway",
    //   description: "One smart QR code, endless possibilities",
    //   href: "/products/testimonial-gateway",
    // },
    // {
    //   icon: <Bot className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Ai Automation",
    //   description: "Automation with AI, endless possibilities",
    //   href: "/products/ai-automation",
    // },
    // {
    //   icon: <Star className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Ai Review",
    //   description: "Review with AI, endless possibilities",
    //   href: "/products/ai-review",
    // },
    // {
    //   icon: <MessageCircleCodeIcon className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Unified Inbox",
    //   description: "Manage all customer conversations in one place",
    //   href: "/products/inbox",
    // },
    // {
    //   icon: <ScanLine className="w-6 h-6 text-[#1c518e]" />,
    //   title: "Smart QR",
    //   description: "They scan, you grow",
    //   href: "/products/qr",
    // },
  ];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        onClick={() => setOpen(!open)}
        className="px-4 py-2 text-rateup-graytext text-[16px] font-semibold cursor-pointer flex items-center gap-1 hover:text-gray-600 transition-colors duration-200"
      >
        Platform
        <div className="bg-[#F5F5F5] p-1 rounded-full">
          <ChevronDown
            className={`h-5 w-5 text-rateup-graytext transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </span>

      {/* {open && (
        <div className="absolute left-0 z-50 mt-3 w-[340px] max-h-[75vh] overflow-y-auto rounded-xl border border-[#3f5ba9] bg-white shadow-2xl p-4 space-y-4">
          {items.map((item, idx) => (
            <Link
              href={item.href}
              key={idx}
              className="flex items-start gap-4 hover:bg-[#f1f5ff] p-3 rounded-lg transition"
            >
              <div>{item.icon}</div>
              <div>
                <div className="font-semibold text-[#00397b]">{item.title}</div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )} */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute left-0 z-50 mt-3 w-[340px] max-h-[75vh] overflow-y-auto rounded-xl border border-rateup-graytext bg-white shadow-2xl p-4 space-y-4"
          >
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => router.push(item.href)}
                className="flex items-start gap-4 hover:bg-[#f1f5ff] p-3 rounded-lg transition w-full text-left bg-transparent border-none outline-none cursor-pointer"
                style={{ boxShadow: "none", appearance: "none" }}
                tabIndex={0}
              >
                <div>{item.icon}</div>
                <div>
                  <div className="font-semibold text-rateup-graytext">
                    {item.title}
                  </div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
