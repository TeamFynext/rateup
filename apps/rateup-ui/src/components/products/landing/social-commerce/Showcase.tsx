import ShowcaseSheet from "../shared/ShowcaseSheet";
import ShopMock from "./shop-mock/ShopMock";

export default function Showcase() {
  return (
    <ShowcaseSheet
      eyebrow="Checkout in chat"
      icon={
        <>
          <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
          <circle cx="9" cy="19" r="1.3" />
          <circle cx="17" cy="19" r="1.3" />
        </>
      }
      title="From “do you have it?” to paid, in one chat."
      lead="Product cards, a cart, the address, loyalty points and a payment link — all on WhatsApp, with the order filling itself in on your side."
    >
      <ShopMock />
    </ShowcaseSheet>
  );
}
