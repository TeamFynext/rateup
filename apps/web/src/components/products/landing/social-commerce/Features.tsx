import { MockCard } from "@/components/RateupHomePage/shared/mockups/kit";

import AlsoList from "../shared/AlsoList";
import { BAND, SectionHead } from "../shared/section";
import {
  CatalogMini,
  CheckoutMini,
  CouponMini,
  PointsMini,
  RecoveryMini,
  StorefrontMini,
} from "./feature-mocks";

const ALSO = [
  "Instagram and Messenger “Buy now” product carousels",
  "Paid orders written back to your Shopify store",
  "Low-stock and sold-out filters on your products",
  "Review request once an order is delivered",
  "Refunds and returns handled from the order",
  "Click-to-WhatsApp ads credited on the orders they bring",
];

export default function Features() {
  return (
    <section id="features" className="border-y border-ru-n-100 bg-ru-n-50">
      <div className={BAND}>
        <SectionHead
          eyebrow="Inside the shop"
          icon={
            <>
              <path d="M4 9.5 5.5 4h13L20 9.5" />
              <path d="M4 9.5h16v10a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5v-10Z" />
              <path d="M9.5 20v-5.5h5V20" />
            </>
          }
          title="A shop that lives in your conversations."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MockCard
            className="min-w-0"
            icon={
              <>
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
              </>
            }
            title="One catalog, every channel"
            body="Products and variants with stock, published to the Meta catalog WhatsApp, Instagram and Facebook share. Already on Shopify or WooCommerce? Your products are mirrored in."
          >
            <CatalogMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
                <circle cx="9" cy="19" r="1.3" />
                <circle cx="17" cy="19" r="1.3" />
              </>
            }
            title="Checkout without leaving WhatsApp"
            body="A WhatsApp cart goes straight to checkout in the chat: an address form, delivery options, a coupon, loyalty points, then a payment link."
          >
            <CheckoutMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M4 9.5 5.5 4h13L20 9.5" />
                <path d="M4 9.5h16v10a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5v-10Z" />
              </>
            }
            title="A storefront for your bio link"
            body="A mobile shop page for your Instagram bio. It shares the hosted checkout Instagram and Messenger buyers use, and sold-out items take back-in-stock requests."
          >
            <StorefrontMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M3.5 8.5V5A1.5 1.5 0 0 1 5 3.5h3.5l12 12-5 5-12-12Z" />
                <circle cx="8" cy="8" r="1.4" />
              </>
            }
            title="Coupons that fit the moment"
            body="Percent or fixed off, free shipping, buy X get Y, first-order only or loyalty members only — applied at checkout in the chat or on the page."
          >
            <CouponMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <>
                <path d="M20 12a8 8 0 1 1-2.4-5.7" />
                <path d="M20 4v4.5h-4.5" />
              </>
            }
            title="Bring back the ones who wandered"
            body="Reminders for carts left behind and payment links not yet paid, and a message the moment a sold-out product is back."
          >
            <RecoveryMini />
          </MockCard>

          <MockCard
            className="min-w-0"
            icon={
              <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
            }
            title="Loyalty points at checkout"
            body="Members spend points for money off at checkout and earn points on what they pay — the same program as your RateUp loyalty."
          >
            <PointsMini />
          </MockCard>
        </div>

        <AlsoList items={ALSO} />
      </div>
    </section>
  );
}
