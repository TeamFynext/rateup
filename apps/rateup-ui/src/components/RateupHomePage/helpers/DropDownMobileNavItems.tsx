import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

const items = [
  {
    title: "Whatsapp Loyalty",
    href: "/products/whatsapp-loyalty",
  },
  {
    title: "Whatsapp Feedback",
    href: "/products/whatsapp-feedback",
  },
  {
    title: "Omnichannel Inbox",
    href: "/products/omnichannel-inbox",
  },
];

export default function DropDownMobileNavItems() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="w-full border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-3 text-primary text-lg flex items-center justify-between"
      >
        <span className="font-semibold">Products</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <ul className="px-4 pb-4 flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index}>
              <button
                onClick={() =>
                  navigate({
                    to: item.href,
                  })
                }
                className="block text-primary hover:underline text-lg"
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
