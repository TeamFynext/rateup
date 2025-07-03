"use client";

import { useState } from "react";
import Link from "next/link";

const items = [
  {
    title: "Whatsapp Loyalty",
    href: "https://products.rateup.app/products/whatsapp-loyalty",
  },
  {
    title: "Web Survey",
    href: "https://products.rateup.app/products/whatsapp-survey",
  },
  {
    title: "Ticketing Menu",
    href: "https://products.rateup.app/products/ticketing",
  },
  {
    title: "Product Packaging QR",
    href: "https://products.rateup.app/products/qr-studio",
  },
  {
    title: "Testimonial Gateway",
    href: "https://products.rateup.app/products/testimonial-gateway",
  },
  {
    title: "Ai Review",
    href: "https://products.rateup.app/products/ai-review",
  },
  {
    title: "Ai Automation",
    href: "https://products.rateup.app/products/ai-automation",
  },
  {
    title: "Unified Inbox",
    href: "https://products.rateup.app/products/ai-automation",
  },
];

export default function DropDownMobileNavItems() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-3  text-[#1c518e] text-lg flex items-center justify-between"
      >
        <span className=" font-semibold">Products</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className="px-4 pb-4 flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="block text-[#1c518e] hover:underline text-lg"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
