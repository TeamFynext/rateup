import { AutomationPlatform } from "@/types/platform";

export const DEMO_TEMPLATES = [
  {
    id: "tpl-001",
    name: "Welcome Complete Bot",
    description: "Full welcome flow with explore, FAQ, and contact options.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Welcome", "FAQ", "Basic"],
    nodeCount: "7",
    matchData: {
      json: {
        edges: [
          // Start → Welcome
          {
            id: "e1",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "startNode",
            target: "welcomeNode",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Welcome branching
          {
            id: "e2",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "welcomeNode",
            target: "exploreNode",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e3",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "welcomeNode",
            target: "faqNode",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e4",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "welcomeNode",
            target: "contactNode",
            sourceHandle: "button-3",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // FAQ branching
          {
            id: "e5",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "faqNode",
            target: "pricingNode",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e6",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "faqNode",
            target: "hoursNode",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Back to menu
          {
            id: "e7",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "pricingNode",
            target: "welcomeNode",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e8",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "hoursNode",
            target: "welcomeNode",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
        ],

        nodes: [
          // 1
          {
            id: "startNode",
            type: "startNode",
            position: { x: 100, y: 200 },
            data: {
              type: "startNode",
              label: "Start",
              startMessage: "",
            },
          },

          // 2
          {
            id: "welcomeNode",
            type: "buttonNode",
            position: { x: 350, y: 200 },
            data: {
              type: "buttonNode",
              label: "Reply Buttons",
              header: "Welcome 👋",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Hi! How can we help you today?",
                      },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Explore" },
                { id: "button-2", title: "FAQs" },
                { id: "button-3", title: "Contact" },
              ],
              platform: "whatsapp",
            },
          },

          // 3
          {
            id: "exploreNode",
            type: "textNode",
            position: { x: 650, y: 50 },
            data: {
              type: "textNode",
              label: "Text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Explore our services and features 🚀",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          // 4
          {
            id: "faqNode",
            type: "buttonNode",
            position: { x: 650, y: 200 },
            data: {
              type: "buttonNode",
              label: "FAQ",
              header: "FAQs ❓",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Choose a question:" }],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Pricing" },
                { id: "button-2", title: "Working Hours" },
              ],
              platform: "whatsapp",
            },
          },

          // 5
          {
            id: "contactNode",
            type: "textNode",
            position: { x: 650, y: 350 },
            data: {
              type: "textNode",
              label: "Text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Email: support@example.com\nPhone: +123456789",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          // 6
          {
            id: "pricingNode",
            type: "buttonNode",
            position: { x: 950, y: 100 },
            data: {
              type: "buttonNode",
              label: "Pricing",
              header: "Pricing 💰",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Plans start from $10/month." },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Back to Menu" }],
              platform: "whatsapp",
            },
          },

          // 7
          {
            id: "hoursNode",
            type: "buttonNode",
            position: { x: 950, y: 300 },
            data: {
              type: "buttonNode",
              label: "Hours",
              header: "Working Hours 🕒",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Mon–Sat: 9 AM – 6 PM" }],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Back to Menu" }],
              platform: "whatsapp",
            },
          },
        ],

        viewport: { x: 0, y: 0, zoom: 1 },
      },

      caseSensitive: false,
    },
  },
  {
    id: "tpl-002",
    name: "FAQ List Bot",
    description:
      "FAQ bot using list selection with detailed answers and navigation.",
    platform: AutomationPlatform.WHATSAPP,
    nodeCount: "6",
    tags: ["FAQ", "List", "Support"],
    matchData: {
      json: {
        edges: [
          {
            id: "e1",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "startNode-2",
            target: "introNode-2",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e2",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "introNode-2",
            target: "faqListNode-2",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e3",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "faqListNode-2",
            target: "pricingNode-2",
            sourceHandle: "row-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e4",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "faqListNode-2",
            target: "refundNode-2",
            sourceHandle: "row-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e5",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "faqListNode-2",
            target: "hoursNode-2",
            sourceHandle: "row-3",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e6",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "pricingNode-2",
            target: "faqListNode-2",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e7",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "refundNode-2",
            target: "faqListNode-2",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e8",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "hoursNode-2",
            target: "faqListNode-2",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
        ],

        nodes: [
          {
            id: "startNode-2",
            type: "startNode",
            position: { x: 100, y: 200 },
            data: {
              type: "startNode",
              label: "Start",
              startMessage: "",
            },
          },
          {
            id: "introNode-2",
            type: "buttonNode",
            position: { x: 350, y: 200 },
            data: {
              type: "buttonNode",
              label: "Start FAQ",
              header: "Help Center 💬",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Welcome! Browse common questions below.",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "View FAQs" }],
              platform: "whatsapp",
            },
          },
          {
            id: "faqListNode-2",
            type: "listNode",
            position: { x: 650, y: 200 },
            data: {
              type: "listNode",
              label: "FAQ List",
              header: "FAQs 📚",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Select a question:" }],
                  },
                ],
              },
              sections: [
                {
                  title: "Common Questions",
                  rows: [
                    {
                      id: "row-1",
                      title: "Pricing",
                      description: "View plans",
                    },
                    {
                      id: "row-2",
                      title: "Refund Policy",
                      description: "Learn about refunds",
                    },
                    {
                      id: "row-3",
                      title: "Working Hours",
                      description: "Business hours",
                    },
                  ],
                },
              ],
              platform: "whatsapp",
            },
          },
          {
            id: "pricingNode-2",
            type: "buttonNode",
            position: { x: 950, y: 50 },
            data: {
              type: "buttonNode",
              label: "Pricing",
              header: "Pricing 💰",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Our plans start from $10/month." },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Back to FAQs" }],
              platform: "whatsapp",
            },
          },
          {
            id: "refundNode-2",
            type: "buttonNode",
            position: { x: 950, y: 200 },
            data: {
              type: "buttonNode",
              label: "Refund",
              header: "Refund Policy 🔁",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Refunds are available within 7 days.",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Back to FAQs" }],
              platform: "whatsapp",
            },
          },
          {
            id: "hoursNode-2",
            type: "buttonNode",
            position: { x: 950, y: 350 },
            data: {
              type: "buttonNode",
              label: "Hours",
              header: "Working Hours 🕒",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "We operate 9 AM – 6 PM, Mon–Sat.",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Back to FAQs" }],
              platform: "whatsapp",
            },
          },
        ],

        viewport: { x: 0, y: 0, zoom: 1 },
      },

      caseSensitive: false,
    },
  },
  {
    id: "tpl-003",
    name: "Feedback & Experience Bot",
    description:
      "Collects user feedback with rating, follow-up questions, and response handling.",
    platform: AutomationPlatform.WHATSAPP,
    nodeCount: "9",
    tags: ["Feedback", "Survey", "Engagement"],
    matchData: {
      json: {
        edges: [
          {
            id: "e1",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "startNode-3",
            target: "introNode-3",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          {
            id: "e2",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "introNode-3",
            target: "ratingNode-3",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Rating branches
          {
            id: "e3",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "ratingNode-3",
            target: "goodNode-3",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e4",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "ratingNode-3",
            target: "badNode-3",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Follow-ups
          {
            id: "e5",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "goodNode-3",
            target: "testimonialNode-3",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          {
            id: "e6",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "badNode-3",
            target: "issueNode-3",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Closure
          {
            id: "e7",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "testimonialNode-3",
            target: "thankyouNode-3",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          {
            id: "e8",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "issueNode-3",
            target: "supportNode-3",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
        ],

        nodes: [
          // 1
          {
            id: "startNode-3",
            type: "startNode",
            position: { x: 100, y: 200 },
            data: {
              type: "startNode",
              label: "Start",
              startMessage: "",
            },
          },

          // 2
          {
            id: "introNode-3",
            type: "buttonNode",
            position: { x: 350, y: 200 },
            data: {
              type: "buttonNode",
              label: "Feedback Start",
              header: "We Value Your Feedback 💬",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Would you like to share your experience?",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Give Feedback" }],
              platform: "whatsapp",
            },
          },

          // 3
          {
            id: "ratingNode-3",
            type: "buttonNode",
            position: { x: 650, y: 200 },
            data: {
              type: "buttonNode",
              label: "Rating",
              header: "Rate Us ⭐",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "How was your experience?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "😊 Good" },
                { id: "button-2", title: "😞 Bad" },
              ],
              platform: "whatsapp",
            },
          },

          // 4
          {
            id: "goodNode-3",
            type: "buttonNode",
            position: { x: 950, y: 100 },
            data: {
              type: "buttonNode",
              label: "Positive",
              header: "Awesome! 🎉",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Would you like to leave a short testimonial?",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Yes" }],
              platform: "whatsapp",
            },
          },

          // 5
          {
            id: "badNode-3",
            type: "buttonNode",
            position: { x: 950, y: 300 },
            data: {
              type: "buttonNode",
              label: "Negative",
              header: "We're Sorry 😔",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Would you like to tell us what went wrong?",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Report Issue" }],
              platform: "whatsapp",
            },
          },

          // 6
          {
            id: "testimonialNode-3",
            type: "textNode",
            position: { x: 1200, y: 100 },
            data: {
              type: "textNode",
              label: "Testimonial",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Thank you! Your feedback helps us grow 🚀",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          // 7
          {
            id: "issueNode-3",
            type: "textNode",
            position: { x: 1200, y: 300 },
            data: {
              type: "textNode",
              label: "Issue",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "We’ve noted your issue. Our team will review it.",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          // 8
          {
            id: "supportNode-3",
            type: "textNode",
            position: { x: 1450, y: 300 },
            data: {
              type: "textNode",
              label: "Support",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "A support agent will contact you shortly.",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          // 9
          {
            id: "thankyouNode-3",
            type: "textNode",
            position: { x: 1450, y: 100 },
            data: {
              type: "textNode",
              label: "Thank You",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Thanks again for your valuable feedback ❤️",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },
        ],

        viewport: { x: 0, y: 0, zoom: 1 },
      },

      caseSensitive: false,
    },
  },
  {
    id: "tpl-004",
    name: "Mini E-commerce Bot",
    description:
      "Browse products, view categories, check details, and place orders with support flow.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Ecommerce", "Shopping", "Advanced"],
    nodeCount: "12",
    matchData: {
      json: {
        edges: [
          // Start → Menu
          {
            id: "e1",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "startNode-4",
            target: "menuNode-4",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Menu branching
          {
            id: "e2",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "menuNode-4",
            target: "categoryListNode-4",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e3",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "menuNode-4",
            target: "offersNode-4",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e4",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "menuNode-4",
            target: "supportNode-4",
            sourceHandle: "button-3",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Category → Products
          {
            id: "e5",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "categoryListNode-4",
            target: "electronicsNode-4",
            sourceHandle: "row-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e6",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "categoryListNode-4",
            target: "fashionNode-4",
            sourceHandle: "row-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Electronics → Product Details
          {
            id: "e7",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "electronicsNode-4",
            target: "productNode-4",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Product → Buy / Back
          {
            id: "e8",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "productNode-4",
            target: "checkoutNode-4",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e9",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "productNode-4",
            target: "categoryListNode-4",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Checkout → Confirmation
          {
            id: "e10",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "checkoutNode-4",
            target: "confirmationNode-4",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Fashion → Info
          {
            id: "e11",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "fashionNode-4",
            target: "fashionInfoNode-4",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Back to menu
          {
            id: "e12",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "offersNode-4",
            target: "menuNode-4",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
        ],

        nodes: [
          {
            id: "startNode-4",
            type: "startNode",
            position: { x: 100, y: 250 },
            data: { type: "startNode", label: "Start", startMessage: "" },
          },

          {
            id: "menuNode-4",
            type: "buttonNode",
            position: { x: 350, y: 250 },
            data: {
              type: "buttonNode",
              label: "Main Menu",
              header: "Shop 🛒",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Welcome! What would you like to do?",
                      },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Browse Categories" },
                { id: "button-2", title: "View Offers" },
                { id: "button-3", title: "Support" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "categoryListNode-4",
            type: "listNode",
            position: { x: 650, y: 250 },
            data: {
              type: "listNode",
              label: "Categories",
              header: "Categories 📦",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Choose a category:" }],
                  },
                ],
              },
              sections: [
                {
                  title: "Shop Now",
                  rows: [
                    {
                      id: "row-1",
                      title: "Electronics",
                      description: "Phones, Gadgets",
                    },
                    {
                      id: "row-2",
                      title: "Fashion",
                      description: "Clothing & Style",
                    },
                  ],
                },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "electronicsNode-4",
            type: "buttonNode",
            position: { x: 950, y: 100 },
            data: {
              type: "buttonNode",
              label: "Electronics",
              header: "Electronics 🔌",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Top product: iPhone 15 - $999" },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "View Details" }],
              platform: "whatsapp",
            },
          },

          {
            id: "productNode-4",
            type: "buttonNode",
            position: { x: 1200, y: 100 },
            data: {
              type: "buttonNode",
              label: "Product",
              header: "iPhone 15 📱",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Latest Apple device with A17 chip.",
                      },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Buy Now" },
                { id: "button-2", title: "Back" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "checkoutNode-4",
            type: "textNode",
            position: { x: 1450, y: 100 },
            data: {
              type: "textNode",
              label: "Checkout",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Processing your order..." },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "confirmationNode-4",
            type: "textNode",
            position: { x: 1650, y: 100 },
            data: {
              type: "textNode",
              label: "Confirmation",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "🎉 Order placed successfully!" },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "fashionNode-4",
            type: "buttonNode",
            position: { x: 950, y: 350 },
            data: {
              type: "buttonNode",
              label: "Fashion",
              header: "Fashion 👗",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Trending outfits available." },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "View Items" }],
              platform: "whatsapp",
            },
          },

          {
            id: "fashionInfoNode-4",
            type: "textNode",
            position: { x: 1200, y: 350 },
            data: {
              type: "textNode",
              label: "Fashion Info",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "New arrivals dropping weekly!" },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "offersNode-4",
            type: "textNode",
            position: { x: 650, y: 50 },
            data: {
              type: "textNode",
              label: "Offers",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "🔥 20% OFF on all products today!",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "supportNode-4",
            type: "textNode",
            position: { x: 650, y: 450 },
            data: {
              type: "textNode",
              label: "Support",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Support will contact you shortly.",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },
        ],

        viewport: { x: 0, y: 0, zoom: 1 },
      },

      caseSensitive: false,
    },
  },

  {
    id: "tpl-006",
    name: "Appointment Booking Bot",
    description:
      "Allows users to select service, choose slot, and confirm or manage appointments.",
    platform: AutomationPlatform.WHATSAPP,
    nodeCount: "6",
    tags: ["Booking", "Appointments", "Advanced"],
    matchData: {
      json: {
        edges: [
          // Start → Welcome
          {
            id: "e1",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "startNode-6",
            target: "welcomeNode-6",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Welcome → Service List
          {
            id: "e2",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "welcomeNode-6",
            target: "serviceListNode-6",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Service → Date
          {
            id: "e3",
            type: "custom",
            source: "serviceListNode-6",
            target: "dateNode-6",
            sourceHandle: "row-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e4",
            type: "custom",
            source: "serviceListNode-6",
            target: "dateNode-6",
            sourceHandle: "row-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Date → Time
          {
            id: "e5",
            type: "custom",
            source: "dateNode-6",
            target: "timeNode-6",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e6",
            type: "custom",
            source: "dateNode-6",
            target: "timeNode-6",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Time → Confirmation
          {
            id: "e7",
            type: "custom",
            source: "timeNode-6",
            target: "confirmNode-6",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e8",
            type: "custom",
            source: "timeNode-6",
            target: "confirmNode-6",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Confirm → Success / Reschedule
          {
            id: "e9",
            type: "custom",
            source: "confirmNode-6",
            target: "successNode-6",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e10",
            type: "custom",
            source: "confirmNode-6",
            target: "dateNode-6",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // After success → manage
          {
            id: "e11",
            type: "custom",
            source: "successNode-6",
            target: "manageNode-6",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Manage options
          {
            id: "e12",
            type: "custom",
            source: "manageNode-6",
            target: "cancelNode-6",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e13",
            type: "custom",
            source: "manageNode-6",
            target: "dateNode-6",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
        ],

        nodes: [
          {
            id: "startNode-6",
            type: "startNode",
            position: { x: 100, y: 250 },
            data: { type: "startNode", label: "Start", startMessage: "" },
          },

          {
            id: "welcomeNode-6",
            type: "buttonNode",
            position: { x: 350, y: 250 },
            data: {
              type: "buttonNode",
              label: "Welcome",
              header: "Book Appointment 📅",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Would you like to book an appointment?",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Book Now" }],
              platform: "whatsapp",
            },
          },

          {
            id: "serviceListNode-6",
            type: "listNode",
            position: { x: 650, y: 250 },
            data: {
              type: "listNode",
              label: "Services",
              header: "Select Service 🧾",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Choose a service:" }],
                  },
                ],
              },
              sections: [
                {
                  title: "Available Services",
                  rows: [
                    {
                      id: "row-1",
                      title: "Consultation",
                      description: "General discussion",
                    },
                    {
                      id: "row-2",
                      title: "Demo Session",
                      description: "Product walkthrough",
                    },
                  ],
                },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "dateNode-6",
            type: "buttonNode",
            position: { x: 950, y: 250 },
            data: {
              type: "buttonNode",
              label: "Date",
              header: "Select Date 📅",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Pick a preferred date:" }],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Tomorrow" },
                { id: "button-2", title: "Next Week" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "timeNode-6",
            type: "buttonNode",
            position: { x: 1250, y: 250 },
            data: {
              type: "buttonNode",
              label: "Time",
              header: "Select Time ⏰",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Choose a time slot:" }],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "10:00 AM" },
                { id: "button-2", title: "4:00 PM" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "confirmNode-6",
            type: "buttonNode",
            position: { x: 1550, y: 250 },
            data: {
              type: "buttonNode",
              label: "Confirm",
              header: "Confirm Booking ✅",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Confirm your appointment?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Confirm" },
                { id: "button-2", title: "Change Slot" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "successNode-6",
            type: "textNode",
            position: { x: 1800, y: 200 },
            data: {
              type: "textNode",
              label: "Success",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "🎉 Appointment booked successfully!",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "manageNode-6",
            type: "buttonNode",
            position: { x: 2000, y: 250 },
            data: {
              type: "buttonNode",
              label: "Manage",
              header: "Manage Appointment ⚙️",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Need to modify your booking?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Cancel" },
                { id: "button-2", title: "Reschedule" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "cancelNode-6",
            type: "textNode",
            position: { x: 2250, y: 200 },
            data: {
              type: "textNode",
              label: "Cancel",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Your appointment has been cancelled.",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },
        ],

        viewport: { x: 0, y: 0, zoom: 1 },
      },

      caseSensitive: false,
    },
  },
  {
    id: "tpl-008",
    name: "Loan Eligibility Bot",
    description:
      "Checks user eligibility based on income, employment, and credit profile.",
    platform: AutomationPlatform.WHATSAPP,
    nodeCount: "6",
    tags: ["Finance", "Eligibility", "Advanced"],
    matchData: {
      json: {
        edges: [
          // Start → Intro
          {
            id: "e1",
            type: "custom",
            style: { stroke: "#6366f1", strokeWidth: 2 },
            source: "startNode-8",
            target: "introNode-8",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Intro → Employment
          {
            id: "e2",
            type: "custom",
            source: "introNode-8",
            target: "employmentNode-8",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Employment branching
          {
            id: "e3",
            type: "custom",
            source: "employmentNode-8",
            target: "incomeNode-8",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e4",
            type: "custom",
            source: "employmentNode-8",
            target: "selfIncomeNode-8",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Income → Credit
          {
            id: "e5",
            type: "custom",
            source: "incomeNode-8",
            target: "creditNode-8",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e6",
            type: "custom",
            source: "incomeNode-8",
            target: "lowIncomeNode-8",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Self-employed → credit
          {
            id: "e7",
            type: "custom",
            source: "selfIncomeNode-8",
            target: "creditNode-8",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Credit branching
          {
            id: "e8",
            type: "custom",
            source: "creditNode-8",
            target: "eligibleNode-8",
            sourceHandle: "button-1",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
          {
            id: "e9",
            type: "custom",
            source: "creditNode-8",
            target: "reviewNode-8",
            sourceHandle: "button-2",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Low income → reject
          {
            id: "e10",
            type: "custom",
            source: "lowIncomeNode-8",
            target: "rejectNode-8",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Eligible → next step
          {
            id: "e11",
            type: "custom",
            source: "eligibleNode-8",
            target: "applyNode-8",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },

          // Review → manual
          {
            id: "e12",
            type: "custom",
            source: "reviewNode-8",
            target: "manualNode-8",
            sourceHandle: "right",
            targetHandle: "left",
            markerEnd: { type: "arrowclosed", color: "#6366f1" },
          },
        ],

        nodes: [
          {
            id: "startNode-8",
            type: "startNode",
            position: { x: 100, y: 250 },
            data: { type: "startNode", label: "Start", startMessage: "" },
          },

          {
            id: "introNode-8",
            type: "buttonNode",
            position: { x: 350, y: 250 },
            data: {
              type: "buttonNode",
              label: "Intro",
              header: "Loan Eligibility 💰",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Check your loan eligibility in seconds!",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Check Now" }],
              platform: "whatsapp",
            },
          },

          {
            id: "employmentNode-8",
            type: "buttonNode",
            position: { x: 650, y: 250 },
            data: {
              type: "buttonNode",
              label: "Employment",
              header: "Employment Type 👔",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "What is your employment type?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Salaried" },
                { id: "button-2", title: "Self-Employed" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "incomeNode-8",
            type: "buttonNode",
            position: { x: 950, y: 100 },
            data: {
              type: "buttonNode",
              label: "Income",
              header: "Monthly Income 💵",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Select your income range:" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "Above ₹50K" },
                { id: "button-2", title: "Below ₹50K" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "selfIncomeNode-8",
            type: "buttonNode",
            position: { x: 950, y: 350 },
            data: {
              type: "buttonNode",
              label: "Self Income",
              header: "Business Income 📊",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Is your business income stable?" },
                    ],
                  },
                ],
              },
              buttons: [{ id: "button-1", title: "Yes" }],
              platform: "whatsapp",
            },
          },

          {
            id: "creditNode-8",
            type: "buttonNode",
            position: { x: 1250, y: 200 },
            data: {
              type: "buttonNode",
              label: "Credit",
              header: "Credit Score 📈",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "What is your credit score?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "button-1", title: "700+" },
                { id: "button-2", title: "Below 700" },
              ],
              platform: "whatsapp",
            },
          },

          {
            id: "eligibleNode-8",
            type: "textNode",
            position: { x: 1550, y: 100 },
            data: {
              type: "textNode",
              label: "Eligible",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "🎉 You are eligible for the loan!",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "applyNode-8",
            type: "textNode",
            position: { x: 1750, y: 100 },
            data: {
              type: "textNode",
              label: "Apply",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Proceed to application process." },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "reviewNode-8",
            type: "textNode",
            position: { x: 1550, y: 250 },
            data: {
              type: "textNode",
              label: "Review",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Your profile needs manual review.",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "manualNode-8",
            type: "textNode",
            position: { x: 1750, y: 250 },
            data: {
              type: "textNode",
              label: "Manual",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Our team will contact you shortly.",
                      },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "lowIncomeNode-8",
            type: "textNode",
            position: { x: 1250, y: 50 },
            data: {
              type: "textNode",
              label: "Low Income",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Income too low for eligibility." },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },

          {
            id: "rejectNode-8",
            type: "textNode",
            position: { x: 1500, y: 50 },
            data: {
              type: "textNode",
              label: "Reject",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "❌ Not eligible at this time." },
                    ],
                  },
                ],
              },
              platform: "whatsapp",
            },
          },
        ],

        viewport: { x: 0, y: 0, zoom: 1 },
      },

      caseSensitive: false,
    },
  },
];
